import { createApp } from './app.js';
import { config } from './config.js';
import { initDb, sqlite } from './db/index.js';
import { WebSocketHub } from './ws/hub.js';
// 1. Initialize SQLite Database Schema
console.log('[Startup] Initializing SQLite database schema...');
initDb(sqlite);
console.log('[Startup] SQLite database schema ready.');
// 2. Create Express App
const app = createApp();
// 3. Start HTTP Server
const server = app.listen(config.PORT, () => {
    console.log(`[Server] La Grande Bibliothèque API server listening on http://localhost:${config.PORT}`);
    console.log(`[Server] Health check endpoint: http://localhost:${config.PORT}/api/health`);
    console.log(`[Server] WebSocket collaboration endpoint: ws://localhost:${config.PORT}/ws`);
});
// 4. Initialize WebSocket Hub
const wsHub = new WebSocketHub(server);
// 5. Graceful Shutdown Handler
function shutdown() {
    console.log('[Server] Gracefully shutting down...');
    wsHub.close();
    server.close(() => {
        sqlite.close();
        console.log('[Server] Closed database connection, WebSocket hub, and HTTP listener.');
        process.exit(0);
    });
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
