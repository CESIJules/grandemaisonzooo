import path from 'node:path';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { projectsRouter } from './routes/projects.js';
import { blocksRouter, projectBlocksRouter } from './routes/blocks.js';
import { categoriesRouter } from './routes/categories.js';
import { tagsRouter } from './routes/tags.js';
import { discoveryRouter } from './routes/discovery.js';
import { searchRouter } from './routes/search.js';
import { graphRouter } from './routes/graph.js';
import { dashboardRouter, quickAddRouter } from './routes/dashboard.js';
import { kanbanRouter, projectKanbanRouter } from './routes/kanban.js';
import { calendarRouter } from './routes/calendar.js';
import { portabilityRouter } from './routes/portability.js';
import { tasksRouter } from './routes/tasks.js';
import { errorHandler } from './middleware/errorHandler.js';
export function createApp() {
    const app = express();
    // 1. CORS Middleware
    app.use(cors({
        origin: (origin, callback) => {
            if (!origin || origin === config.CLIENT_ORIGIN || origin.startsWith('http://localhost:')) {
                callback(null, true);
            }
            else {
                callback(null, true);
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cookie'],
    }));
    // 2. Cookie Parser with Secret
    app.use(cookieParser(config.COOKIE_SECRET));
    // 3. Body Parsers (10MB payload limit for rich media, canvas data)
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    // 4. Request Logging (disabled in test)
    if (config.NODE_ENV !== 'test') {
        app.use((req, res, next) => {
            const start = Date.now();
            res.on('finish', () => {
                const duration = Date.now() - start;
                console.log(`[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
            });
            next();
        });
    }
    // 5. Mount Feature Routers
    app.use('/api/health', healthRouter);
    app.use('/api/auth', authRouter);
    app.use('/api/projects/:projectId/kanban', projectKanbanRouter);
    app.use('/api/projects/:projectId/blocks', projectBlocksRouter);
    app.use('/api/projects', portabilityRouter);
    app.use('/api/projects', projectsRouter);
    app.use('/api/kanban', kanbanRouter);
    app.use('/api/blocks', blocksRouter);
    app.use('/api/categories', categoriesRouter);
    app.use('/api/tags', tagsRouter);
    app.use('/api/discovery', discoveryRouter);
    app.use('/api/search', searchRouter);
    app.use('/api/graph', graphRouter);
    app.use('/api/dashboard', dashboardRouter);
    app.use('/api/quick-add', quickAddRouter);
    app.use('/api/calendar', calendarRouter);
    app.use('/api/tasks', tasksRouter);
    // Serve uploads folder statically (mainly for local development parity)
    app.use('/uploads', express.static(path.join(config.PROJECT_ROOT, 'uploads')));
    // 6. 404 Handler for Unmatched API Endpoints
    app.use('/api/*', (req, res) => {
        res.status(404).json({
            error: 'NotFound',
            message: `API endpoint ${req.method} ${req.originalUrl} does not exist`,
            statusCode: 404,
        });
    });
    // 7. Global Centralized Error Handler
    app.use(errorHandler);
    return app;
}
