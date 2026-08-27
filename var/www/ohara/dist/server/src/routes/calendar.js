/**
 * Integrated Calendar REST API Routes
 * La Grande Bibliothèque — Milestone 5 (Feature 26: Integrated Calendar View)
 *
 * Endpoints:
 *   - GET /api/calendar/events : Multi-source aggregation (calendar events, project deadlines, task due dates)
 *   - POST /api/calendar/events : Create calendar event (validates startDate <= endDate)
 *   - PATCH /api/calendar/events/:eventId : Reschedule or update event
 *   - DELETE /api/calendar/events/:eventId : Delete event
 */
import { Router } from 'express';
import crypto from 'node:crypto';
import { eq, and, or } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { projects, calendarEvents } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
export const calendarRouter = Router();
// ==========================================
// 1. GET /api/calendar/events
// ==========================================
calendarRouter.get('/events', requireAuth, async (req, res, next) => {
    try {
        const currentUser = req.user;
        const startParam = (req.query.start || req.query.from);
        const endParam = (req.query.end || req.query.to);
        const projectIdParam = req.query.projectId;
        const categoryIdParam = req.query.categoryId;
        const startDateFilter = startParam ? new Date(startParam) : null;
        const endDateFilter = endParam ? new Date(endParam) : null;
        // 1. Fetch accessible projects
        let projectConditions = or(and(eq(projects.space, 'personal'), eq(projects.ownerId, currentUser.id)), eq(projects.space, 'shared'));
        if (projectIdParam) {
            projectConditions = and(projectConditions, eq(projects.id, projectIdParam));
        }
        if (categoryIdParam) {
            projectConditions = and(projectConditions, eq(projects.categoryId, categoryIdParam));
        }
        const accessibleProjects = await db.query.projects.findMany({
            where: projectConditions,
            with: {
                category: true,
                calendarEvents: true,
                kanbanCards: true,
            },
        });
        const projectIds = accessibleProjects.map((p) => p.id);
        const projectMap = new Map(accessibleProjects.map((p) => [p.id, p]));
        const allItems = [];
        for (const p of accessibleProjects) {
            const catColor = p.category?.color || '#8B5CF6';
            const catName = p.category?.name || 'General';
            // 1. Direct Calendar Events
            for (const ev of p.calendarEvents || []) {
                allItems.push({
                    id: ev.id,
                    title: ev.title,
                    startDate: ev.startDate.toISOString(),
                    endDate: (ev.endDate || ev.startDate).toISOString(),
                    allDay: Boolean(ev.allDay),
                    type: 'event',
                    projectId: p.id,
                    projectTitle: p.title,
                    category: catName,
                    color: catColor,
                });
            }
            // 2. Project Due Date Deadline
            if (p.dueDate) {
                allItems.push({
                    id: `proj_due_${p.id}`,
                    title: `${p.title} (Deadline)`,
                    startDate: p.dueDate.toISOString(),
                    endDate: p.dueDate.toISOString(),
                    allDay: true,
                    type: 'project_deadline',
                    projectId: p.id,
                    projectTitle: p.title,
                    category: catName,
                    color: catColor,
                    description: p.description,
                });
            }
            // 3. Kanban Task Due Dates
            for (const card of p.kanbanCards || []) {
                if (card.dueDate) {
                    allItems.push({
                        id: `card_due_${card.id}`,
                        title: card.title,
                        startDate: card.dueDate.toISOString(),
                        endDate: card.dueDate.toISOString(),
                        allDay: true,
                        type: 'task_deadline',
                        projectId: p.id,
                        projectTitle: p.title,
                        category: catName,
                        color: '#06b6d4',
                        description: card.description || '',
                    });
                }
            }
        }
        // Filter by date range if provided
        let filtered = allItems;
        if (startDateFilter && endDateFilter) {
            const sTime = startDateFilter.getTime();
            const eTime = endDateFilter.getTime();
            filtered = allItems.filter((item) => {
                const itemStart = new Date(item.startDate).getTime();
                const itemEnd = new Date(item.endDate).getTime();
                return itemStart <= eTime && itemEnd >= sTime;
            });
        }
        else if (startDateFilter) {
            const sTime = startDateFilter.getTime();
            filtered = allItems.filter((item) => new Date(item.endDate).getTime() >= sTime);
        }
        else if (endDateFilter) {
            const eTime = endDateFilter.getTime();
            filtered = allItems.filter((item) => new Date(item.startDate).getTime() <= eTime);
        }
        // Sort ascending by start date
        filtered.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
        return res.status(200).json({ events: filtered });
    }
    catch (err) {
        next(err);
    }
});
// ==========================================
// 2. POST /api/calendar/events
// ==========================================
const createEventSchema = z.object({
    projectId: z.string().min(1, 'Project ID is required'),
    title: z.string().min(1, 'Event title is required').trim(),
    startDate: z.union([z.string(), z.number()]),
    endDate: z.union([z.string(), z.number()]).optional(),
    allDay: z.boolean().optional().default(false),
});
calendarRouter.post('/events', requireAuth, async (req, res, next) => {
    try {
        const parseResult = createEventSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({
                error: 'ValidationError',
                message: parseResult.error.errors[0]?.message || 'Invalid calendar event data',
            });
        }
        const { projectId, title, startDate, endDate, allDay } = parseResult.data;
        const currentUser = req.user;
        // Verify project exists and is accessible
        const project = await db.query.projects.findFirst({
            where: eq(projects.id, projectId),
        });
        if (!project) {
            return res.status(404).json({ error: 'NotFound', message: 'Project not found' });
        }
        if (project.space === 'personal' && project.ownerId !== currentUser.id) {
            return res.status(404).json({ error: 'NotFound', message: 'Project not found' });
        }
        const start = new Date(startDate);
        const end = endDate ? new Date(endDate) : start;
        // Date inversion validation: startDate must be <= endDate
        if (start.getTime() > end.getTime()) {
            return res.status(400).json({
                error: 'ValidationError',
                message: 'startDate must be before or equal to endDate',
            });
        }
        const [newEvent] = await db
            .insert(calendarEvents)
            .values({
            id: crypto.randomUUID(),
            projectId,
            title,
            startDate: start,
            endDate: end,
            allDay,
        })
            .returning();
        return res.status(201).json({
            event: {
                ...newEvent,
                startDate: newEvent.startDate.toISOString(),
                endDate: newEvent.endDate ? newEvent.endDate.toISOString() : newEvent.startDate.toISOString(),
            },
        });
    }
    catch (err) {
        next(err);
    }
});
// ==========================================
// 3. PATCH /api/calendar/events/:eventId
// ==========================================
const updateEventSchema = z.object({
    projectId: z.string().optional(),
    title: z.string().min(1).trim().optional(),
    startDate: z.union([z.string(), z.number()]).optional(),
    endDate: z.union([z.string(), z.number()]).optional(),
    allDay: z.boolean().optional(),
});
calendarRouter.patch('/events/:eventId', requireAuth, async (req, res, next) => {
    try {
        const { eventId } = req.params;
        const currentUser = req.user;
        const existingEvent = await db.query.calendarEvents.findFirst({
            where: eq(calendarEvents.id, eventId),
            with: { project: true },
        });
        if (!existingEvent) {
            return res.status(404).json({ error: 'NotFound', message: 'Event not found' });
        }
        if (existingEvent.project?.space === 'personal' && existingEvent.project?.ownerId !== currentUser.id) {
            return res.status(404).json({ error: 'NotFound', message: 'Event not found' });
        }
        const parseResult = updateEventSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({
                error: 'ValidationError',
                message: parseResult.error.errors[0]?.message || 'Invalid update payload',
            });
        }
        const { projectId, title, startDate, endDate, allDay } = parseResult.data;
        const start = startDate !== undefined ? new Date(startDate) : existingEvent.startDate;
        const end = endDate !== undefined ? new Date(endDate) : (existingEvent.endDate || existingEvent.startDate);
        if (start.getTime() > end.getTime()) {
            return res.status(400).json({
                error: 'ValidationError',
                message: 'startDate must be before or equal to endDate',
            });
        }
        const updatePayload = {};
        if (projectId !== undefined)
            updatePayload.projectId = projectId;
        if (title !== undefined)
            updatePayload.title = title;
        if (startDate !== undefined)
            updatePayload.startDate = start;
        if (endDate !== undefined)
            updatePayload.endDate = end;
        if (allDay !== undefined)
            updatePayload.allDay = allDay;
        const [updatedEvent] = await db
            .update(calendarEvents)
            .set(updatePayload)
            .where(eq(calendarEvents.id, eventId))
            .returning();
        return res.status(200).json({
            event: {
                ...updatedEvent,
                startDate: updatedEvent.startDate.toISOString(),
                endDate: updatedEvent.endDate ? updatedEvent.endDate.toISOString() : updatedEvent.startDate.toISOString(),
            },
        });
    }
    catch (err) {
        next(err);
    }
});
// ==========================================
// 4. DELETE /api/calendar/events/:eventId
// ==========================================
calendarRouter.delete('/events/:eventId', requireAuth, async (req, res, next) => {
    try {
        const { eventId } = req.params;
        const currentUser = req.user;
        const existingEvent = await db.query.calendarEvents.findFirst({
            where: eq(calendarEvents.id, eventId),
            with: { project: true },
        });
        if (!existingEvent) {
            return res.status(404).json({ error: 'NotFound', message: 'Event not found' });
        }
        if (existingEvent.project?.space === 'personal' && existingEvent.project?.ownerId !== currentUser.id) {
            return res.status(404).json({ error: 'NotFound', message: 'Event not found' });
        }
        await db.delete(calendarEvents).where(eq(calendarEvents.id, eventId));
        return res.status(200).json({ message: 'Event deleted successfully' });
    }
    catch (err) {
        next(err);
    }
});
