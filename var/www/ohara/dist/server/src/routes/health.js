import { Router } from 'express';
import { sqlite } from '../db/index.js';
export const healthRouter = Router();
healthRouter.get('/', (req, res) => {
    const mem = process.memoryUsage();
    const rssMB = Math.round((mem.rss / (1024 * 1024)) * 100) / 100;
    const heapUsedMB = Math.round((mem.heapUsed / (1024 * 1024)) * 100) / 100;
    const heapTotalMB = Math.round((mem.heapTotal / (1024 * 1024)) * 100) / 100;
    let dbConnected = false;
    try {
        const result = sqlite.prepare('SELECT 1 as alive').get();
        dbConnected = result?.alive === 1;
    }
    catch {
        dbConnected = false;
    }
    const memoryHealthy = rssMB < 250;
    res.status(dbConnected ? 200 : 503).json({
        status: dbConnected ? 'ok' : 'degraded',
        uptime: Math.round(process.uptime()),
        memory: {
            rssMB,
            heapUsedMB,
            heapTotalMB,
            limitMB: 250,
            belowLimit: memoryHealthy,
        },
        database: {
            connected: dbConnected,
            mode: 'WAL',
        },
        timestamp: new Date().toISOString(),
    });
});
