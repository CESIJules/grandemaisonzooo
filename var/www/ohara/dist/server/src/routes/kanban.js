/**
 * Project Kanban Board REST API Routes
 * La Grande Bibliothèque — Milestone 5 (Feature 25: Project Kanban Board)
 *
 * Endpoints:
 *   - GET /api/projects/:projectId/kanban/columns : Returns columns (auto-seeds Backlog, In Progress, Done if empty)
 *   - POST /api/projects/:projectId/kanban/columns : Create new column
 *   - PATCH /api/kanban/columns/:columnId : Rename or reorder column
 *   - DELETE /api/kanban/columns/:columnId : Delete column
 *   - GET /api/projects/:projectId/kanban/cards : Returns cards for project
 *   - POST /api/projects/:projectId/kanban/cards : Create new card
 *   - PATCH /api/kanban/cards/:cardId : Move card, update title, assign, reschedule
 *   - DELETE /api/kanban/cards/:cardId : Delete card
 *   - POST /api/projects/:projectId/kanban/reorder : Batch reorder columns or cards
 */
import { Router } from 'express';
import crypto from 'node:crypto';
import { eq, and, asc, desc } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { projects, kanbanColumns, kanbanCards } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
export const projectKanbanRouter = Router({ mergeParams: true });
export const kanbanRouter = Router();
const DEFAULT_COLUMNS = ['Backlog', 'In Progress', 'Done'];
// Helper to verify project access
async function verifyProjectAccess(projectId, userId) {
    const project = await db.query.projects.findFirst({
        where: eq(projects.id, projectId),
    });
    if (!project) {
        return { errorStatus: 404, message: 'Project not found' };
    }
    if (project.space === 'personal' && project.ownerId !== userId) {
        return { errorStatus: 404, message: 'Project not found' };
    }
    return { project };
}
// ==========================================
// 1. GET /api/projects/:projectId/kanban/columns
// ==========================================
projectKanbanRouter.get('/columns', requireAuth, async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const currentUser = req.user;
        const access = await verifyProjectAccess(projectId, currentUser.id);
        if ('errorStatus' in access) {
            return res.status(access.errorStatus).json({ error: 'NotFound', message: access.message });
        }
        let cols = await db.query.kanbanColumns.findMany({
            where: eq(kanbanColumns.projectId, projectId),
            with: {
                cards: {
                    with: {
                        assignedUser: { columns: { id: true, name: true, email: true } },
                    },
                    orderBy: [asc(kanbanCards.order)],
                },
            },
            orderBy: [asc(kanbanColumns.order)],
        });
        // Auto-seed default 3 columns if empty
        if (cols.length === 0) {
            const seededCols = [];
            for (let i = 0; i < DEFAULT_COLUMNS.length; i++) {
                const title = DEFAULT_COLUMNS[i];
                const [newCol] = await db
                    .insert(kanbanColumns)
                    .values({
                    id: crypto.randomUUID(),
                    projectId,
                    title,
                    order: i,
                })
                    .returning();
                seededCols.push({ ...newCol, cards: [] });
            }
            cols = seededCols;
        }
        return res.status(200).json({ columns: cols });
    }
    catch (err) {
        next(err);
    }
});
// ==========================================
// 2. POST /api/projects/:projectId/kanban/columns
// ==========================================
const createColumnSchema = z.object({
    title: z.string().min(1, 'Column title is required').max(100).trim(),
    order: z.number().optional(),
});
projectKanbanRouter.post('/columns', requireAuth, async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const currentUser = req.user;
        const access = await verifyProjectAccess(projectId, currentUser.id);
        if ('errorStatus' in access) {
            return res.status(access.errorStatus).json({ error: 'NotFound', message: access.message });
        }
        const parseResult = createColumnSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({
                error: 'ValidationError',
                message: parseResult.error.errors[0]?.message || 'Invalid column data',
            });
        }
        const { title, order: explicitOrder } = parseResult.data;
        let finalOrder = explicitOrder;
        if (finalOrder === undefined) {
            const existing = await db.query.kanbanColumns.findMany({
                where: eq(kanbanColumns.projectId, projectId),
                orderBy: [desc(kanbanColumns.order)],
                limit: 1,
            });
            finalOrder = existing.length > 0 ? existing[0].order + 1 : 0;
        }
        const [newCol] = await db
            .insert(kanbanColumns)
            .values({
            id: crypto.randomUUID(),
            projectId,
            title,
            order: finalOrder,
        })
            .returning();
        return res.status(201).json({ column: { ...newCol, cards: [] } });
    }
    catch (err) {
        next(err);
    }
});
// ==========================================
// 3. PATCH /api/kanban/columns/:columnId
// ==========================================
const updateColumnSchema = z.object({
    title: z.string().min(1).max(100).trim().optional(),
    order: z.number().optional(),
});
kanbanRouter.patch('/columns/:columnId', requireAuth, async (req, res, next) => {
    try {
        const { columnId } = req.params;
        const currentUser = req.user;
        const col = await db.query.kanbanColumns.findFirst({
            where: eq(kanbanColumns.id, columnId),
        });
        if (!col) {
            return res.status(404).json({ error: 'NotFound', message: 'Column not found' });
        }
        const access = await verifyProjectAccess(col.projectId, currentUser.id);
        if ('errorStatus' in access) {
            return res.status(access.errorStatus).json({ error: 'NotFound', message: access.message });
        }
        const parseResult = updateColumnSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({
                error: 'ValidationError',
                message: parseResult.error.errors[0]?.message || 'Invalid column update',
            });
        }
        const [updatedCol] = await db
            .update(kanbanColumns)
            .set(parseResult.data)
            .where(eq(kanbanColumns.id, columnId))
            .returning();
        return res.status(200).json({ column: updatedCol });
    }
    catch (err) {
        next(err);
    }
});
// ==========================================
// 4. DELETE /api/kanban/columns/:columnId
// ==========================================
kanbanRouter.delete('/columns/:columnId', requireAuth, async (req, res, next) => {
    try {
        const { columnId } = req.params;
        const currentUser = req.user;
        const col = await db.query.kanbanColumns.findFirst({
            where: eq(kanbanColumns.id, columnId),
        });
        if (!col) {
            return res.status(404).json({ error: 'NotFound', message: 'Column not found' });
        }
        const access = await verifyProjectAccess(col.projectId, currentUser.id);
        if ('errorStatus' in access) {
            return res.status(access.errorStatus).json({ error: 'NotFound', message: access.message });
        }
        await db.delete(kanbanColumns).where(eq(kanbanColumns.id, columnId));
        return res.status(200).json({ message: 'Column deleted successfully' });
    }
    catch (err) {
        next(err);
    }
});
// ==========================================
// 5. GET /api/projects/:projectId/kanban/cards
// ==========================================
projectKanbanRouter.get('/cards', requireAuth, async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const currentUser = req.user;
        const access = await verifyProjectAccess(projectId, currentUser.id);
        if ('errorStatus' in access) {
            return res.status(access.errorStatus).json({ error: 'NotFound', message: access.message });
        }
        const cards = await db.query.kanbanCards.findMany({
            where: eq(kanbanCards.projectId, projectId),
            with: {
                assignedUser: { columns: { id: true, name: true, email: true } },
            },
            orderBy: [asc(kanbanCards.order)],
        });
        return res.status(200).json({ cards });
    }
    catch (err) {
        next(err);
    }
});
// ==========================================
// 6. POST /api/projects/:projectId/kanban/cards
// ==========================================
const createCardSchema = z.object({
    columnId: z.string().min(1, 'Column ID is required'),
    title: z.string().min(1, 'Card title is required').trim(),
    description: z.string().optional().default(''),
    order: z.number().optional(),
    assignedUserId: z.string().nullable().optional(),
    dueDate: z.union([z.number(), z.string()]).nullable().optional(),
});
projectKanbanRouter.post('/cards', requireAuth, async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const currentUser = req.user;
        const access = await verifyProjectAccess(projectId, currentUser.id);
        if ('errorStatus' in access) {
            return res.status(access.errorStatus).json({ error: 'NotFound', message: access.message });
        }
        const parseResult = createCardSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({
                error: 'ValidationError',
                message: parseResult.error.errors[0]?.message || 'Invalid card data',
            });
        }
        const { columnId, title, description, order: explicitOrder, assignedUserId, dueDate } = parseResult.data;
        // Verify column exists
        const col = await db.query.kanbanColumns.findFirst({
            where: and(eq(kanbanColumns.id, columnId), eq(kanbanColumns.projectId, projectId)),
        });
        if (!col) {
            return res.status(404).json({ error: 'NotFound', message: 'Target column not found' });
        }
        // Determine order
        let finalOrder = explicitOrder;
        if (finalOrder === undefined) {
            const existing = await db.query.kanbanCards.findMany({
                where: eq(kanbanCards.columnId, columnId),
                orderBy: [desc(kanbanCards.order)],
                limit: 1,
            });
            finalOrder = existing.length > 0 ? existing[0].order + 1 : 0;
        }
        let parsedDueDate = null;
        if (dueDate) {
            parsedDueDate = typeof dueDate === 'number' ? new Date(dueDate) : new Date(dueDate);
        }
        const [newCard] = await db
            .insert(kanbanCards)
            .values({
            id: crypto.randomUUID(),
            projectId,
            columnId,
            title,
            description: description || '',
            order: finalOrder,
            assignedUserId: assignedUserId || null,
            dueDate: parsedDueDate,
        })
            .returning();
        const populatedCard = await db.query.kanbanCards.findFirst({
            where: eq(kanbanCards.id, newCard.id),
            with: {
                assignedUser: { columns: { id: true, name: true, email: true } },
            },
        });
        return res.status(201).json({ card: populatedCard || newCard });
    }
    catch (err) {
        next(err);
    }
});
// ==========================================
// 7. PATCH /api/kanban/cards/:cardId
// ==========================================
const updateCardSchema = z.object({
    columnId: z.string().optional(),
    title: z.string().min(1).trim().optional(),
    description: z.string().optional(),
    order: z.number().optional(),
    assignedUserId: z.string().nullable().optional(),
    dueDate: z.union([z.number(), z.string()]).nullable().optional(),
});
kanbanRouter.patch('/cards/:cardId', requireAuth, async (req, res, next) => {
    try {
        const { cardId } = req.params;
        const currentUser = req.user;
        const card = await db.query.kanbanCards.findFirst({
            where: eq(kanbanCards.id, cardId),
        });
        if (!card) {
            return res.status(404).json({ error: 'NotFound', message: 'Card not found' });
        }
        const access = await verifyProjectAccess(card.projectId, currentUser.id);
        if ('errorStatus' in access) {
            return res.status(access.errorStatus).json({ error: 'NotFound', message: access.message });
        }
        const parseResult = updateCardSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({
                error: 'ValidationError',
                message: parseResult.error.errors[0]?.message || 'Invalid card update',
            });
        }
        const { columnId, title, description, order, assignedUserId, dueDate } = parseResult.data;
        // If columnId is provided, verify it exists and belongs to the same project or valid project
        if (columnId) {
            const targetCol = await db.query.kanbanColumns.findFirst({
                where: and(eq(kanbanColumns.id, columnId), eq(kanbanColumns.projectId, card.projectId)),
            });
            if (!targetCol) {
                return res.status(404).json({ error: 'NotFound', message: 'Target column not found' });
            }
        }
        const updateData = {};
        if (columnId !== undefined)
            updateData.columnId = columnId;
        if (title !== undefined)
            updateData.title = title;
        if (description !== undefined)
            updateData.description = description;
        if (order !== undefined)
            updateData.order = order;
        if (assignedUserId !== undefined)
            updateData.assignedUserId = assignedUserId;
        if (dueDate !== undefined) {
            updateData.dueDate = dueDate ? (typeof dueDate === 'number' ? new Date(dueDate) : new Date(dueDate)) : null;
        }
        await db.update(kanbanCards).set(updateData).where(eq(kanbanCards.id, cardId));
        const updatedCard = await db.query.kanbanCards.findFirst({
            where: eq(kanbanCards.id, cardId),
            with: {
                assignedUser: { columns: { id: true, name: true, email: true } },
            },
        });
        return res.status(200).json({ card: updatedCard });
    }
    catch (err) {
        next(err);
    }
});
// ==========================================
// 8. DELETE /api/kanban/cards/:cardId
// ==========================================
kanbanRouter.delete('/cards/:cardId', requireAuth, async (req, res, next) => {
    try {
        const { cardId } = req.params;
        const currentUser = req.user;
        const card = await db.query.kanbanCards.findFirst({
            where: eq(kanbanCards.id, cardId),
        });
        if (!card) {
            return res.status(404).json({ error: 'NotFound', message: 'Card not found' });
        }
        const access = await verifyProjectAccess(card.projectId, currentUser.id);
        if ('errorStatus' in access) {
            return res.status(access.errorStatus).json({ error: 'NotFound', message: access.message });
        }
        await db.delete(kanbanCards).where(eq(kanbanCards.id, cardId));
        return res.status(200).json({ message: 'Card deleted successfully' });
    }
    catch (err) {
        next(err);
    }
});
// ==========================================
// 9. POST /api/projects/:projectId/kanban/reorder
// ==========================================
const reorderSchema = z.object({
    type: z.enum(['columns', 'cards']),
    items: z.array(z.object({
        id: z.string(),
        order: z.number(),
        columnId: z.string().optional(),
    })),
});
projectKanbanRouter.post('/reorder', requireAuth, async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const currentUser = req.user;
        const access = await verifyProjectAccess(projectId, currentUser.id);
        if ('errorStatus' in access) {
            return res.status(access.errorStatus).json({ error: 'NotFound', message: access.message });
        }
        const parseResult = reorderSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({
                error: 'ValidationError',
                message: parseResult.error.errors[0]?.message || 'Invalid reorder data',
            });
        }
        const { type, items } = parseResult.data;
        if (type === 'columns') {
            for (const item of items) {
                await db
                    .update(kanbanColumns)
                    .set({ order: item.order })
                    .where(and(eq(kanbanColumns.id, item.id), eq(kanbanColumns.projectId, projectId)));
            }
        }
        else {
            for (const item of items) {
                const updatePayload = { order: item.order };
                if (item.columnId)
                    updatePayload.columnId = item.columnId;
                await db
                    .update(kanbanCards)
                    .set(updatePayload)
                    .where(and(eq(kanbanCards.id, item.id), eq(kanbanCards.projectId, projectId)));
            }
        }
        return res.status(200).json({ message: 'Reordered successfully' });
    }
    catch (err) {
        next(err);
    }
});
