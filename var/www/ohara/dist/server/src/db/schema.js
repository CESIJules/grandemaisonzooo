import { sqliteTable, text, integer, real, primaryKey, index } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
import crypto from 'node:crypto';
// ==========================================
// 1. Users Table
// ==========================================
export const users = sqliteTable('users', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    name: text('name').notNull(),
    avatar: text('avatar'),
    role: text('role', { enum: ['admin', 'member'] }).notNull().default('member'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});
export const usersRelations = relations(users, ({ many }) => ({
    sessions: many(sessions),
    projects: many(projects),
    assignedCards: many(kanbanCards),
}));
// ==========================================
// 2. Sessions Table
// ==========================================
export const sessions = sqliteTable('sessions', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
    userIdIdx: index('idx_sessions_user_id').on(table.userId),
    tokenIdx: index('idx_sessions_token').on(table.token),
}));
export const sessionsRelations = relations(sessions, ({ one }) => ({
    user: one(users, {
        fields: [sessions.userId],
        references: [users.id],
    }),
}));
// ==========================================
// 3. Categories Table
// ==========================================
export const categories = sqliteTable('categories', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text('name').notNull().unique(),
    color: text('color').notNull().default('#6366f1'),
    description: text('description').default(''),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});
export const categoriesRelations = relations(categories, ({ many }) => ({
    projects: many(projects),
}));
// ==========================================
// 4. Tags Table
// ==========================================
export const tags = sqliteTable('tags', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text('name').notNull().unique(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});
export const tagsRelations = relations(tags, ({ many }) => ({
    projectTags: many(projectTags),
}));
// ==========================================
// 5. Projects Table
// ==========================================
export const projects = sqliteTable('projects', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    space: text('space', { enum: ['personal', 'shared'] }).notNull().default('personal'),
    visibility: text('visibility', { enum: ['private', 'shared'] }).notNull().default('private'),
    ownerId: text('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    categoryId: text('category_id').references(() => categories.id, { onDelete: 'set null' }),
    status: text('status', { enum: ['draft', 'active', 'archived'] }).notNull().default('active'),
    dueDate: integer('due_date', { mode: 'timestamp' }),
    canvasPanX: real('canvas_pan_x').notNull().default(0),
    canvasPanY: real('canvas_pan_y').notNull().default(0),
    canvasZoom: real('canvas_zoom').notNull().default(1.0),
    parentId: text('parent_id').references(() => projects.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    ownerIdIdx: index('idx_projects_owner_id').on(table.ownerId),
    spaceIdx: index('idx_projects_space').on(table.space),
    ownerSpaceIdx: index('idx_projects_owner_space').on(table.ownerId, table.space),
    categoryIdIdx: index('idx_projects_category_id').on(table.categoryId),
    statusIdx: index('idx_projects_status').on(table.status),
}));
export const projectsRelations = relations(projects, ({ one, many }) => ({
    owner: one(users, {
        fields: [projects.ownerId],
        references: [users.id],
    }),
    category: one(categories, {
        fields: [projects.categoryId],
        references: [categories.id],
    }),
    projectTags: many(projectTags),
    blocks: many(blocks),
    connectionsAsSource: many(connections, { relationName: 'sourceConnections' }),
    connectionsAsTarget: many(connections, { relationName: 'targetConnections' }),
    kanbanColumns: many(kanbanColumns),
    kanbanCards: many(kanbanCards),
    calendarEvents: many(calendarEvents),
    parentProject: one(projects, {
        fields: [projects.parentId],
        references: [projects.id],
        relationName: 'subProjects',
    }),
    subProjects: many(projects, { relationName: 'subProjects' }),
}));
// ==========================================
// 6. Project Tags Junction Table
// ==========================================
export const projectTags = sqliteTable('project_tags', {
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    tagId: text('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (table) => ({
    pk: primaryKey({ columns: [table.projectId, table.tagId] }),
    projectIdIdx: index('idx_project_tags_project_id').on(table.projectId),
    tagIdIdx: index('idx_project_tags_tag_id').on(table.tagId),
}));
export const projectTagsRelations = relations(projectTags, ({ one }) => ({
    project: one(projects, {
        fields: [projectTags.projectId],
        references: [projects.id],
    }),
    tag: one(tags, {
        fields: [projectTags.tagId],
        references: [tags.id],
    }),
}));
// ==========================================
// 7. Blocks Table
// ==========================================
export const blockTypeEnum = [
    'rich_text',
    'markdown',
    'drawing',
    'checklist',
    'table',
    'media',
    'embed',
    'code',
    'subproject'
];
export const blocks = sqliteTable('blocks', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    type: text('type', { enum: blockTypeEnum }).notNull(),
    content: text('content').notNull().default('{}'),
    order: integer('order').notNull().default(0),
    canvasX: real('canvas_x'),
    canvasY: real('canvas_y'),
    canvasW: real('canvas_w'),
    canvasH: real('canvas_h'),
    canvasZ: integer('canvas_z').default(0),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    projectIdIdx: index('idx_blocks_project_id').on(table.projectId),
    orderIdx: index('idx_blocks_order').on(table.order),
}));
export const blocksRelations = relations(blocks, ({ one }) => ({
    project: one(projects, {
        fields: [blocks.projectId],
        references: [projects.id],
    }),
}));
// ==========================================
// 8. Connections Table
// ==========================================
export const connectionStatusEnum = ['suggested', 'accepted', 'dismissed'];
export const connections = sqliteTable('connections', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    sourceProjectId: text('source_project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    targetProjectId: text('target_project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    score: real('score').notNull().default(0.0),
    reason: text('reason').default(''),
    status: text('status', { enum: connectionStatusEnum }).notNull().default('suggested'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    sourceIdx: index('idx_connections_source').on(table.sourceProjectId),
    targetIdx: index('idx_connections_target').on(table.targetProjectId),
    statusIdx: index('idx_connections_status').on(table.status),
}));
export const connectionsRelations = relations(connections, ({ one }) => ({
    sourceProject: one(projects, {
        fields: [connections.sourceProjectId],
        references: [projects.id],
        relationName: 'sourceConnections',
    }),
    targetProject: one(projects, {
        fields: [connections.targetProjectId],
        references: [projects.id],
        relationName: 'targetConnections',
    }),
}));
// ==========================================
// 9. Kanban Columns Table
// ==========================================
export const kanbanColumns = sqliteTable('kanban_columns', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    order: integer('order').notNull().default(0),
}, (table) => ({
    projectIdIdx: index('idx_kanban_columns_project_id').on(table.projectId),
}));
export const kanbanColumnsRelations = relations(kanbanColumns, ({ one, many }) => ({
    project: one(projects, {
        fields: [kanbanColumns.projectId],
        references: [projects.id],
    }),
    cards: many(kanbanCards),
}));
// ==========================================
// 10. Kanban Cards Table
// ==========================================
export const kanbanCards = sqliteTable('kanban_cards', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    columnId: text('column_id').notNull().references(() => kanbanColumns.id, { onDelete: 'cascade' }),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description').default(''),
    order: integer('order').notNull().default(0),
    assignedUserId: text('assigned_user_id').references(() => users.id, { onDelete: 'set null' }),
    dueDate: integer('due_date', { mode: 'timestamp' }),
}, (table) => ({
    columnIdIdx: index('idx_kanban_cards_column_id').on(table.columnId),
    projectIdIdx: index('idx_kanban_cards_project_id').on(table.projectId),
}));
export const kanbanCardsRelations = relations(kanbanCards, ({ one }) => ({
    column: one(kanbanColumns, {
        fields: [kanbanCards.columnId],
        references: [kanbanColumns.id],
    }),
    project: one(projects, {
        fields: [kanbanCards.projectId],
        references: [projects.id],
    }),
    assignedUser: one(users, {
        fields: [kanbanCards.assignedUserId],
        references: [users.id],
    }),
}));
// ==========================================
// 11. Calendar Events Table
// ==========================================
export const calendarEvents = sqliteTable('calendar_events', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    startDate: integer('start_date', { mode: 'timestamp' }).notNull(),
    endDate: integer('end_date', { mode: 'timestamp' }),
    allDay: integer('all_day', { mode: 'boolean' }).notNull().default(false),
}, (table) => ({
    projectIdIdx: index('idx_calendar_events_project_id').on(table.projectId),
    startDateIdx: index('idx_calendar_events_start_date').on(table.startDate),
}));
export const calendarEventsRelations = relations(calendarEvents, ({ one }) => ({
    project: one(projects, {
        fields: [calendarEvents.projectId],
        references: [projects.id],
    }),
}));
// ==========================================
// 12. Tasks (Notes) Table
// ==========================================
export const tasks = sqliteTable('tasks', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    title: text('title').notNull(),
    content: text('content').notNull().default(''),
    completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
    ownerId: text('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    categoryId: text('category_id').references(() => categories.id, { onDelete: 'set null' }),
    projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
    parentId: text('parent_id').references(() => tasks.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    ownerIdIdx: index('idx_tasks_owner_id').on(table.ownerId),
    categoryIdIdx: index('idx_tasks_category_id').on(table.categoryId),
    projectIdIdx: index('idx_tasks_project_id').on(table.projectId),
    parentIdIdx: index('idx_tasks_parent_id').on(table.parentId),
}));
export const tasksRelations = relations(tasks, ({ one, many }) => ({
    owner: one(users, {
        fields: [tasks.ownerId],
        references: [users.id],
    }),
    category: one(categories, {
        fields: [tasks.categoryId],
        references: [categories.id],
    }),
    project: one(projects, {
        fields: [tasks.projectId],
        references: [projects.id],
    }),
    parentTask: one(tasks, {
        fields: [tasks.parentId],
        references: [tasks.id],
        relationName: 'subTasks',
    }),
    subTasks: many(tasks, { relationName: 'subTasks' }),
    taskTags: many(taskTags),
}));
// ==========================================
// 13. Task Tags Junction Table
// ==========================================
export const taskTags = sqliteTable('task_tags', {
    taskId: text('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
    tagId: text('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (table) => ({
    pk: primaryKey({ columns: [table.taskId, table.tagId] }),
    taskIdIdx: index('idx_task_tags_task_id').on(table.taskId),
    tagIdIdx: index('idx_task_tags_tag_id').on(table.tagId),
}));
export const taskTagsRelations = relations(taskTags, ({ one }) => ({
    task: one(tasks, {
        fields: [taskTags.taskId],
        references: [tasks.id],
    }),
    tag: one(tags, {
        fields: [taskTags.tagId],
        references: [tags.id],
    }),
}));
