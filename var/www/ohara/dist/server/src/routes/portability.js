/**
 * Project Markdown Import/Export Portability REST API Routes
 * La Grande Bibliothèque — Milestone 5 (Feature 27: Markdown Import/Export Portability)
 *
 * Endpoints:
 *   - GET /api/projects/:id/export/markdown : Exports project metadata & polymorphic blocks as Markdown with YAML frontmatter
 *   - POST /api/projects/import/markdown : Imports Markdown with YAML frontmatter, creates project & reconstructed blocks
 */
import { Router } from 'express';
import crypto from 'node:crypto';
import { eq, asc } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { projects, projectTags, tags, categories, blocks } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { normalizeTagName } from './tags.js';
import { searchIndexManager } from './searchIndex.js';
import { serializeMarkdownWithFrontmatter, parseMarkdownWithFrontmatter, } from '../utils/markdownPortability.js';
export const portabilityRouter = Router();
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
// ==========================================
// 1. GET /api/projects/:id/export/markdown
// ==========================================
portabilityRouter.get('/:id/export/markdown', requireAuth, async (req, res, next) => {
    try {
        const { id } = req.params;
        const currentUser = req.user;
        const project = await db.query.projects.findFirst({
            where: eq(projects.id, id),
            with: {
                category: true,
                projectTags: { with: { tag: true } },
                blocks: { orderBy: [asc(blocks.order)] },
            },
        });
        if (!project) {
            return res.status(404).json({ error: 'NotFound', message: 'Project not found' });
        }
        if (project.space === 'personal' && project.ownerId !== currentUser.id) {
            return res.status(404).json({ error: 'NotFound', message: 'Project not found' });
        }
        const frontmatter = {
            title: project.title,
            description: project.description || undefined,
            space: project.space,
            category: project.category?.name || undefined,
            tags: project.projectTags.map((pt) => pt.tag.name),
            status: project.status,
            dueDate: project.dueDate ? safeISO(project.dueDate) : null,
            createdAt: safeISO(project.createdAt),
            updatedAt: safeISO(project.updatedAt),
        };
        const markdownOutput = serializeMarkdownWithFrontmatter(frontmatter, project.blocks || []);
        const safeTitle = project.title.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
        const filename = `${safeTitle || 'project'}.md`;
        if (req.headers.accept?.includes('application/json') && req.query.format === 'json') {
            return res.status(200).json({
                filename,
                markdown: markdownOutput,
                frontmatter,
            });
        }
        res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.status(200).send(markdownOutput);
    }
    catch (err) {
        next(err);
    }
});
// ==========================================
// 2. POST /api/projects/import/markdown
// ==========================================
const importMarkdownSchema = z.object({
    markdown: z.string().min(1, 'Markdown content is required'),
    space: z.enum(['personal', 'shared']).optional(),
    categoryId: z.string().nullable().optional(),
});
portabilityRouter.post('/import/markdown', requireAuth, async (req, res, next) => {
    try {
        const currentUser = req.user;
        let markdownContent = '';
        let targetSpace;
        let targetCategoryId;
        if (typeof req.body === 'string') {
            markdownContent = req.body;
        }
        else if (req.body && typeof req.body.markdown === 'string') {
            const parsed = importMarkdownSchema.safeParse(req.body);
            if (!parsed.success) {
                return res.status(400).json({
                    error: 'ValidationError',
                    message: parsed.error.errors[0]?.message || 'Invalid markdown import payload',
                });
            }
            markdownContent = parsed.data.markdown;
            targetSpace = parsed.data.space;
            targetCategoryId = parsed.data.categoryId;
        }
        else {
            return res.status(400).json({
                error: 'ValidationError',
                message: 'Markdown content string is required',
            });
        }
        const { frontmatter, extractedBlocks, body } = parseMarkdownWithFrontmatter(markdownContent);
        // Fallback title resolution
        let resolvedTitle = frontmatter.title;
        if (!resolvedTitle) {
            const headingMatch = body.match(/^#\s+(.*)/m);
            resolvedTitle = headingMatch ? headingMatch[1].trim() : 'Imported Markdown Project';
        }
        const now = new Date();
        const projectId = crypto.randomUUID();
        const finalSpace = targetSpace || (frontmatter.space === 'shared' ? 'shared' : 'personal');
        const visibility = finalSpace === 'shared' ? 'shared' : 'private';
        // Check if category name in frontmatter maps to existing category
        let finalCategoryId = targetCategoryId || null;
        if (!finalCategoryId && frontmatter.category) {
            const foundCat = await db.query.categories.findFirst({
                where: eq(categories.name, frontmatter.category.trim()),
            });
            if (foundCat) {
                finalCategoryId = foundCat.id;
            }
        }
        let parsedDueDate = null;
        if (frontmatter.dueDate) {
            parsedDueDate = new Date(frontmatter.dueDate);
            if (isNaN(parsedDueDate.getTime()))
                parsedDueDate = null;
        }
        const [newProject] = await db
            .insert(projects)
            .values({
            id: projectId,
            title: resolvedTitle,
            description: frontmatter.description || '',
            space: finalSpace,
            visibility,
            ownerId: currentUser.id,
            categoryId: finalCategoryId,
            status: frontmatter.status && ['draft', 'active', 'archived'].includes(frontmatter.status) ? frontmatter.status : 'active',
            dueDate: parsedDueDate,
            createdAt: frontmatter.createdAt ? new Date(frontmatter.createdAt) : now,
            updatedAt: now,
        })
            .returning();
        // Import tags if provided
        const tagsList = Array.isArray(frontmatter.tags) ? frontmatter.tags : [];
        const savedTags = [];
        for (const tagName of tagsList) {
            const normalized = normalizeTagName(String(tagName));
            if (!normalized)
                continue;
            let tag = await db.query.tags.findFirst({
                where: eq(tags.name, normalized),
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
            savedTags.push(tag);
            await db
                .insert(projectTags)
                .values({
                projectId: newProject.id,
                tagId: tag.id,
            })
                .onConflictDoNothing();
        }
        // Insert polymorphic extracted blocks
        const createdBlocks = [];
        const blocksToInsert = extractedBlocks.length > 0 ? extractedBlocks : [
            {
                type: 'markdown',
                content: { markdown: body.trim() },
            },
        ];
        for (let i = 0; i < blocksToInsert.length; i++) {
            const b = blocksToInsert[i];
            const blockId = crypto.randomUUID();
            const [insertedBlock] = await db
                .insert(blocks)
                .values({
                id: blockId,
                projectId: newProject.id,
                type: b.type,
                content: JSON.stringify(b.content || {}),
                order: i,
                createdAt: now,
                updatedAt: now,
            })
                .returning();
            createdBlocks.push(insertedBlock);
        }
        // Sync search index
        try {
            await searchIndexManager.indexProject(newProject.id);
        }
        catch {
            // non-blocking
        }
        return res.status(201).json({
            project: {
                ...newProject,
                tags: savedTags,
            },
            blocks: createdBlocks,
            message: 'Project imported successfully',
        });
    }
    catch (err) {
        next(err);
    }
});
