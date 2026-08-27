/**
 * Dashboard & Quick-Add Zone REST API Routes
 * La Grande Bibliothèque — Milestone 5 (Feature 23: Actionable Dashboard & Quick-Add Zone)
 *
 * Endpoints:
 *   - GET /api/dashboard/summary : Aggregates active projects, progress, tasks, connections, deadlines, quick stats (<3s SLA)
 *   - POST /api/quick-add : 1-click draft project creation with instant hashtag extraction
 */
import { Router } from 'express';
import crypto from 'node:crypto';
import { eq, and, or, desc, inArray, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { projects, tags, projectTags, connections, calendarEvents, } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { normalizeTagName } from './tags.js';
import { searchIndexManager } from './searchIndex.js';
export const dashboardRouter = Router();
export const quickAddRouter = Router();
function safeISO(d) {
    if (!d)
        return null;
    try {
        const date = d instanceof Date ? d : new Date(d);
        if (isNaN(date.getTime())) {
            const num = Number(d);
            if (!isNaN(num) && num > 0) {
                const converted = new Date(num > 1e11 ? num : num * 1000);
                if (!isNaN(converted.getTime()))
                    return converted.toISOString();
            }
            return null;
        }
        return date.toISOString();
    }
    catch {
        return null;
    }
}
// ==========================================
// 1. GET /api/dashboard/summary
// ==========================================
dashboardRouter.get('/summary', requireAuth, async (req, res, next) => {
    try {
        const currentUser = req.user;
        const now = new Date();
        const nowEpoch = now.getTime();
        const sevenDaysAgo = new Date(nowEpoch - 7 * 24 * 60 * 60 * 1000);
        const fourteenDaysAhead = new Date(nowEpoch + 14 * 24 * 60 * 60 * 1000);
        // 1. Fetch accessible projects for the current user (personal owned + shared)
        const accessibleProjects = await db.query.projects.findMany({
            where: and(isNull(projects.parentId), or(and(eq(projects.space, 'personal'), eq(projects.ownerId, currentUser.id)), eq(projects.space, 'shared'))),
            with: {
                owner: { columns: { id: true, name: true, email: true } },
                category: true,
                projectTags: { with: { tag: true } },
                blocks: true,
                kanbanColumns: {
                    with: { cards: true },
                },
                parentProject: {
                    columns: {
                        id: true,
                        title: true,
                    },
                },
                subProjects: {
                    with: {
                        subProjects: {
                            with: {
                                subProjects: true,
                            }
                        }
                    }
                }
            },
            orderBy: [desc(projects.updatedAt)],
        });
        const projectIds = accessibleProjects.map((p) => p.id);
        // 2. Compute progress for each project based on Checklist blocks and Kanban cards
        const recentProjects = accessibleProjects.slice(0, 10).map((p) => {
            let totalTasks = 0;
            let completedTasks = 0;
            // Count checklist blocks
            for (const b of p.blocks || []) {
                if (b.type === 'checklist' && b.content && Array.isArray(b.content.items)) {
                    const items = b.content.items;
                    for (const item of items) {
                        totalTasks++;
                        if (item.checked)
                            completedTasks++;
                    }
                }
            }
            // Count kanban cards if any
            for (const col of p.kanbanColumns || []) {
                const isDoneCol = col.title.toLowerCase().includes('done') || col.title.toLowerCase().includes('complete');
                for (const card of col.cards || []) {
                    // If project had no checklist blocks, consider kanban cards as tasks
                    if ((p.blocks || []).filter((b) => b.type === 'checklist').length === 0) {
                        totalTasks++;
                        if (isDoneCol)
                            completedTasks++;
                    }
                }
            }
            const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
            const descendants = [];
            const collect = (proj) => {
                for (const sub of proj.subProjects || []) {
                    descendants.push(sub);
                    collect(sub);
                }
            };
            collect(p);
            descendants.sort((a, b) => {
                const timeA = a.updatedAt instanceof Date ? a.updatedAt.getTime() : Number(a.updatedAt) * 1000;
                const timeB = b.updatedAt instanceof Date ? b.updatedAt.getTime() : Number(b.updatedAt) * 1000;
                return timeB - timeA;
            });
            const recentlyModifiedPages = descendants.slice(0, 4).map((d) => ({
                id: d.id,
                title: d.title,
                updatedAt: safeISO(d.updatedAt) || new Date().toISOString(),
            }));
            return {
                id: p.id,
                title: p.title,
                description: p.description,
                space: p.space,
                visibility: p.visibility,
                ownerId: p.ownerId,
                owner: p.owner,
                categoryId: p.categoryId,
                category: p.category,
                status: p.status,
                dueDate: safeISO(p.dueDate),
                createdAt: safeISO(p.createdAt) || new Date().toISOString(),
                updatedAt: safeISO(p.updatedAt) || new Date().toISOString(),
                parentId: p.parentId,
                parentProject: p.parentProject,
                tags: p.projectTags.map((pt) => pt.tag.name),
                recentlyModifiedPages,
                progress: {
                    completed_tasks: completedTasks,
                    total_tasks: totalTasks,
                    percentage,
                    completedTasks,
                    totalTasks,
                },
            };
        });
        const pendingTasksList = [];
        for (const p of accessibleProjects) {
            // Checklist items
            for (const b of p.blocks || []) {
                if (b.type === 'checklist' && b.content && Array.isArray(b.content.items)) {
                    const items = b.content.items;
                    for (let i = 0; i < items.length; i++) {
                        const item = items[i];
                        if (!item.checked) {
                            const itemDue = p.dueDate ? p.dueDate.getTime() : null;
                            const daysRemaining = itemDue ? Math.floor((itemDue - nowEpoch) / (86400 * 1000)) : 7;
                            const isOverdue = daysRemaining < 0;
                            const urgency = isOverdue ? 1000 - daysRemaining : Math.max(0, 100 - daysRemaining);
                            pendingTasksList.push({
                                id: item.id || `chk_${p.id}_${b.id}_${i}`,
                                title: item.text || 'Untitled Task',
                                projectId: p.id,
                                projectTitle: p.title,
                                dueDate: safeISO(p.dueDate),
                                days_remaining: daysRemaining,
                                daysRemaining,
                                isOverdue,
                                is_overdue: isOverdue,
                                urgency,
                                completed: false,
                                source: 'checklist',
                            });
                        }
                    }
                }
            }
            // Kanban cards
            for (const col of p.kanbanColumns || []) {
                const isDoneCol = col.title.toLowerCase().includes('done') || col.title.toLowerCase().includes('complete');
                if (!isDoneCol) {
                    for (const card of col.cards || []) {
                        const cardDue = card.dueDate ? card.dueDate.getTime() : p.dueDate ? p.dueDate.getTime() : null;
                        const daysRemaining = cardDue ? Math.floor((cardDue - nowEpoch) / (86400 * 1000)) : 14;
                        const isOverdue = daysRemaining < 0;
                        const urgency = isOverdue ? 1000 - daysRemaining : Math.max(0, 100 - daysRemaining);
                        pendingTasksList.push({
                            id: card.id,
                            title: card.title,
                            projectId: p.id,
                            projectTitle: p.title,
                            dueDate: safeISO(card.dueDate) || safeISO(p.dueDate),
                            days_remaining: daysRemaining,
                            daysRemaining,
                            isOverdue,
                            is_overdue: isOverdue,
                            urgency,
                            completed: false,
                            source: 'kanban',
                        });
                    }
                }
            }
        }
        // Sort pending tasks by urgency descending, limit to top 20
        pendingTasksList.sort((a, b) => b.urgency - a.urgency);
        const pendingTasks = pendingTasksList.slice(0, 20);
        const deadlinesList = [];
        // Project deadlines
        for (const p of accessibleProjects) {
            if (p.dueDate) {
                const daysRemaining = Math.floor((p.dueDate.getTime() - nowEpoch) / (86400 * 1000));
                const isOverdue = daysRemaining < 0;
                deadlinesList.push({
                    id: `p_due_${p.id}`,
                    title: p.title,
                    type: 'project',
                    projectId: p.id,
                    projectTitle: p.title,
                    startDate: safeISO(p.dueDate) || new Date().toISOString(),
                    dueDate: safeISO(p.dueDate) || new Date().toISOString(),
                    days_remaining: daysRemaining,
                    daysRemaining,
                    isOverdue,
                    is_overdue: isOverdue,
                });
            }
        }
        // Calendar events
        if (projectIds.length > 0) {
            const events = await db.query.calendarEvents.findMany({
                where: inArray(calendarEvents.projectId, projectIds),
                with: { project: true },
            });
            for (const ev of events) {
                const daysRemaining = Math.floor((ev.startDate.getTime() - nowEpoch) / (86400 * 1000));
                const isOverdue = daysRemaining < 0;
                deadlinesList.push({
                    id: ev.id,
                    title: ev.title,
                    type: 'event',
                    projectId: ev.projectId,
                    projectTitle: ev.project?.title || 'Project Event',
                    startDate: safeISO(ev.startDate) || new Date().toISOString(),
                    dueDate: safeISO(ev.endDate || ev.startDate) || new Date().toISOString(),
                    days_remaining: daysRemaining,
                    daysRemaining,
                    isOverdue,
                    is_overdue: isOverdue,
                });
            }
        }
        // Sort deadlines by date ascending
        deadlinesList.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
        const upcomingDeadlines = deadlinesList.slice(0, 15);
        // 5. Fetch suggested connections
        let dbSuggestedConnections = [];
        if (projectIds.length > 0) {
            const foundConnections = await db.query.connections.findMany({
                where: and(eq(connections.status, 'suggested'), or(inArray(connections.sourceProjectId, projectIds), inArray(connections.targetProjectId, projectIds))),
                with: {
                    sourceProject: { columns: { id: true, title: true, space: true } },
                    targetProject: { columns: { id: true, title: true, space: true } },
                },
            });
            dbSuggestedConnections = foundConnections.map((c) => ({
                id: c.id,
                sourceProjectId: c.sourceProjectId,
                targetProjectId: c.targetProjectId,
                source_project: c.sourceProject?.title || c.sourceProjectId,
                target_project: c.targetProject?.title || c.targetProjectId,
                confidence_score: c.score,
                score: c.score,
                reason: c.reason,
                status: c.status,
            }));
        }
        // 6. Compute Quick Stats
        const ideasThisWeek = accessibleProjects.filter((p) => p.createdAt >= sevenDaysAgo).length;
        const acceptedLinks = await db.query.connections.findMany({
            where: eq(connections.status, 'accepted'),
        });
        const quickStats = {
            total_projects: accessibleProjects.length,
            totalProjects: accessibleProjects.length,
            ideas_this_week: ideasThisWeek,
            ideasThisWeek,
            active_collaborators: 1,
            activeCollaborators: 1,
            connected_links: acceptedLinks.length,
            connectedLinks: acceptedLinks.length,
        };
        // Return unified schema supporting both camelCase and snake_case aliases
        return res.status(200).json({
            recent_projects: recentProjects,
            recentProjects,
            suggested_connections: dbSuggestedConnections,
            suggestedConnections: dbSuggestedConnections,
            pending_tasks: pendingTasks,
            pendingTasks,
            upcoming_deadlines: upcomingDeadlines,
            upcomingDeadlines,
            quick_stats: quickStats,
            quickStats,
        });
    }
    catch (err) {
        next(err);
    }
});
// ==========================================
// 2. POST /api/quick-add
// ==========================================
const quickAddSchema = z.object({
    text: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    space: z.enum(['personal', 'shared']).optional().default('personal'),
    categoryId: z.string().nullable().optional(),
});
quickAddRouter.post('/', requireAuth, async (req, res, next) => {
    try {
        const parseResult = quickAddSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({
                error: 'ValidationError',
                message: parseResult.error.errors[0]?.message || 'Input validation failed',
            });
        }
        const { text, title: explicitTitle, description: explicitDesc, space, categoryId } = parseResult.data;
        const currentUser = req.user;
        const now = new Date();
        const rawInput = (text || explicitTitle || '').trim();
        if (!rawInput) {
            return res.status(400).json({
                error: 'ValidationError',
                message: 'Text or title is required for quick-add',
            });
        }
        // Extract hashtags e.g. #synth #ambient
        const hashtagMatches = rawInput.match(/#(\w+)/g) || [];
        const extractedTags = Array.from(new Set(hashtagMatches.map((t) => t.slice(1).toLowerCase().trim()))).filter(Boolean);
        // Resolve title: first line with hashtags stripped
        const lines = rawInput.split(/\r?\n/);
        const firstLine = lines[0];
        let resolvedTitle = firstLine.replace(/#\w+/g, '').trim();
        if (!resolvedTitle) {
            resolvedTitle = explicitTitle ? explicitTitle.trim() : 'Untitled Quick Idea';
        }
        // Remaining lines as description if text provided and multiline
        let resolvedDesc = explicitDesc || '';
        if (lines.length > 1 && !explicitDesc) {
            resolvedDesc = lines.slice(1).join('\n').replace(/#\w+/g, '').trim();
        }
        const projectId = crypto.randomUUID();
        const projectSpace = space || 'personal';
        const visibility = projectSpace === 'shared' ? 'shared' : 'private';
        const [newProject] = await db
            .insert(projects)
            .values({
            id: projectId,
            title: resolvedTitle,
            description: resolvedDesc,
            space: projectSpace,
            visibility,
            ownerId: currentUser.id,
            categoryId: categoryId || null,
            status: 'draft',
            createdAt: now,
            updatedAt: now,
        })
            .returning();
        // Attach tags
        const savedTags = [];
        for (const tagName of extractedTags) {
            const normalized = normalizeTagName(tagName);
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
        // Sync search index if available
        try {
            await searchIndexManager.indexProject(newProject.id);
        }
        catch {
            // Non-blocking index sync
        }
        return res.status(201).json({
            project: {
                ...newProject,
                tags: savedTags,
            },
            title: resolvedTitle,
            tags: extractedTags,
            message: 'Quick-add project created successfully',
        });
    }
    catch (err) {
        next(err);
    }
});
