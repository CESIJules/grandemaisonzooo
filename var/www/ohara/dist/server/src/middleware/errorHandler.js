import { config } from '../config.js';
export function errorHandler(err, req, res, next) {
    let statusCode = err.status || err.statusCode || 500;
    let message = err.message || 'Internal Server Error';
    let errorType = err.name || 'Error';
    let details = err.details || undefined;
    // Handle SQLite constraint violations
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE' || (err.message && err.message.includes('UNIQUE constraint failed'))) {
        statusCode = 409;
        errorType = 'ConflictError';
        message = 'A record with this unique value already exists';
    }
    else if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY' || (err.message && err.message.includes('FOREIGN KEY constraint failed'))) {
        statusCode = 400;
        errorType = 'ForeignKeyViolation';
        message = 'Referenced foreign record does not exist';
    }
    // Handle Zod validation errors
    if (err.name === 'ZodError' || (err.errors && Array.isArray(err.errors))) {
        statusCode = 400;
        errorType = 'ValidationError';
        message = 'Input validation failed';
        details = err.errors;
    }
    if (config.NODE_ENV !== 'test' && statusCode === 500) {
        console.error('[Unhandled Error]:', err);
    }
    res.status(statusCode).json({
        error: errorType,
        message,
        ...(details ? { details } : {}),
        statusCode,
    });
}
