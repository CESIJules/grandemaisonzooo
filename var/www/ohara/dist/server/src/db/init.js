import { initDb, sqlite } from './index.js';
console.log('[DB] Initializing database schema...');
initDb(sqlite);
console.log('[DB] Database schema initialized successfully.');
