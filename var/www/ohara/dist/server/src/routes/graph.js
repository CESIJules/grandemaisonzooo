/**
 * Graph REST API Routes
 * La Grande Bibliothèque — Milestone 4 (Feature 18 & Feature 22: Global & Contextual Nodal Views)
 *
 * Endpoints:
 *   - GET /api/graph/global : Global force-directed graph with degree sizing & Louvain clustering
 *   - GET /api/graph/contextual/:projectId : Contextual ego-network (1-hop & 2-hop ghost nodes)
 */
import { Router } from 'express';
import { eq, or } from 'drizzle-orm';
import { db } from '../db/index.js';
import { connections } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { searchIndexManager } from './searchIndex.js';
import { louvainModularityClustering, computeCentralityAndDegrees, BRAND_CLUSTER_PALETTE, } from '../algorithms/communityLouvain.js';
import { computeCompositeConnectionScore } from '../algorithms/connectionScorer.js';
export const graphRouter = Router();
function safeISO(d) {
    if (!d)
        return new Date().toISOString();
    try {
        const date = d instanceof Date ? d : new Date(d);
        if (isNaN(date.getTime())) {
            const num = Number(d);
            if (!isNaN(num)) {
                const converted = new Date(num > 1e11 ? num / 10000 : num * 1000);
                if (!isNaN(converted.getTime()))
                    return converted.toISOString();
            }
            return new Date().toISOString();
        }
        return date.toISOString();
    }
    catch {
        return new Date().toISOString();
    }
}
// ==========================================
// 1. GET /api/graph/global
// ==========================================
graphRouter.get('/global', requireAuth, async (req, res, next) => {
    try {
        const currentUser = req.user;
        const spaceParam = req.query.space;
        const categoryIdParam = req.query.categoryId;
        const tagParam = req.query.tag;
        await searchIndexManager.ensureInitialized();
        // 1. Get accessible projects respecting privacy boundaries
        let accessible = searchIndexManager.getAccessibleProjects(currentUser.id, spaceParam);
        if (categoryIdParam) {
            accessible = accessible.filter((p) => p.categoryId === categoryIdParam);
        }
        if (tagParam && tagParam.trim()) {
            const normTag = tagParam.trim().toLowerCase();
            accessible = accessible.filter((p) => p.tagNames.includes(normTag));
        }
        if (accessible.length === 0) {
            return res.status(200).json({
                nodes: [],
                edges: [],
                clusters: [],
                modularity: 0,
                stats: { totalNodes: 0, totalEdges: 0, numCommunities: 0 },
            });
        }
        const projectMap = new Map(accessible.map((p) => [p.id, p]));
        const projectIds = accessible.map((p) => p.id);
        // 2. Fetch existing connections from DB
        const dbConnections = await db.query.connections.findMany({
            where: or(eq(connections.status, 'accepted'), eq(connections.status, 'suggested')),
        });
        const edgeMap = new Map();
        // Add accepted / suggested DB connections between accessible projects
        for (const c of dbConnections) {
            if (projectMap.has(c.sourceProjectId) && projectMap.has(c.targetProjectId)) {
                const key = [c.sourceProjectId, c.targetProjectId].sort().join('_');
                const p1 = projectMap.get(c.sourceProjectId);
                const p2 = projectMap.get(c.targetProjectId);
                const sharedTags = p1.tagNames.filter((t) => p2.tagNames.includes(t));
                edgeMap.set(key, {
                    id: c.id,
                    source: c.sourceProjectId,
                    target: c.targetProjectId,
                    score: c.score,
                    similarity: c.score,
                    weight: c.score,
                    reason: c.reason || 'Connected project link',
                    status: c.status,
                    sharedTags,
                });
            }
        }
        // Add Parent-Child hierarchy connections
        for (const p of accessible) {
            if (p.parentId && projectMap.has(p.parentId)) {
                const key = [p.id, p.parentId].sort().join('_');
                if (!edgeMap.has(key)) {
                    const parentProj = projectMap.get(p.parentId);
                    const sharedTags = p.tagNames.filter((t) => parentProj.tagNames.includes(t));
                    edgeMap.set(key, {
                        id: `hierarchy_${key}`,
                        source: p.id,
                        target: p.parentId,
                        score: 0.9,
                        similarity: 0.9,
                        weight: 0.9,
                        reason: 'Relation Parent-Enfant',
                        status: 'accepted',
                        sharedTags,
                    });
                }
            }
        }
        // Add high tag/content overlap links if not already present
        for (let i = 0; i < accessible.length; i++) {
            for (let j = i + 1; j < accessible.length; j++) {
                const p1 = accessible[i];
                const p2 = accessible[j];
                const key = [p1.id, p2.id].sort().join('_');
                if (edgeMap.has(key))
                    continue;
                const sharedTags = p1.tagNames.filter((t) => p2.tagNames.includes(t));
                const unionTags = new Set([...p1.tagNames, ...p2.tagNames]);
                const jaccardTags = unionTags.size > 0 ? sharedTags.length / unionTags.size : 0;
                const sameCategory = Boolean(p1.categoryId && p2.categoryId && p1.categoryId === p2.categoryId);
                if (jaccardTags >= 0.25 || (sharedTags.length >= 2 && sameCategory)) {
                    const simScore = computeCompositeConnectionScore({
                        simCos: jaccardTags,
                        jaccardTags,
                        sameCategory,
                        daysDiff: 0,
                    });
                    if (simScore >= 0.25) {
                        edgeMap.set(key, {
                            id: `sem_${key}`,
                            source: p1.id,
                            target: p2.id,
                            score: simScore,
                            similarity: simScore,
                            weight: simScore,
                            reason: sharedTags.length > 0 ? `Shares tags (${sharedTags.slice(0, 3).join(', ')})` : 'Thematic overlap',
                            status: 'suggested',
                            sharedTags,
                        });
                    }
                }
            }
        }
        const edges = Array.from(edgeMap.values());
        // 3. Compute node degrees and hub centrality scores
        const louvainEdges = edges.map((e) => ({ source: e.source, target: e.target, weight: e.weight }));
        const { degrees: degreeMap, hubScores } = computeCentralityAndDegrees(projectIds, louvainEdges);
        // 4. Run Louvain modularity clustering
        const { communities, modularity, clusters } = louvainModularityClustering(projectIds, louvainEdges);
        // 5. Assemble formatted nodes
        const nodes = accessible.map((p) => {
            const commId = communities.get(p.id) ?? 0;
            const color = BRAND_CLUSTER_PALETTE[commId % BRAND_CLUSTER_PALETTE.length];
            return {
                id: p.id,
                title: p.title,
                description: p.description,
                space: p.space,
                visibility: p.visibility,
                ownerId: p.ownerId,
                ownerName: p.owner?.name || 'Collective Member',
                categoryId: p.categoryId,
                categoryName: p.category?.name || 'Unassigned',
                categoryColor: p.category?.color || '#6366f1',
                tags: p.tagNames,
                degree: degreeMap.get(p.id) || 0,
                hubScore: hubScores.get(p.id) || 0,
                community: commId,
                clusterColor: color,
                parentId: p.parentId,
                createdAt: safeISO(p.createdAt),
                updatedAt: safeISO(p.updatedAt),
            };
        });
        return res.status(200).json({
            nodes,
            edges,
            clusters,
            modularity,
            stats: {
                totalNodes: nodes.length,
                totalEdges: edges.length,
                numCommunities: clusters.length,
            },
        });
    }
    catch (err) {
        next(err);
    }
});
// ==========================================
// 2. GET /api/graph/contextual/:projectId
// ==========================================
graphRouter.get('/contextual/:projectId', requireAuth, async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const currentUser = req.user;
        await searchIndexManager.ensureInitialized();
        const focalCached = searchIndexManager.getProject(projectId);
        if (!focalCached) {
            return res.status(404).json({ error: 'NotFound', message: 'Project not found' });
        }
        // Strict privacy boundary: cannot access other users' personal private projects
        if (focalCached.space === 'personal' && focalCached.ownerId !== currentUser.id) {
            return res.status(403).json({ error: 'Forbidden', message: 'Unauthorized project graph access' });
        }
        const accessible = searchIndexManager.getAccessibleProjects(currentUser.id);
        const accessibleMap = new Map(accessible.map((p) => [p.id, p]));
        // Fetch all active connections involving accessible projects
        const allDbConnections = await db.query.connections.findMany({
            where: or(eq(connections.status, 'accepted'), eq(connections.status, 'suggested')),
        });
        // Build adjacency graph
        const adjMap = new Map();
        const edgeDataMap = new Map();
        for (const p of accessible) {
            adjMap.set(p.id, new Set());
        }
        for (const c of allDbConnections) {
            if (accessibleMap.has(c.sourceProjectId) && accessibleMap.has(c.targetProjectId)) {
                adjMap.get(c.sourceProjectId)?.add(c.targetProjectId);
                adjMap.get(c.targetProjectId)?.add(c.sourceProjectId);
                const key = [c.sourceProjectId, c.targetProjectId].sort().join('_');
                edgeDataMap.set(key, c);
            }
        }
        // Add Parent-Child hierarchy connections to adjacency list
        for (const p of accessible) {
            if (p.parentId && accessibleMap.has(p.parentId)) {
                adjMap.get(p.id)?.add(p.parentId);
                adjMap.get(p.parentId)?.add(p.id);
                const key = [p.id, p.parentId].sort().join('_');
                if (!edgeDataMap.has(key)) {
                    edgeDataMap.set(key, {
                        id: `hierarchy_${key}`,
                        sourceProjectId: p.id,
                        targetProjectId: p.parentId,
                        score: 0.9,
                        reason: 'Relation Parent-Enfant',
                        status: 'accepted',
                    });
                }
            }
        }
        // BFS Traversal for 1-hop and 2-hop ego-network
        const nodeHopMap = new Map();
        nodeHopMap.set(projectId, 0);
        const queue = [{ id: projectId, hop: 0 }];
        while (queue.length > 0) {
            const { id: currId, hop: currHop } = queue.shift();
            if (currHop >= 2)
                continue;
            for (const neighborId of adjMap.get(currId) || []) {
                if (!nodeHopMap.has(neighborId)) {
                    nodeHopMap.set(neighborId, currHop + 1);
                    queue.push({ id: neighborId, hop: currHop + 1 });
                }
            }
        }
        const egoNodeIds = Array.from(nodeHopMap.keys());
        // Collect subgraph edges
        const egoEdges = [];
        for (let i = 0; i < egoNodeIds.length; i++) {
            for (let j = i + 1; j < egoNodeIds.length; j++) {
                const u = egoNodeIds[i];
                const v = egoNodeIds[j];
                const key = [u, v].sort().join('_');
                const edge = edgeDataMap.get(key);
                if (edge) {
                    const p1 = accessibleMap.get(u);
                    const p2 = accessibleMap.get(v);
                    const sharedTags = p1.tagNames.filter((t) => p2.tagNames.includes(t));
                    egoEdges.push({
                        id: edge.id,
                        source: u,
                        target: v,
                        score: edge.score,
                        similarity: edge.score,
                        weight: edge.score,
                        reason: edge.reason,
                        status: edge.status,
                        sharedTags,
                    });
                }
            }
        }
        // Compute degree and hub scores on ego-network
        const louvainEgoEdges = egoEdges.map((e) => ({ source: e.source, target: e.target, weight: e.weight }));
        const { degrees: degreeMap, hubScores } = computeCentralityAndDegrees(egoNodeIds, louvainEgoEdges);
        // Run Louvain on ego-network
        const { communities, modularity, clusters } = louvainModularityClustering(egoNodeIds, louvainEgoEdges);
        // Format nodes
        const nodes = egoNodeIds.map((id) => {
            const p = accessibleMap.get(id);
            const hop = nodeHopMap.get(id) || 0;
            const isGhost = hop === 2;
            const commId = communities.get(id) ?? 0;
            const color = BRAND_CLUSTER_PALETTE[commId % BRAND_CLUSTER_PALETTE.length];
            const sharedWithFocal = id !== projectId ? p.tagNames.filter((t) => focalCached.tagNames.includes(t)) : [];
            return {
                id: p.id,
                title: p.title,
                description: p.description,
                space: p.space,
                visibility: p.visibility,
                ownerId: p.ownerId,
                ownerName: p.owner?.name || 'Collective Member',
                categoryId: p.categoryId,
                categoryName: p.category?.name || 'Unassigned',
                categoryColor: p.category?.color || '#6366f1',
                tags: p.tagNames,
                hop,
                isGhost,
                degree: degreeMap.get(p.id) || 0,
                hubScore: hubScores.get(p.id) || 0,
                community: commId,
                clusterColor: color,
                parentId: p.parentId,
                connectionReason: sharedWithFocal.length > 0 ? `Shares tags (${sharedWithFocal.join(', ')})` : 'Ego-network connection',
            };
        });
        const focalNode = nodes.find((n) => n.id === projectId);
        const neighbors = nodes.filter((n) => n.id !== projectId).map((n) => ({
            id: n.id,
            title: n.title,
            hop: n.hop,
            isGhost: n.isGhost,
            degree: n.degree,
            community: n.community,
            clusterColor: n.clusterColor,
            connectionReason: n.connectionReason,
        }));
        return res.status(200).json({
            focalNode,
            nodes,
            neighbors,
            edges: egoEdges,
            clusters,
            modularity,
            stats: {
                totalNodes: nodes.length,
                oneHopCount: neighbors.filter((n) => n.hop === 1).length,
                twoHopCount: neighbors.filter((n) => n.hop === 2).length,
                totalEdges: egoEdges.length,
            },
        });
    }
    catch (err) {
        next(err);
    }
});
