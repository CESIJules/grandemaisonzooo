import { Router } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { tasks, taskTags, tags } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { z } from 'zod';
export const tasksRouter = Router();
// Apply auth middleware to all tasks routes
tasksRouter.use(requireAuth);
const createTaskSchema = z.object({
    title: z.string().min(1, 'Title is required').trim(),
    content: z.string().default(''),
    completed: z.boolean().default(false),
    categoryId: z.string().nullable().optional(),
    projectId: z.string().nullable().optional(),
    parentId: z.string().nullable().optional(),
    tags: z.array(z.string()).optional(),
});
const updateTaskSchema = z.object({
    title: z.string().min(1).trim().optional(),
    content: z.string().optional(),
    completed: z.boolean().optional(),
    categoryId: z.string().nullable().optional(),
    projectId: z.string().nullable().optional(),
    parentId: z.string().nullable().optional(),
    tags: z.array(z.string()).optional(),
});
// GET /api/tasks
tasksRouter.get('/', async (req, res, next) => {
    try {
        const userTasks = await db.query.tasks.findMany({
            where: eq(tasks.ownerId, req.user.id),
            with: {
                category: true,
                project: true,
                parentTask: true,
                subTasks: true,
                taskTags: {
                    with: {
                        tag: true,
                    },
                },
            },
            orderBy: (tasks, { desc }) => [desc(tasks.createdAt)],
        });
        // Format response to easily match tags in frontend
        const formatted = userTasks.map((t) => {
            const { taskTags, ...taskData } = t;
            return {
                ...taskData,
                tags: taskTags.map((tt) => tt.tag),
            };
        });
        return res.status(200).json({ tasks: formatted });
    }
    catch (err) {
        next(err);
    }
});
// POST /api/tasks
tasksRouter.post('/', async (req, res, next) => {
    try {
        const parseResult = createTaskSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({
                error: 'ValidationError',
                message: parseResult.error.errors[0]?.message || 'Input validation failed',
            });
        }
        const { title, content, completed, categoryId, projectId, parentId, tags: tagNames } = parseResult.data;
        // Create task
        const [newTask] = await db
            .insert(tasks)
            .values({
            title,
            content,
            completed,
            ownerId: req.user.id,
            categoryId: categoryId || null,
            projectId: projectId || null,
            parentId: parentId || null,
        })
            .returning();
        // Associate tags if provided
        if (tagNames && tagNames.length > 0) {
            for (const tagName of tagNames) {
                // Find or create tag
                let tagRecord = await db.query.tags.findFirst({
                    where: eq(tags.name, tagName.trim()),
                });
                if (!tagRecord) {
                    const [newTag] = await db
                        .insert(tags)
                        .values({ name: tagName.trim() })
                        .returning();
                    tagRecord = newTag;
                }
                await db.insert(taskTags).values({
                    taskId: newTask.id,
                    tagId: tagRecord.id,
                });
            }
        }
        // Retrieve fully loaded created task
        const loadedTask = await db.query.tasks.findFirst({
            where: eq(tasks.id, newTask.id),
            with: {
                category: true,
                project: true,
                parentTask: true,
                subTasks: true,
                taskTags: {
                    with: {
                        tag: true,
                    },
                },
            },
        });
        if (!loadedTask) {
            return res.status(500).json({ error: 'InternalError', message: 'Failed to retrieve created task' });
        }
        const { taskTags: tt, ...taskData } = loadedTask;
        return res.status(201).json({
            task: {
                ...taskData,
                tags: tt.map((item) => item.tag),
            },
        });
    }
    catch (err) {
        next(err);
    }
});
// PATCH /api/tasks/:id
tasksRouter.patch('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const parseResult = updateTaskSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({
                error: 'ValidationError',
                message: parseResult.error.errors[0]?.message || 'Input validation failed',
            });
        }
        const existingTask = await db.query.tasks.findFirst({
            where: and(eq(tasks.id, id), eq(tasks.ownerId, req.user.id)),
        });
        if (!existingTask) {
            return res.status(404).json({ error: 'NotFoundError', message: 'Task not found' });
        }
        const { title, content, completed, categoryId, projectId, parentId, tags: tagNames } = parseResult.data;
        const updates = {};
        if (title !== undefined)
            updates.title = title;
        if (content !== undefined)
            updates.content = content;
        if (completed !== undefined)
            updates.completed = completed;
        if (categoryId !== undefined)
            updates.categoryId = categoryId;
        if (projectId !== undefined)
            updates.projectId = projectId;
        if (parentId !== undefined)
            updates.parentId = parentId;
        updates.updatedAt = new Date();
        await db.update(tasks).set(updates).where(eq(tasks.id, id));
        // Update tags if provided
        if (tagNames !== undefined) {
            // Clear existing associations
            await db.delete(taskTags).where(eq(taskTags.taskId, id));
            if (tagNames.length > 0) {
                for (const tagName of tagNames) {
                    let tagRecord = await db.query.tags.findFirst({
                        where: eq(tags.name, tagName.trim()),
                    });
                    if (!tagRecord) {
                        const [newTag] = await db
                            .insert(tags)
                            .values({ name: tagName.trim() })
                            .returning();
                        tagRecord = newTag;
                    }
                    await db.insert(taskTags).values({
                        taskId: id,
                        tagId: tagRecord.id,
                    });
                }
            }
        }
        // Retrieve fully loaded updated task
        const loadedTask = await db.query.tasks.findFirst({
            where: eq(tasks.id, id),
            with: {
                category: true,
                project: true,
                parentTask: true,
                subTasks: true,
                taskTags: {
                    with: {
                        tag: true,
                    },
                },
            },
        });
        if (!loadedTask) {
            return res.status(404).json({ error: 'NotFoundError', message: 'Task not found' });
        }
        const { taskTags: tt, ...taskData } = loadedTask;
        return res.status(200).json({
            task: {
                ...taskData,
                tags: tt.map((item) => item.tag),
            },
        });
    }
    catch (err) {
        next(err);
    }
});
// DELETE /api/tasks/:id
tasksRouter.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const existingTask = await db.query.tasks.findFirst({
            where: and(eq(tasks.id, id), eq(tasks.ownerId, req.user.id)),
        });
        if (!existingTask) {
            return res.status(404).json({ error: 'NotFoundError', message: 'Task not found' });
        }
        // Delete task (will cascade delete sub-tasks due to foreign key onDelete: cascade)
        await db.delete(tasks).where(eq(tasks.id, id));
        return res.status(200).json({ success: true, message: 'Task deleted successfully' });
    }
    catch (err) {
        next(err);
    }
});
