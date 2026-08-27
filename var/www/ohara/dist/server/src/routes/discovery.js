/**
 * Discovery REST API Routes
 * La Grande Bibliothèque — Milestone 3
 *
 * Provides endpoints for algorithmic tag suggestions, project connection recommendations,
 * and connection status management (accept / dismiss).
 */
import { Router } from 'express';
import crypto from 'node:crypto';
import { eq, or, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { connections } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { searchIndexManager } from './searchIndex.js';
import { TagCooccurrenceMatrix } from '../algorithms/tagCooccurrence.js';
import { discoverConnections } from '../algorithms/connectionScorer.js';
export const discoveryRouter = Router();
// ==========================================
// 1. GET /api/discovery/suggested-tags/:projectId
// ==========================================
discoveryRouter.get('/suggested-tags/:projectId', requireAuth, async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const currentUser = req.user;
        await searchIndexManager.ensureInitialized();
        const targetProject = searchIndexManager.getProject(projectId);
        if (!targetProject) {
            return res.status(404).json({ error: 'NotFound', message: 'Project not found' });
        }
        // Strict IDOR protection: Private personal project belonging to another user
        if (targetProject.space === 'personal' && targetProject.ownerId !== currentUser.id) {
            return res.status(404).json({ error: 'NotFound', message: 'Project not found' });
        }
        // Blank project guard: zero content, zero tags
        if (!targetProject.title &&
            !targetProject.description &&
            targetProject.tagNames.length === 0 &&
            targetProject.blocks.length === 0) {
            return res.status(200).json({ suggestions: [] });
        }
        // Retrieve accessible projects for current user
        const accessibleProjects = searchIndexManager.getAccessibleProjects(currentUser.id);
        // Build Tag Co-occurrence Matrix from accessible projects
        const tagCooccurrence = new TagCooccurrenceMatrix();
        tagCooccurrence.buildMatrix(accessibleProjects.map((p) => ({ id: p.id, tags: p.tagNames })));
        const corpusProjects = accessibleProjects.map((p) => ({
            id: p.id,
            tags: p.tagNames,
            text: p.fullText,
        }));
        const suggestions = tagCooccurrence.suggestTags({
            targetProjectId: targetProject.id,
            existingTags: targetProject.tagNames,
            projectText: targetProject.fullText,
            corpusProjects,
            topK: 5,
        });
        return res.status(200).json({
            suggestions: suggestions.map((s) => ({
                tag: s.tag,
                score: s.score,
                reason: s.reason,
            })),
        });
    }
    catch (err) {
        next(err);
    }
});
// ==========================================
// 2. GET /api/discovery/suggested-connections
// ==========================================
discoveryRouter.get('/suggested-connections', requireAuth, async (req, res, next) => {
    try {
        const currentUser = req.user;
        const filterProjectId = req.query.projectId;
        await searchIndexManager.ensureInitialized();
        const accessible = searchIndexManager.getAccessibleProjects(currentUser.id);
        if (accessible.length <= 1) {
            return res.status(200).json({ suggestions: [] });
        }
        // Query existing connections from database
        const dbConnections = await db.query.connections.findMany();
        const projectsList = accessible.map((p) => ({
            id: p.id,
            title: p.title,
            description: p.description,
            space: p.space,
            visibility: p.visibility,
            ownerId: p.ownerId,
            categoryId: p.categoryId,
            categoryName: p.category ? p.category.name : undefined,
            tags: p.tagNames,
            body: p.blocks.map((b) => b.text).join(' '),
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
        }));
        let rawSuggestions = discoverConnections(projectsList, dbConnections.map((c) => ({
            id: c.id,
            sourceProjectId: c.sourceProjectId,
            targetProjectId: c.targetProjectId,
            status: c.status,
        })), {
            minScore: 0.25,
            limit: 50,
            currentUserId: currentUser.id,
        });
        // If filterProjectId provided, filter for connections involving that project
        if (filterProjectId) {
            rawSuggestions = rawSuggestions.filter((c) => c.sourceProjectId === filterProjectId || c.targetProjectId === filterProjectId);
        }
        // Upsert discovered suggestions into the DB connections table if not existing
        const existingDbMap = new Map();
        for (const c of dbConnections) {
            existingDbMap.set(`${c.sourceProjectId}_${c.targetProjectId}`, c);
            existingDbMap.set(`${c.targetProjectId}_${c.sourceProjectId}`, c);
        }
        const suggestions = [];
        for (const s of rawSuggestions) {
            const key = `${s.sourceProjectId}_${s.targetProjectId}`;
            const existing = existingDbMap.get(key);
            let connectionId = existing?.id;
            let createdAt = existing?.createdAt || new Date();
            if (!existing) {
                connectionId = crypto.randomUUID();
                await db.insert(connections).values({
                    id: connectionId,
                    sourceProjectId: s.sourceProjectId,
                    targetProjectId: s.targetProjectId,
                    score: s.score,
                    reason: s.reason,
                    status: 'suggested',
                    createdAt,
                });
                existingDbMap.set(key, {
                    id: connectionId,
                    sourceProjectId: s.sourceProjectId,
                    targetProjectId: s.targetProjectId,
                    score: s.score,
                    reason: s.reason,
                    status: 'suggested',
                    createdAt,
                });
            }
            suggestions.push({
                id: connectionId,
                sourceProjectId: s.sourceProjectId,
                targetProjectId: s.targetProjectId,
                sourceProjectTitle: s.sourceProjectTitle,
                targetProjectTitle: s.targetProjectTitle,
                score: s.score,
                reason: s.reason,
                status: 'suggested',
                breakdown: s.breakdown,
                createdAt: createdAt instanceof Date ? createdAt.toISOString() : new Date(createdAt).toISOString(),
            });
        }
        return res.status(200).json({ suggestions });
    }
    catch (err) {
        next(err);
    }
});
// ==========================================
// 3. POST /api/discovery/connections/:id/accept
// ==========================================
discoveryRouter.post('/connections/:id/accept', requireAuth, async (req, res, next) => {
    try {
        const { id } = req.params;
        await searchIndexManager.ensureInitialized();
        let existing = await db.query.connections.findFirst({
            where: eq(connections.id, id),
        });
        if (!existing) {
            // Check if id is composite pair source_target
            const parts = id.split('_');
            if (parts.length === 2) {
                existing = await db.query.connections.findFirst({
                    where: or(and(eq(connections.sourceProjectId, parts[0]), eq(connections.targetProjectId, parts[1])), and(eq(connections.sourceProjectId, parts[1]), eq(connections.targetProjectId, parts[0]))),
                });
            }
        }
        if (!existing) {
            return res.status(404).json({ error: 'NotFound', message: 'Connection not found' });
        }
        const [updated] = await db
            .update(connections)
            .set({ status: 'accepted' })
            .where(eq(connections.id, existing.id))
            .returning();
        return res.status(200).json({
            success: true,
            connection: {
                id: updated.id,
                sourceProjectId: updated.sourceProjectId,
                targetProjectId: updated.targetProjectId,
                score: updated.score,
                reason: updated.reason,
                status: updated.status,
            },
        });
    }
    catch (err) {
        next(err);
    }
});
// ==========================================
// 4. POST /api/discovery/connections/:id/dismiss
// ==========================================
discoveryRouter.post('/connections/:id/dismiss', requireAuth, async (req, res, next) => {
    try {
        const { id } = req.params;
        await searchIndexManager.ensureInitialized();
        let existing = await db.query.connections.findFirst({
            where: eq(connections.id, id),
        });
        if (!existing) {
            const parts = id.split('_');
            if (parts.length === 2) {
                existing = await db.query.connections.findFirst({
                    where: or(and(eq(connections.sourceProjectId, parts[0]), eq(connections.targetProjectId, parts[1])), and(eq(connections.sourceProjectId, parts[1]), eq(connections.targetProjectId, parts[0]))),
                });
            }
        }
        if (!existing) {
            return res.status(404).json({ error: 'NotFound', message: 'Connection not found' });
        }
        const [updated] = await db
            .update(connections)
            .set({ status: 'dismissed' })
            .where(eq(connections.id, existing.id))
            .returning();
        return res.status(200).json({
            success: true,
            connection: {
                id: updated.id,
                sourceProjectId: updated.sourceProjectId,
                targetProjectId: updated.targetProjectId,
                score: updated.score,
                reason: updated.reason,
                status: updated.status,
            },
        });
    }
    catch (err) {
        next(err);
    }
});
