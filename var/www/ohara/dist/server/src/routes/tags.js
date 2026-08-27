import { Router } from 'express';
import crypto from 'node:crypto';
import { eq, like, asc } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { tags } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
export const tagsRouter = Router();
export function normalizeTagName(input) {
    return input
        .trim()
        .toLowerCase()
        .replace(/[^\w\s-]/g, '') // remove special characters
        .replace(/\s+/g, '-') // replace spaces with hyphens
        .replace(/-+/g, '-') // collapse multiple hyphens
        .replace(/^-|-$/g, ''); // trim leading/trailing hyphens
}
const createTagSchema = z.object({
    name: z.string().min(1, 'Tag name is required'),
});
// GET /api/tags
tagsRouter.get('/', requireAuth, async (req, res, next) => {
    try {
        const q = req.query.q;
        let tagList;
        if (q && q.trim()) {
            const normalizedQuery = normalizeTagName(q);
            tagList = await db.query.tags.findMany({
                where: like(tags.name, `%${normalizedQuery}%`),
                orderBy: [asc(tags.name)],
            });
        }
        else {
            tagList = await db.query.tags.findMany({
                orderBy: [asc(tags.name)],
            });
        }
        return res.status(200).json({ tags: tagList });
    }
    catch (err) {
        next(err);
    }
});
// POST /api/tags
tagsRouter.post('/', requireAuth, async (req, res, next) => {
    try {
        const parseResult = createTagSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({
                error: 'ValidationError',
                message: parseResult.error.errors[0]?.message || 'Input validation failed',
            });
        }
        const normalized = normalizeTagName(parseResult.data.name);
        if (!normalized) {
            return res.status(400).json({ error: 'ValidationError', message: 'Invalid tag name after normalization' });
        }
        // Check for existing tag
        let tag = await db.query.tags.findFirst({
            where: eq(tags.name, normalized),
        });
        if (!tag) {
            const [newTag] = await db
                .insert(tags)
                .values({
                id: crypto.randomUUID(),
                name: normalized,
                createdAt: new Date(),
            })
                .returning();
            tag = newTag;
            return res.status(201).json({ tag });
        }
        return res.status(200).json({ tag });
    }
    catch (err) {
        next(err);
    }
});
