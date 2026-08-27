import { Router } from 'express';
import crypto from 'node:crypto';
import { eq, and, or, desc, isNull, like } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { projects, projectTags, tags, categories, blocks } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { normalizeTagName } from './tags.js';
import { searchIndexManager } from './searchIndex.js';
export const projectsRouter = Router();
function safeISO(d) {
    if (!d)
        return new Date().toISOString();
    try {
        const date = d instanceof Date ? d : new Date(d);
        if (isNaN(date.getTime())) {
            const num = Number(d);
            if (!isNaN(num)) {
                const converted = new Date(num > 1e11 ? num / 10000 : num * 1000);
                if (!isNaN(converted.getTime()))
                    return converted.toISOString();
            }
            return new Date().toISOString();
        }
        return date.toISOString();
    }
    catch {
        return new Date().toISOString();
    }
}
function formatProject(p) {
    if (!p)
        return p;
    return {
        ...p,
        dueDate: p.dueDate ? safeISO(p.dueDate) : null,
        createdAt: safeISO(p.createdAt),
        updatedAt: safeISO(p.updatedAt),
        tags: p.projectTags ? p.projectTags.map((pt) => pt.tag) : [],
    };
}
const createProjectSchema = z.object({
    title: z.string().min(1, 'Project title is required').max(200, 'Title too long').trim(),
    description: z.string().optional().default(''),
    space: z.enum(['personal', 'shared']).optional().default('personal'),
    categoryId: z.string().nullable().optional(),
    status: z.enum(['draft', 'active', 'archived']).optional().default('active'),
    dueDate: z.number().nullable().optional(),
    canvasPanX: z.number().optional().default(0),
    canvasPanY: z.number().optional().default(0),
    canvasZoom: z.number().optional().default(1.0),
    tags: z.array(z.string()).optional().default([]),
    parentId: z.string().nullable().optional(),
});
const updateProjectSchema = z.object({
    title: z.string().min(1).max(200).trim().optional(),
    description: z.string().optional(),
    categoryId: z.string().nullable().optional(),
    status: z.enum(['draft', 'active', 'archived']).optional(),
    dueDate: z.number().nullable().optional(),
    canvasPanX: z.number().optional(),
    canvasPanY: z.number().optional(),
    canvasZoom: z.number().optional(),
    tags: z.array(z.string()).optional(),
    parentId: z.string().nullable().optional(),
});
const moveSpaceSchema = z.object({
    targetSpace: z.enum(['personal', 'shared']).optional(),
});
// GET /api/projects
projectsRouter.get('/', requireAuth, async (req, res, next) => {
    try {
        const currentUser = req.user;
        const spaceParam = req.query.space;
        const categoryIdParam = req.query.categoryId;
        const statusParam = req.query.status;
        const tagParam = req.query.tag;
        const parentIdParam = req.query.parentId;
        let spaceCondition;
        if (spaceParam === 'personal') {
            spaceCondition = and(eq(projects.space, 'personal'), eq(projects.ownerId, currentUser.id));
        }
        else if (spaceParam === 'shared') {
            spaceCondition = eq(projects.space, 'shared');
        }
        else {
            spaceCondition = or(and(eq(projects.space, 'personal'), eq(projects.ownerId, currentUser.id)), eq(projects.space, 'shared'));
        }
        const conditions = [spaceCondition];
        if (categoryIdParam) {
            conditions.push(eq(projects.categoryId, categoryIdParam));
        }
        if (statusParam && ['draft', 'active', 'archived'].includes(statusParam)) {
            conditions.push(eq(projects.status, statusParam));
        }
        if (parentIdParam === 'null') {
            conditions.push(isNull(projects.parentId));
        }
        else if (parentIdParam) {
            conditions.push(eq(projects.parentId, parentIdParam));
        }
        let projectList = await db.query.projects.findMany({
            where: and(...conditions),
            with: {
                owner: {
                    columns: { id: true, name: true, email: true },
                },
                category: true,
                projectTags: {
                    with: {
                        tag: true,
                    },
                },
            },
            orderBy: [desc(projects.updatedAt)],
        });
        if (tagParam && tagParam.trim()) {
            const normalizedTag = normalizeTagName(tagParam);
            projectList = projectList.filter((p) => p.projectTags.some((pt) => pt.tag.name === normalizedTag));
        }
        // Format response to include flattened tags
        const formatted = projectList.map(formatProject);
        return res.status(200).json({ projects: formatted });
    }
    catch (err) {
        next(err);
    }
});
// POST /api/projects
projectsRouter.post('/', requireAuth, async (req, res, next) => {
    try {
        const parseResult = createProjectSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({
                error: 'ValidationError',
                message: parseResult.error.errors[0]?.message || 'Input validation failed',
                details: parseResult.error.errors,
            });
        }
        const { title, description, space, categoryId, status, dueDate, canvasPanX, canvasPanY, canvasZoom, tags: tagNames, parentId, } = parseResult.data;
        const currentUser = req.user;
        const projectId = crypto.randomUUID();
        const visibility = space === 'shared' ? 'shared' : 'private';
        const now = new Date();
        // Verify category exists if specified
        if (categoryId) {
            const cat = await db.query.categories.findFirst({
                where: eq(categories.id, categoryId),
            });
            if (!cat) {
                return res.status(400).json({ error: 'ValidationError', message: 'Category does not exist' });
            }
        }
        const [newProject] = await db
            .insert(projects)
            .values({
            id: projectId,
            title,
            description: description || '',
            space,
            visibility,
            ownerId: currentUser.id,
            categoryId: categoryId || null,
            status,
            dueDate: dueDate ? new Date(dueDate) : null,
            canvasPanX,
            canvasPanY,
            canvasZoom,
            parentId: parentId || null,
            createdAt: now,
            updatedAt: now,
        })
            .returning();
        // If this project is created under a parent project, add a 'subproject' block to the parent canvas
        if (parentId) {
            try {
                const parentBlocks = await db.query.blocks.findMany({
                    where: eq(blocks.projectId, parentId),
                    columns: { order: true },
                });
                const order = parentBlocks.length > 0 ? Math.max(...parentBlocks.map((b) => b.order)) + 1 : 0;
                await db.insert(blocks).values({
                    id: crypto.randomUUID(),
                    projectId: parentId,
                    type: 'subproject',
                    content: JSON.stringify({ targetProjectId: newProject.id }),
                    order,
                    canvasX: 100 + (parentBlocks.length * 40) % 400,
                    canvasY: 100 + (parentBlocks.length * 40) % 400,
                    canvasW: 240,
                    canvasH: 100,
                    canvasZ: 0,
                    createdAt: now,
                    updatedAt: now,
                });
                await db.update(projects).set({ updatedAt: now }).where(eq(projects.id, parentId));
                await searchIndexManager.invalidateProject(parentId);
            }
            catch (err) {
                console.error('Failed to create subproject block on parent canvas:', err);
            }
        }
        // Handle tags
        const resolvedTags = [];
        if (tagNames && tagNames.length > 0) {
            for (const rawName of tagNames) {
                const normalized = normalizeTagName(rawName);
                if (!normalized)
                    continue;
                let tag = await db.query.tags.findFirst({
                    where: or(eq(tags.id, rawName), eq(tags.name, normalized)),
                });
                if (!tag) {
                    const [inserted] = await db
                        .insert(tags)
                        .values({
                        id: crypto.randomUUID(),
                        name: normalized,
                        createdAt: now,
                    })
                        .returning();
                    tag = inserted;
                }
                resolvedTags.push(tag);
                await db
                    .insert(projectTags)
                    .values({
                    projectId: newProject.id,
                    tagId: tag.id,
                })
                    .onConflictDoNothing();
            }
        }
        const fullProject = await db.query.projects.findFirst({
            where: eq(projects.id, newProject.id),
            with: {
                owner: {
                    columns: { id: true, name: true, email: true },
                },
                category: true,
                projectTags: {
                    with: { tag: true },
                },
            },
        });
        await searchIndexManager.invalidateProject(newProject.id);
        return res.status(201).json({
            project: formatProject(fullProject),
        });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/projects/:id
projectsRouter.get('/:id', requireAuth, async (req, res, next) => {
    try {
        const { id } = req.params;
        const currentUser = req.user;
        const project = await db.query.projects.findFirst({
            where: eq(projects.id, id),
            with: {
                owner: {
                    columns: { id: true, name: true, email: true },
                },
                category: true,
                projectTags: {
                    with: { tag: true },
                },
                blocks: {
                    orderBy: (blocks, { asc }) => [asc(blocks.order)],
                },
            },
        });
        if (!project) {
            return res.status(404).json({ error: 'NotFound', message: 'Project not found' });
        }
        // Strict IDOR protection for personal space
        if (project.space === 'personal' && project.ownerId !== currentUser.id) {
            return res.status(404).json({ error: 'NotFound', message: 'Project not found' });
        }
        return res.status(200).json({
            project: formatProject(project),
        });
    }
    catch (err) {
        next(err);
    }
});
// PATCH /api/projects/:id
projectsRouter.patch('/:id', requireAuth, async (req, res, next) => {
    try {
        const { id } = req.params;
        const currentUser = req.user;
        const parseResult = updateProjectSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({
                error: 'ValidationError',
                message: parseResult.error.errors[0]?.message || 'Input validation failed',
                details: parseResult.error.errors,
            });
        }
        const existing = await db.query.projects.findFirst({
            where: eq(projects.id, id),
        });
        if (!existing) {
            return res.status(404).json({ error: 'NotFound', message: 'Project not found' });
        }
        if (existing.space === 'personal' && existing.ownerId !== currentUser.id) {
            return res.status(404).json({ error: 'NotFound', message: 'Project not found' });
        }
        const updates = parseResult.data;
        const updateData = {
            updatedAt: new Date(),
        };
        if (updates.title !== undefined)
            updateData.title = updates.title;
        if (updates.description !== undefined)
            updateData.description = updates.description;
        if (updates.categoryId !== undefined) {
            if (updates.categoryId) {
                const cat = await db.query.categories.findFirst({
                    where: eq(categories.id, updates.categoryId),
                });
                if (!cat) {
                    return res.status(400).json({ error: 'ValidationError', message: 'Category does not exist' });
                }
            }
            updateData.categoryId = updates.categoryId;
        }
        if (updates.status !== undefined)
            updateData.status = updates.status;
        if (updates.dueDate !== undefined) {
            updateData.dueDate = updates.dueDate ? new Date(updates.dueDate) : null;
        }
        if (updates.canvasPanX !== undefined)
            updateData.canvasPanX = updates.canvasPanX;
        if (updates.canvasPanY !== undefined)
            updateData.canvasPanY = updates.canvasPanY;
        if (updates.canvasZoom !== undefined)
            updateData.canvasZoom = updates.canvasZoom;
        if (updates.parentId !== undefined) {
            if (updates.parentId && updates.parentId !== existing.parentId) {
                try {
                    const blockExists = await db.query.blocks.findFirst({
                        where: and(eq(blocks.projectId, updates.parentId), eq(blocks.type, 'subproject'), like(blocks.content, `%${id}%`)),
                    });
                    if (!blockExists) {
                        const parentBlocks = await db.query.blocks.findMany({
                            where: eq(blocks.projectId, updates.parentId),
                            columns: { order: true },
                        });
                        const order = parentBlocks.length > 0 ? Math.max(...parentBlocks.map((b) => b.order)) + 1 : 0;
                        await db.insert(blocks).values({
                            id: crypto.randomUUID(),
                            projectId: updates.parentId,
                            type: 'subproject',
                            content: JSON.stringify({ targetProjectId: id }),
                            order,
                            canvasX: 100,
                            canvasY: 100,
                            canvasW: 240,
                            canvasH: 100,
                            canvasZ: 0,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        });
                        await db.update(projects).set({ updatedAt: new Date() }).where(eq(projects.id, updates.parentId));
                        await searchIndexManager.invalidateProject(updates.parentId);
                    }
                }
                catch (err) {
                    console.error('Failed to create subproject block on new parent canvas:', err);
                }
            }
            if (existing.parentId && updates.parentId !== existing.parentId) {
                try {
                    await db.delete(blocks).where(and(eq(blocks.projectId, existing.parentId), eq(blocks.type, 'subproject'), like(blocks.content, `%${id}%`)));
                    await db.update(projects).set({ updatedAt: new Date() }).where(eq(projects.id, existing.parentId));
                    await searchIndexManager.invalidateProject(existing.parentId);
                }
                catch (err) {
                    console.error('Failed to delete subproject block from old parent canvas:', err);
                }
            }
            updateData.parentId = updates.parentId;
        }
        await db.update(projects).set(updateData).where(eq(projects.id, id));
        // Handle tag synchronization if provided
        if (updates.tags !== undefined) {
            await db.delete(projectTags).where(eq(projectTags.projectId, id));
            const now = new Date();
            for (const rawName of updates.tags) {
                const normalized = normalizeTagName(rawName);
                if (!normalized)
                    continue;
                let tag = await db.query.tags.findFirst({
                    where: or(eq(tags.id, rawName), eq(tags.name, normalized)),
                });
                if (!tag) {
                    const [inserted] = await db
                        .insert(tags)
                        .values({
                        id: crypto.randomUUID(),
                        name: normalized,
                        createdAt: now,
                    })
                        .returning();
                    tag = inserted;
                }
                await db
                    .insert(projectTags)
                    .values({
                    projectId: id,
                    tagId: tag.id,
                })
                    .onConflictDoNothing();
            }
        }
        const updated = await db.query.projects.findFirst({
            where: eq(projects.id, id),
            with: {
                owner: {
                    columns: { id: true, name: true, email: true },
                },
                category: true,
                projectTags: {
                    with: { tag: true },
                },
            },
        });
        await searchIndexManager.invalidateProject(id);
        return res.status(200).json({
            project: formatProject(updated),
        });
    }
    catch (err) {
        next(err);
    }
});
// DELETE /api/projects/:id
projectsRouter.delete('/:id', requireAuth, async (req, res, next) => {
    try {
        const { id } = req.params;
        const currentUser = req.user;
        const existing = await db.query.projects.findFirst({
            where: eq(projects.id, id),
        });
        if (!existing) {
            return res.status(404).json({ error: 'NotFound', message: 'Project not found' });
        }
        // Strict personal space isolation
        if (existing.space === 'personal' && existing.ownerId !== currentUser.id) {
            return res.status(404).json({ error: 'NotFound', message: 'Project not found' });
        }
        // Shared project delete restriction: only owner or admin
        if (existing.space === 'shared' && existing.ownerId !== currentUser.id && currentUser.role !== 'admin') {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Only the project owner or an admin can delete a shared project',
            });
        }
        // Delete any subproject blocks pointing to this project from other canvas boards
        try {
            await db.delete(blocks).where(and(eq(blocks.type, 'subproject'), like(blocks.content, `%${id}%`)));
        }
        catch (err) {
            console.error('Failed to clean up subproject blocks for deleted project:', err);
        }
        await db.delete(projects).where(eq(projects.id, id));
        searchIndexManager.removeProject(id);
        return res.status(200).json({ message: 'Project deleted successfully' });
    }
    catch (err) {
        next(err);
    }
});
// POST /api/projects/:id/move-space (Atomic Space Transfer)
projectsRouter.post('/:id/move-space', requireAuth, async (req, res, next) => {
    try {
        const { id } = req.params;
        const currentUser = req.user;
        const parseResult = moveSpaceSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({
                error: 'ValidationError',
                message: parseResult.error.errors[0]?.message || 'Input validation failed',
            });
        }
        const existing = await db.query.projects.findFirst({
            where: eq(projects.id, id),
        });
        if (!existing) {
            return res.status(404).json({ error: 'NotFound', message: 'Project not found' });
        }
        // Space isolation checks
        if (existing.space === 'personal' && existing.ownerId !== currentUser.id) {
            return res.status(404).json({ error: 'NotFound', message: 'Project not found' });
        }
        if (existing.space === 'shared' && existing.ownerId !== currentUser.id && currentUser.role !== 'admin') {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Only the project owner or an admin can move this project',
            });
        }
        const targetSpace = parseResult.data.targetSpace;
        const newSpace = targetSpace || (existing.space === 'personal' ? 'shared' : 'personal');
        const newVisibility = newSpace === 'shared' ? 'shared' : 'private';
        const [updated] = await db
            .update(projects)
            .set({
            space: newSpace,
            visibility: newVisibility,
            updatedAt: new Date(),
        })
            .where(eq(projects.id, id))
            .returning();
        const fullUpdated = await db.query.projects.findFirst({
            where: eq(projects.id, id),
            with: {
                owner: {
                    columns: { id: true, name: true, email: true },
                },
                category: true,
                projectTags: {
                    with: { tag: true },
                },
            },
        });
        await searchIndexManager.invalidateProject(id);
        return res.status(200).json({
            project: {
                ...fullUpdated,
                tags: fullUpdated?.projectTags.map((pt) => pt.tag) || [],
            },
            message: `Project moved to ${newSpace} space`,
        });
    }
    catch (err) {
        next(err);
    }
});
