import jwt from 'jsonwebtoken';
import { eq, and, gt } from 'drizzle-orm';
import fs from 'node:fs';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db } from '../db/index.js';
import { users, sessions } from '../db/schema.js';
import { config } from '../config.js';
export async function authenticate(req) {
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.session_token || req.signedCookies?.session_token;
    // 1. Try Bearer JWT Header
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7).trim();
        try {
            const decoded = jwt.verify(token, config.JWT_SECRET);
            const user = await db.query.users.findFirst({
                where: eq(users.id, decoded.userId),
                columns: { id: true, email: true, name: true, avatar: true, role: true, createdAt: true },
            });
            if (user) {
                req.user = user;
                req.sessionId = decoded.sessionId;
                return true;
            }
        }
        catch {
            // Invalid or expired JWT; fall through to cookie
        }
    }
    // 2. Try Session Cookie
    if (cookieToken) {
        try {
            const session = await db.query.sessions.findFirst({
                where: and(eq(sessions.token, cookieToken), gt(sessions.expiresAt, new Date())),
            });
            if (session) {
                const user = await db.query.users.findFirst({
                    where: eq(users.id, session.userId),
                    columns: { id: true, email: true, name: true, avatar: true, role: true, createdAt: true },
                });
                if (user) {
                    req.user = user;
                    req.sessionId = session.id;
                    return true;
                }
            }
        }
        catch {
            // Session lookup failed
        }
    }
    // 3. Try Basic Auth Header (Forwarded from Nginx/Browser caching)
    if (authHeader && authHeader.startsWith('Basic ')) {
        try {
            const base64 = authHeader.substring(6);
            const credentials = Buffer.from(base64, 'base64').toString('ascii');
            const [username, ...passwordParts] = credentials.split(':');
            const password = passwordParts.join(':');
            if (username && password) {
                const usersPath = '/var/www/users.json';
                if (fs.existsSync(usersPath)) {
                    const fileContent = fs.readFileSync(usersPath, 'utf8');
                    const usersData = JSON.parse(fileContent);
                    const key = Object.keys(usersData).find((u) => u.toLowerCase() === username.toLowerCase());
                    if (key) {
                        const extUser = usersData[key];
                        const hash = extUser.password_hash.replace(/^\$2y\$/, '$2b$');
                        const valid = await bcrypt.compare(password, hash);
                        if (valid) {
                            const email = username.includes('@') ? username : `${key}@grandemaisonzoo.com`;
                            let dbUser = await db.query.users.findFirst({
                                where: eq(users.email, email),
                                columns: { id: true, email: true, name: true, avatar: true, role: true, createdAt: true },
                            });
                            if (!dbUser) {
                                const userId = crypto.randomUUID();
                                const now = new Date();
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
                                dbUser = {
                                    id: createdUser.id,
                                    email: createdUser.email,
                                    name: createdUser.name,
                                    avatar: createdUser.avatar,
                                    role: createdUser.role,
                                    createdAt: createdUser.createdAt,
                                };
                            }
                            const sessionId = crypto.randomUUID();
                            const sessionToken = crypto.randomBytes(32).toString('hex');
                            const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                            await db.insert(sessions).values({
                                id: sessionId,
                                userId: dbUser.id,
                                token: sessionToken,
                                expiresAt,
                            });
                            if (req.res) {
                                req.res.cookie('session_token', sessionToken, {
                                    httpOnly: true,
                                    secure: config.NODE_ENV === 'production',
                                    sameSite: 'lax',
                                    maxAge: 30 * 24 * 60 * 60 * 1000,
                                    path: '/',
                                });
                            }
                            req.user = dbUser;
                            req.sessionId = sessionId;
                            return true;
                        }
                    }
                }
            }
        }
        catch (e) {
            console.error('Basic Auth verification failed:', e);
        }
    }
    return false;
}
export async function requireAuth(req, res, next) {
    if (!req.user) {
        const isAuthenticated = await authenticate(req);
        if (!isAuthenticated || !req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
    }
    next();
}
export async function optionalAuth(req, res, next) {
    if (!req.user) {
        await authenticate(req);
    }
    next();
}
export async function requireAdmin(req, res, next) {
    if (!req.user) {
        const isAuthenticated = await authenticate(req);
        if (!isAuthenticated || !req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
    }
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}
