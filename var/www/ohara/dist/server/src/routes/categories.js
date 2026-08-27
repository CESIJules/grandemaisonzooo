import { Router } from 'express';
import crypto from 'node:crypto';
import { eq, asc } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { categories } from '../db/schema.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
export const categoriesRouter = Router();
const createCategorySchema = z.object({
    name: z.string().min(1, 'Category name is required').trim(),
    color: z.string().optional().default('#6366f1'),
    description: z.string().optional().default(''),
});
const updateCategorySchema = z.object({
    name: z.string().min(1).trim().optional(),
    color: z.string().optional(),
    description: z.string().optional(),
});
// GET /api/categories (Open to all authenticated members)
categoriesRouter.get('/', requireAuth, async (req, res, next) => {
    try {
        const categoryList = await db.query.categories.findMany({
            orderBy: [asc(categories.name)],
        });
        return res.status(200).json({ categories: categoryList });
    }
    catch (err) {
        next(err);
    }
});
// POST /api/categories (Open to admins only)
categoriesRouter.post('/', requireAdmin, async (req, res, next) => {
    try {
        const parseResult = createCategorySchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({
                error: 'ValidationError',
                message: parseResult.error.errors[0]?.message || 'Input validation failed',
            });
        }
        const { name, color, description } = parseResult.data;
        // Check unique name
        const existing = await db.query.categories.findFirst({
            where: eq(categories.name, name),
        });
        if (existing) {
            return res.status(409).json({ error: 'ConflictError', message: 'Category name already exists' });
        }
        const [newCategory] = await db
            .insert(categories)
            .values({
            id: crypto.randomUUID(),
            name,
            color,
            description,
            createdAt: new Date(),
        })
            .returning();
        return res.status(201).json({ category: newCategory });
    }
    catch (err) {
        next(err);
    }
});
// PATCH /api/categories/:id (Open to admins only)
categoriesRouter.patch('/:id', requireAdmin, async (req, res, next) => {
    try {
        const { id } = req.params;
        const parseResult = updateCategorySchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({
                error: 'ValidationError',
                message: parseResult.error.errors[0]?.message || 'Input validation failed',
            });
        }
        const existing = await db.query.categories.findFirst({
            where: eq(categories.id, id),
        });
        if (!existing) {
            return res.status(404).json({ error: 'NotFound', message: 'Category not found' });
        }
        const updates = parseResult.data;
        if (updates.name && updates.name !== existing.name) {
            const duplicate = await db.query.categories.findFirst({
                where: eq(categories.name, updates.name),
            });
            if (duplicate) {
                return res.status(409).json({ error: 'ConflictError', message: 'Category name already exists' });
            }
        }
        const [updated] = await db
            .update(categories)
            .set(updates)
            .where(eq(categories.id, id))
            .returning();
        return res.status(200).json({ category: updated });
    }
    catch (err) {
        next(err);
    }
});
// DELETE /api/categories/:id (Open to admins only)
categoriesRouter.delete('/:id', requireAdmin, async (req, res, next) => {
    try {
        const { id } = req.params;
        const existing = await db.query.categories.findFirst({
            where: eq(categories.id, id),
        });
        if (!existing) {
            return res.status(404).json({ error: 'NotFound', message: 'Category not found' });
        }
        await db.delete(categories).where(eq(categories.id, id));
        return res.status(200).json({ message: 'Category deleted successfully' });
    }
    catch (err) {
        next(err);
    }
});
