import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import * as schema from './schema.js';
import { config } from '../config.js';
export const DDL_SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    avatar TEXT,
    role TEXT NOT NULL DEFAULT 'member',
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#6366f1',
    description TEXT DEFAULT '',
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    space TEXT NOT NULL DEFAULT 'personal',
    visibility TEXT NOT NULL DEFAULT 'private',
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active',
    due_date INTEGER,
    canvas_pan_x REAL NOT NULL DEFAULT 0,
    canvas_pan_y REAL NOT NULL DEFAULT 0,
    canvas_zoom REAL NOT NULL DEFAULT 1.0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS project_tags (
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (project_id, tag_id)
  );

  CREATE TABLE IF NOT EXISTS blocks (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '{}',
    "order" INTEGER NOT NULL DEFAULT 0,
    canvas_x REAL,
    canvas_y REAL,
    canvas_w REAL,
    canvas_h REAL,
    canvas_z INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS connections (
    id TEXT PRIMARY KEY NOT NULL,
    source_project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    target_project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    score REAL NOT NULL DEFAULT 0.0,
    reason TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'suggested',
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS kanban_columns (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS kanban_cards (
    id TEXT PRIMARY KEY NOT NULL,
    column_id TEXT NOT NULL REFERENCES kanban_columns(id) ON DELETE CASCADE,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,
    assigned_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    due_date INTEGER
  );

  CREATE TABLE IF NOT EXISTS calendar_events (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    start_date INTEGER NOT NULL,
    end_date INTEGER,
    all_day INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    completed INTEGER NOT NULL DEFAULT 0,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
    parent_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS task_tags (
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, tag_id)
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
  CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);
  CREATE INDEX IF NOT EXISTS idx_projects_space ON projects(space);
  CREATE INDEX IF NOT EXISTS idx_projects_owner_space ON projects(owner_id, space);
  CREATE INDEX IF NOT EXISTS idx_projects_category_id ON projects(category_id);
  CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
  CREATE INDEX IF NOT EXISTS idx_project_tags_project_id ON project_tags(project_id);
  CREATE INDEX IF NOT EXISTS idx_project_tags_tag_id ON project_tags(tag_id);
  CREATE INDEX IF NOT EXISTS idx_blocks_project_id ON blocks(project_id);
  CREATE INDEX IF NOT EXISTS idx_blocks_order ON blocks("order");
  CREATE INDEX IF NOT EXISTS idx_connections_source ON connections(source_project_id);
  CREATE INDEX IF NOT EXISTS idx_connections_target ON connections(target_project_id);
  CREATE INDEX IF NOT EXISTS idx_connections_status ON connections(status);
  CREATE INDEX IF NOT EXISTS idx_kanban_columns_project_id ON kanban_columns(project_id);
  CREATE INDEX IF NOT EXISTS idx_kanban_cards_column_id ON kanban_cards(column_id);
  CREATE INDEX IF NOT EXISTS idx_kanban_cards_project_id ON kanban_cards(project_id);
  CREATE INDEX IF NOT EXISTS idx_calendar_events_project_id ON calendar_events(project_id);
  CREATE INDEX IF NOT EXISTS idx_calendar_events_start_date ON calendar_events(start_date);
  CREATE INDEX IF NOT EXISTS idx_tasks_owner_id ON tasks(owner_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_category_id ON tasks(category_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_id);
  CREATE INDEX IF NOT EXISTS idx_task_tags_task_id ON task_tags(task_id);
  CREATE INDEX IF NOT EXISTS idx_task_tags_tag_id ON task_tags(tag_id);
`;
const dbPath = config.DATABASE_PATH;
if (dbPath !== ':memory:') {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}
export const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');
sqlite.pragma('synchronous = NORMAL');
sqlite.pragma('cache_size = -64000');
sqlite.pragma('temp_store = MEMORY');
sqlite.pragma('mmap_size = 268435456');
sqlite.pragma('busy_timeout = 5000');
export const db = drizzle(sqlite, { schema });
export function initDb(targetSqlite = sqlite) {
    targetSqlite.pragma('foreign_keys = ON');
    targetSqlite.exec(DDL_SCHEMA);
    // Dynamic migration for projects table parent_id (V4 subprojects)
    try {
        const tableInfo = targetSqlite.pragma("table_info(projects)");
        if (tableInfo && tableInfo.length > 0) {
            const hasParentId = tableInfo.some((col) => col.name === 'parent_id');
            if (!hasParentId) {
                console.log('[DB Migration] Adding parent_id column to projects table...');
                targetSqlite.exec('ALTER TABLE projects ADD COLUMN parent_id TEXT REFERENCES projects(id) ON DELETE CASCADE;');
                console.log('[DB Migration] parent_id column added successfully.');
            }
        }
        // Always ensure the index exists (safe even if column was added in a prior run)
        targetSqlite.exec('CREATE INDEX IF NOT EXISTS idx_projects_parent_id ON projects(parent_id);');
    }
    catch (err) {
        console.error('[DB Migration] Failed to alter projects table:', err);
    }
    // Dynamic migration for users table avatar
    try {
        const userTableInfo = targetSqlite.pragma("table_info(users)");
        if (userTableInfo && userTableInfo.length > 0) {
            const hasAvatar = userTableInfo.some((col) => col.name === 'avatar');
            if (!hasAvatar) {
                console.log('[DB Migration] Adding avatar column to users table...');
                targetSqlite.exec('ALTER TABLE users ADD COLUMN avatar TEXT;');
                console.log('[DB Migration] avatar column added successfully.');
            }
        }
    }
    catch (err) {
        console.error('[DB Migration] Failed to alter users table:', err);
    }
}
// Automatically instantiate non-destructive schema on import
initDb(sqlite);
export function createTestDb() {
    const memSqlite = new Database(':memory:');
    memSqlite.pragma('foreign_keys = ON');
    initDb(memSqlite);
    const testDb = drizzle(memSqlite, { schema });
    return { db: testDb, sqlite: memSqlite };
}
