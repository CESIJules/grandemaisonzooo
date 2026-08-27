import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { users, sessions } from '../db/schema.js';
import { config } from '../config.js';
import { requireAuth } from '../middleware/auth.js';
export const authRouter = Router();
const registerSchema = z.object({
    email: z.string().email('Invalid email address').trim().toLowerCase(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    name: z.string().min(1, 'Name is required').max(100, 'Name cannot exceed 100 characters').trim(),
});
const loginSchema = z.object({
    email: z.string().min(1, 'Username or Email is required').trim().toLowerCase(),
    password: z.string().min(1, 'Password is required'),
});
// POST /api/auth/register
authRouter.post('/register', async (req, res, next) => {
    try {
        const parseResult = registerSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({
                error: 'ValidationError',
                message: parseResult.error.errors[0]?.message || 'Input validation failed',
                details: parseResult.error.errors,
            });
        }
        const { email, password, name } = parseResult.data;
        // Check if email is already registered
        const existing = await db.query.users.findFirst({
            where: eq(users.email, email),
        });
        if (existing) {
            return res.status(409).json({ error: 'ConflictError', message: 'Email already registered' });
        }
        // Check if this is the first user (assign admin)
        const userCountResult = await db.select({ count: sql `count(*)` }).from(users);
        const isFirstUser = (userCountResult[0]?.count ?? 0) === 0;
        const role = isFirstUser ? 'admin' : 'member';
        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);
        const userId = crypto.randomUUID();
        const now = new Date();
        const [newUser] = await db
            .insert(users)
            .values({
            id: userId,
            email,
            passwordHash,
            name,
            role,
            createdAt: now,
        })
            .returning();
        // Create session
        const sessionId = crypto.randomUUID();
        const sessionToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await db.insert(sessions).values({
            id: sessionId,
            userId,
            token: sessionToken,
            expiresAt,
        });
        // Create JWT
        const token = jwt.sign({ userId, email, role, sessionId }, config.JWT_SECRET, { expiresIn: '30d' });
        // Set cookie
        res.cookie('session_token', sessionToken, {
            httpOnly: true,
            secure: config.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000,
            path: '/',
        });
        return res.status(201).json({
            user: {
                id: newUser.id,
                email: newUser.email,
                name: newUser.name,
                avatar: newUser.avatar,
                role: newUser.role,
                createdAt: newUser.createdAt,
            },
            token,
        });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/auth/validate-artist
// Delegation validation point for Nginx auth_request basic auth
authRouter.get('/validate-artist', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Basic ')) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Ohara Artist Area"');
        return res.status(401).send('Non autorise');
    }
    const base64 = authHeader.substring(6);
    const credentials = Buffer.from(base64, 'base64').toString('ascii');
    const [username, ...passwordParts] = credentials.split(':');
    const password = passwordParts.join(':');
    if (!username || !password) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Ohara Artist Area"');
        return res.status(401).send('Non autorise');
    }
    try {
        const usersPath = '/var/www/users.json';
        if (!fs.existsSync(usersPath)) {
            console.warn(`Users file not found at ${usersPath}`);
            return res.status(401).send('Non autorise');
        }
        const fileContent = fs.readFileSync(usersPath, 'utf8');
        const usersData = JSON.parse(fileContent);
        // Case-insensitive username lookup
        const key = Object.keys(usersData).find((u) => u.toLowerCase() === username.toLowerCase());
        if (!key) {
            res.setHeader('WWW-Authenticate', 'Basic realm="Ohara Artist Area"');
            return res.status(401).send('Identifiants incorrects');
        }
        const extUser = usersData[key];
        // Normalize PHP bcrypt prefix $2y$ -> $2b$
        const hash = extUser.password_hash.replace(/^\$2y\$/, '$2b$');
        const valid = await bcrypt.compare(password, hash);
        if (!valid) {
            res.setHeader('WWW-Authenticate', 'Basic realm="Ohara Artist Area"');
            return res.status(401).send('Identifiants incorrects');
        }
        return res.status(200).send('OK');
    }
    catch (err) {
        console.error('Error in validate-artist route:', err);
        return res.status(500).send('Erreur interne');
    }
});
// POST /api/auth/login
authRouter.post('/login', async (req, res, next) => {
    try {
        const parseResult = loginSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({
                error: 'ValidationError',
                message: parseResult.error.errors[0]?.message || 'Input validation failed',
                details: parseResult.error.errors,
            });
        }
        const { email: emailOrUsername, password } = parseResult.data;
        let user = await db.query.users.findFirst({
            where: eq(users.email, emailOrUsername),
        });
        // If not found in SQLite db, check /var/www/users.json
        if (!user) {
            const usersPath = '/var/www/users.json';
            if (fs.existsSync(usersPath)) {
                try {
                    const fileContent = fs.readFileSync(usersPath, 'utf8');
                    const usersData = JSON.parse(fileContent);
                    const key = Object.keys(usersData).find((u) => u.toLowerCase() === emailOrUsername.toLowerCase());
                    if (key) {
                        const extUser = usersData[key];
                        const hash = extUser.password_hash.replace(/^\$2y\$/, '$2b$');
                        const valid = await bcrypt.compare(password, hash);
                        if (valid) {
                            const userId = crypto.randomUUID();
                            const now = new Date();
                            const email = emailOrUsername.includes('@') ? emailOrUsername : `${key}@grandemaisonzoo.com`;
                            const [createdUser] = await db
                                .insert(users)
                                .values({
                                id: userId,
                                email,
                                passwordHash: extUser.password_hash,
                                name: key,
                                role: extUser.role === 'admin' ? 'admin' : 'member',
                                createdAt: now,
                            })
                                .returning();
                            user = createdUser;
                        }
                    }
                }
                catch (extErr) {
                    console.error('Error verifying external user:', extErr);
                }
            }
        }
        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Identifiants incorrects' });
        }
        // Create session
        const sessionId = crypto.randomUUID();
        const sessionToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await db.insert(sessions).values({
            id: sessionId,
            userId: user.id,
            token: sessionToken,
            expiresAt,
        });
        // Create JWT
        const token = jwt.sign({ userId: user.id, email: user.email, role: user.role, sessionId }, config.JWT_SECRET, { expiresIn: '30d' });
        // Set cookie
        res.cookie('session_token', sessionToken, {
            httpOnly: true,
            secure: config.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000,
            path: '/',
        });
        return res.status(200).json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatar: user.avatar,
                role: user.role,
                createdAt: user.createdAt,
            },
            token,
        });
    }
    catch (err) {
        next(err);
    }
});
// POST /api/auth/logout
authRouter.post('/logout', async (req, res, next) => {
    try {
        const cookieToken = req.cookies?.session_token || req.signedCookies?.session_token;
        if (cookieToken) {
            await db.delete(sessions).where(eq(sessions.token, cookieToken));
        }
        if (req.sessionId) {
            await db.delete(sessions).where(eq(sessions.id, req.sessionId));
        }
        res.clearCookie('session_token', { path: '/' });
        return res.status(200).json({ message: 'Logged out successfully' });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/auth/me
authRouter.get('/me', requireAuth, (req, res) => {
    return res.status(200).json({ user: req.user });
});
// PATCH /api/auth/profile
const updateProfileSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100).trim().optional(),
    avatar: z.string().nullable().optional(),
});
authRouter.patch('/profile', requireAuth, async (req, res, next) => {
    try {
        const parseResult = updateProfileSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({
                error: 'ValidationError',
                message: parseResult.error.errors[0]?.message || 'Input validation failed',
            });
        }
        const { name, avatar } = parseResult.data;
        const updates = {};
        if (name !== undefined)
            updates.name = name;
        if (avatar !== undefined)
            updates.avatar = avatar;
        const [updatedUser] = await db
            .update(users)
            .set(updates)
            .where(eq(users.id, req.user.id))
            .returning();
        return res.status(200).json({
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                name: updatedUser.name,
                avatar: updatedUser.avatar,
                role: updatedUser.role,
                createdAt: updatedUser.createdAt,
            },
        });
    }
    catch (err) {
        next(err);
    }
});
