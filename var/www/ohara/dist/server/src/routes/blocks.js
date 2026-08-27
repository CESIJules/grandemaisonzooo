import { Router } from 'express';
import crypto from 'node:crypto';
import { eq, asc } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { projects, blocks, blockTypeEnum } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { searchIndexManager } from './searchIndex.js';
export const blocksRouter = Router();
export const projectBlocksRouter = Router({ mergeParams: true });
// Helper: Format Block JSON for consistent API responses
export function formatBlock(b) {
    let parsedContent = b.content;
    if (typeof b.content === 'string') {
        try {
            parsedContent = JSON.parse(b.content);
        }
        catch {
            parsedContent = { text: b.content };
        }
    }
    return {
        id: b.id,
        projectId: b.projectId,
        type: b.type,
        content: parsedContent,
        order: b.order,
        canvasX: b.canvasX ?? null,
        canvasY: b.canvasY ?? null,
        canvasW: b.canvasW ?? null,
        canvasH: b.canvasH ?? null,
        canvasZ: b.canvasZ ?? 0,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
    };
}
// Default content factory for the 8 polymorphic block types
export function getDefaultBlockContent(type) {
    switch (type) {
        case 'rich_text':
            return { text: '' };
        case 'markdown':
            return { markdown: '' };
        case 'drawing':
            return { strokes: [] };
        case 'checklist':
            return { items: [] };
        case 'table':
            return { headers: ['Column 1', 'Column 2'], rows: [['', '']] };
        case 'media':
            return { mediaType: 'audio', url: '', fileName: '', caption: '' };
        case 'embed':
            return { url: '', provider: 'generic', title: '' };
        case 'code':
            return { language: 'typescript', code: '' };
        default:
            return {};
    }
}
// Helper: Access check with space isolation & IDOR prevention
async function getAccessibleProject(projectId, userId) {
    const project = await db.query.projects.findFirst({
        where: eq(projects.id, projectId),
    });
    if (!project)
        return null;
    if (project.space === 'personal' && project.ownerId !== userId) {
        return null; // Strict IDOR protection: forbidden personal space returns null (404)
    }
    return project;
}
// Zod validation schemas
const createBlockSchema = z.object({
    type: z.enum(blockTypeEnum),
    content: z.any().optional(),
    order: z.number().int().optional(),
    canvasX: z.number().nullable().optional(),
    canvasY: z.number().nullable().optional(),
    canvasW: z.number().nullable().optional(),
    canvasH: z.number().nullable().optional(),
    canvasZ: z.number().int().nullable().optional(),
});
const updateBlockSchema = z.object({
    type: z.enum(blockTypeEnum).optional(),
    content: z.any().optional(),
    order: z.number().int().optional(),
    canvasX: z.number().nullable().optional(),
    canvasY: z.number().nullable().optional(),
    canvasW: z.number().nullable().optional(),
    canvasH: z.number().nullable().optional(),
    canvasZ: z.number().int().nullable().optional(),
});
const reorderSchema = z.object({
    blockIds: z.array(z.string()).optional(),
    orders: z.array(z.object({ id: z.string(), order: z.number() })).optional(),
});
// =========================================================================
// PROJECT-SCOPED ROUTES (/api/projects/:projectId/blocks)
// =========================================================================
// 1. GET /api/projects/:projectId/blocks
projectBlocksRouter.get('/', requireAuth, async (req, res, next) => {
    try {
        const projectId = req.params.projectId || req.params.id;
        const currentUser = req.user;
        const project = await getAccessibleProject(projectId, currentUser.id);
        if (!project) {
            return res.status(404).json({ error: 'NotFound', message: 'Project not found' });
        }
        const blockList = await db.query.blocks.findMany({
            where: eq(blocks.projectId, projectId),
            orderBy: [asc(blocks.order)],
        });
        // Self-healing: find all child projects that don't have a matching subproject block
        const childProjects = await db.query.projects.findMany({
            where: eq(projects.parentId, projectId),
        });
        let dbUpdated = false;
        const now = new Date();
        for (const child of childProjects) {
            const hasBlock = blockList.some((b) => {
                if (b.type !== 'subproject')
                    return false;
                try {
                    const contentObj = typeof b.content === 'string' ? JSON.parse(b.content) : b.content;
                    return contentObj?.targetProjectId === child.id;
                }
                catch {
                    return false;
                }
            });
            if (!hasBlock) {
                const maxOrder = blockList.length > 0 ? Math.max(...blockList.map((b) => b.order)) + 1 : 0;
                const [newBlock] = await db
                    .insert(blocks)
                    .values({
                    id: crypto.randomUUID(),
                    projectId,
                    type: 'subproject',
                    content: JSON.stringify({ targetProjectId: child.id }),
                    order: maxOrder,
                    canvasX: 100 + (blockList.length * 40) % 400,
                    canvasY: 100 + (blockList.length * 40) % 400,
                    canvasW: 240,
                    canvasH: 100,
                    canvasZ: 0,
                    createdAt: now,
                    updatedAt: now,
                })
                    .returning();
                blockList.push(newBlock);
                dbUpdated = true;
            }
        }
        if (dbUpdated) {
            await db.update(projects).set({ updatedAt: now }).where(eq(projects.id, projectId));
            await searchIndexManager.invalidateProject(projectId);
        }
        return res.status(200).json({ blocks: blockList.map(formatBlock) });
    }
    catch (err) {
        next(err);
    }
});
// 2. POST /api/projects/:projectId/blocks
projectBlocksRouter.post('/', requireAuth, async (req, res, next) => {
    try {
        const projectId = req.params.projectId || req.params.id;
        const currentUser = req.user;
        const project = await getAccessibleProject(projectId, currentUser.id);
        if (!project) {
            return res.status(404).json({ error: 'NotFound', message: 'Project not found' });
        }
        const parseResult = createBlockSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({
                error: 'ValidationError',
                message: parseResult.error.errors[0]?.message || 'Invalid block payload',
                details: parseResult.error.errors,
            });
        }
        const { type, content, canvasX, canvasY, canvasW, canvasH, canvasZ } = parseResult.data;
        let targetOrder = parseResult.data.order;
        if (targetOrder === undefined) {
            const existing = await db.query.blocks.findMany({
                where: eq(blocks.projectId, projectId),
                columns: { order: true },
            });
            targetOrder = existing.length > 0 ? Math.max(...existing.map((b) => b.order)) + 1 : 0;
        }
        const initialContent = content !== undefined ? content : getDefaultBlockContent(type);
        const contentString = typeof initialContent === 'string' ? initialContent : JSON.stringify(initialContent);
        const now = new Date();
        const [newBlock] = await db
            .insert(blocks)
            .values({
            id: crypto.randomUUID(),
            projectId,
            type,
            content: contentString,
            order: targetOrder,
            canvasX: canvasX ?? null,
            canvasY: canvasY ?? null,
            canvasW: canvasW ?? null,
            canvasH: canvasH ?? null,
            canvasZ: canvasZ ?? 0,
            createdAt: now,
            updatedAt: now,
        })
            .returning();
        await db.update(projects).set({ updatedAt: now }).where(eq(projects.id, projectId));
        await searchIndexManager.invalidateProject(projectId);
        return res.status(201).json({ block: formatBlock(newBlock) });
    }
    catch (err) {
        next(err);
    }
});
// 3. PUT /api/projects/:projectId/blocks/reorder
projectBlocksRouter.put('/reorder', requireAuth, async (req, res, next) => {
    try {
        const projectId = req.params.projectId || req.params.id;
        const currentUser = req.user;
        const project = await getAccessibleProject(projectId, currentUser.id);
        if (!project) {
            return res.status(404).json({ error: 'NotFound', message: 'Project not found' });
        }
        const parseResult = reorderSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({
                error: 'ValidationError',
                message: 'Invalid reorder payload',
            });
        }
        const { blockIds, orders } = parseResult.data;
        // Fetch existing blocks for validation
        const existingBlocks = await db.query.blocks.findMany({
            where: eq(blocks.projectId, projectId),
        });
        const existingMap = new Map(existingBlocks.map((b) => [b.id, b]));
        let orderedIdList = [];
        if (blockIds && Array.isArray(blockIds)) {
            orderedIdList = blockIds;
        }
        else if (orders && Array.isArray(orders)) {
            const sorted = [...orders].sort((a, b) => a.order - b.order);
            orderedIdList = sorted.map((o) => o.id);
        }
        else {
            return res.status(400).json({ error: 'ValidationError', message: 'Must provide blockIds or orders' });
        }
        // Validate incomplete or foreign IDs
        if (orderedIdList.length !== existingBlocks.length) {
            return res.status(400).json({ error: 'ValidationError', message: 'Reorder list must match total block count' });
        }
        for (const id of orderedIdList) {
            if (!existingMap.has(id)) {
                return res.status(400).json({ error: 'ValidationError', message: `Foreign block ID detected: ${id}` });
            }
        }
        const now = new Date();
        // Update sequential contiguous order (0..N-1)
        for (let i = 0; i < orderedIdList.length; i++) {
            const blockId = orderedIdList[i];
            await db
                .update(blocks)
                .set({ order: i, updatedAt: now })
                .where(eq(blocks.id, blockId));
        }
        await db.update(projects).set({ updatedAt: now }).where(eq(projects.id, projectId));
        await searchIndexManager.invalidateProject(projectId);
        const updatedBlocks = await db.query.blocks.findMany({
            where: eq(blocks.projectId, projectId),
            orderBy: [asc(blocks.order)],
        });
        return res.status(200).json({ blocks: updatedBlocks.map(formatBlock) });
    }
    catch (err) {
        next(err);
    }
});
// =========================================================================
// DIRECT BLOCK ROUTES (/api/blocks/:id)
// =========================================================================
// 4. PATCH /api/blocks/:id
blocksRouter.patch('/:id', requireAuth, async (req, res, next) => {
    try {
        const { id } = req.params;
        const currentUser = req.user;
        const existing = await db.query.blocks.findFirst({
            where: eq(blocks.id, id),
        });
        if (!existing) {
            return res.status(404).json({ error: 'NotFound', message: 'Block not found' });
        }
        const project = await getAccessibleProject(existing.projectId, currentUser.id);
        if (!project) {
            return res.status(404).json({ error: 'NotFound', message: 'Block not found' });
        }
        const parseResult = updateBlockSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({
                error: 'ValidationError',
                message: parseResult.error.errors[0]?.message || 'Invalid block update payload',
                details: parseResult.error.errors,
            });
        }
        const updates = parseResult.data;
        const now = new Date();
        const updateData = { updatedAt: now };
        if (updates.type !== undefined)
            updateData.type = updates.type;
        if (updates.content !== undefined) {
            updateData.content = typeof updates.content === 'string' ? updates.content : JSON.stringify(updates.content);
        }
        if (updates.order !== undefined)
            updateData.order = updates.order;
        if (updates.canvasX !== undefined)
            updateData.canvasX = updates.canvasX;
        if (updates.canvasY !== undefined)
            updateData.canvasY = updates.canvasY;
        if (updates.canvasW !== undefined)
            updateData.canvasW = updates.canvasW;
        if (updates.canvasH !== undefined)
            updateData.canvasH = updates.canvasH;
        if (updates.canvasZ !== undefined)
            updateData.canvasZ = updates.canvasZ;
        await db.update(blocks).set(updateData).where(eq(blocks.id, id));
        await db.update(projects).set({ updatedAt: now }).where(eq(projects.id, existing.projectId));
        await searchIndexManager.invalidateProject(existing.projectId);
        const updated = await db.query.blocks.findFirst({
            where: eq(blocks.id, id),
        });
        return res.status(200).json({ block: formatBlock(updated) });
    }
    catch (err) {
        next(err);
    }
});
// 5. DELETE /api/blocks/:id
blocksRouter.delete('/:id', requireAuth, async (req, res, next) => {
    try {
        const { id } = req.params;
        const currentUser = req.user;
        const existing = await db.query.blocks.findFirst({
            where: eq(blocks.id, id),
        });
        if (!existing) {
            return res.status(404).json({ error: 'NotFound', message: 'Block not found' });
        }
        const project = await getAccessibleProject(existing.projectId, currentUser.id);
        if (!project) {
            return res.status(404).json({ error: 'NotFound', message: 'Block not found' });
        }
        await db.delete(blocks).where(eq(blocks.id, id));
        const now = new Date();
        await db.update(projects).set({ updatedAt: now }).where(eq(projects.id, existing.projectId));
        await searchIndexManager.invalidateProject(existing.projectId);
        return res.status(200).json({ success: true, message: 'Block deleted successfully' });
    }
    catch (err) {
        next(err);
    }
});
