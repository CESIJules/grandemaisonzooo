/**
 * Multi-Factor Composite Connection Discovery Engine & Explanation Generator
 * La Grande Bibliothèque — Milestone 3
 *
 * Computes deterministic multi-factor similarity between projects using:
 * 1. Content text TF-IDF cosine similarity (w_text)
 * 2. Tag overlap Jaccard similarity (w_tag)
 * 3. Taxonomy category match (w_cat)
 * 4. Temporal update proximity with exponential decay (w_time)
 * 5. Topological graph link prediction / Adamic-Adar (w_aa)
 */
import { computeTfIdf, cosineSimilarity } from './tfidf.js';
import { tokenize } from './tokenizer.js';
/**
 * Computes composite connection score.
 * Default 4-factor weights: text: 0.45, tag: 0.35, cat: 0.10, time: 0.10.
 * Default 5-factor weights (if adamicAdar passed): text: 0.40, tag: 0.30, cat: 0.10, time: 0.10, aa: 0.10.
 */
export function computeCompositeConnectionScore(params) {
    const hasAA = params.adamicAdar !== undefined && params.adamicAdar !== null;
    const defaultWeights = hasAA
        ? { text: 0.40, tag: 0.30, cat: 0.10, time: 0.10, aa: 0.10 }
        : { text: 0.45, tag: 0.35, cat: 0.10, time: 0.10, aa: 0.0 };
    const wText = params.weights?.text ?? defaultWeights.text;
    const wTag = params.weights?.tag ?? defaultWeights.tag;
    const wCat = params.weights?.cat ?? defaultWeights.cat;
    const wTime = params.weights?.time ?? defaultWeights.time;
    const wAA = params.weights?.aa ?? defaultWeights.aa;
    const catScore = params.sameCategory ? 1.0 : 0.0;
    // Exponential decay with tau = 20 days (lambda = 0.05)
    const timeDecay = Math.exp(-0.05 * Math.abs(params.daysDiff));
    const aaScore = Math.min(1.0, params.adamicAdar || 0.0);
    const score = wText * params.simCos +
        wTag * params.jaccardTags +
        wCat * catScore +
        wTime * timeDecay +
        wAA * aaScore;
    return Number(score.toFixed(4));
}
/**
 * Generates natural-language human-readable reasons explaining the connection.
 */
export function generateConnectionExplanation(params) {
    const parts = [];
    // 1. Shared tags explanation
    if (params.sharedTags.length > 0) {
        const tagList = params.sharedTags.slice(0, 3).join(', ');
        parts.push(params.sharedTags.length === 1
            ? `Shares tag "${tagList}"`
            : `Shares ${params.sharedTags.length} tags (${tagList})`);
    }
    // 2. Keyword overlap
    if (params.sharedKeywords.length > 0 && params.breakdown.text >= 0.25) {
        const kwList = params.sharedKeywords.slice(0, 3).join(', ');
        parts.push(`high keyword overlap (${kwList})`);
    }
    else if (params.breakdown.text >= 0.4) {
        parts.push(`strong content similarity (${Math.round(params.breakdown.text * 100)}%)`);
    }
    // 3. Category match
    if (params.sameCategory && params.categoryName) {
        parts.push(`same category "${params.categoryName}"`);
    }
    // 4. Temporal proximity
    if (params.daysDiff <= 3) {
        parts.push('created around the same time');
    }
    // 5. Network common neighbors
    if (params.sharedNeighbors && params.sharedNeighbors.length > 0) {
        parts.push(`shares ${params.sharedNeighbors.length} connected project(s)`);
    }
    if (parts.length === 0) {
        return 'Algorithmic topic and content overlap';
    }
    return parts.join(' and ');
}
/**
 * Discovers suggested connections across a corpus of projects.
 */
export function discoverConnections(projectsList, existingConnections = [], options = {}) {
    if (!projectsList || projectsList.length <= 1) {
        return [];
    }
    const minScore = options.minScore ?? 0.25;
    const limit = options.limit ?? 50;
    const currentUserId = options.currentUserId;
    // Build lookup of existing / accepted / dismissed connections
    const existingMap = new Map();
    for (const c of existingConnections) {
        existingMap.set(`${c.sourceProjectId}_${c.targetProjectId}`, c);
        existingMap.set(`${c.targetProjectId}_${c.sourceProjectId}`, c);
    }
    // Prepare texts for TF-IDF vectorization
    const projectTexts = projectsList.map((p) => {
        const tagsText = (p.tags || []).join(' ');
        const descText = p.description || '';
        const bodyText = p.body || '';
        return `${p.title} ${p.title} ${tagsText} ${descText} ${bodyText}`;
    });
    const { vectors } = computeTfIdf(projectTexts);
    const suggestions = [];
    for (let i = 0; i < projectsList.length; i++) {
        const pA = projectsList[i];
        const tokensA = new Set(tokenize(projectTexts[i]));
        const tagsA = new Set((pA.tags || []).map((t) => t.toLowerCase().trim()));
        for (let j = i + 1; j < projectsList.length; j++) {
            const pB = projectsList[j];
            // Invariant: Self-connections forbidden
            if (pA.id === pB.id)
                continue;
            // Invariant: Privacy Isolation Boundary
            // If project A is personal and project B is personal, but have different owners -> NEVER connect
            if (pA.space === 'personal' && pB.space === 'personal' && pA.ownerId !== pB.ownerId) {
                continue;
            }
            // If current user specified, ensure user can see both projects
            if (currentUserId) {
                const canSeeA = pA.space === 'shared' || pA.ownerId === currentUserId;
                const canSeeB = pB.space === 'shared' || pB.ownerId === currentUserId;
                if (!canSeeA || !canSeeB)
                    continue;
            }
            // Check existing connection state
            const existing = existingMap.get(`${pA.id}_${pB.id}`);
            if (existing && (existing.status === 'dismissed' || existing.status === 'accepted')) {
                continue; // Suppress dismissed or already accepted links
            }
            // 1. Text similarity
            const simCos = cosineSimilarity(vectors[i], vectors[j]);
            // 2. Tag similarity
            const tagsB = new Set((pB.tags || []).map((t) => t.toLowerCase().trim()));
            const sharedTags = [];
            for (const t of tagsA) {
                if (tagsB.has(t))
                    sharedTags.push(t);
            }
            const unionTags = new Set([...tagsA, ...tagsB]);
            const jaccardTags = unionTags.size > 0 ? sharedTags.length / unionTags.size : 0.0;
            // 3. Category match
            const sameCategory = Boolean(pA.categoryId && pB.categoryId && pA.categoryId === pB.categoryId);
            // 4. Temporal proximity
            const timeA = typeof pA.updatedAt === 'number' ? pA.updatedAt : new Date(pA.updatedAt).getTime();
            const timeB = typeof pB.updatedAt === 'number' ? pB.updatedAt : new Date(pB.updatedAt).getTime();
            const daysDiff = Math.abs(timeA - timeB) / (1000 * 60 * 60 * 24);
            // 5. Adamic-Adar graph link prediction
            let adamicAdarScore;
            let sharedNeighbors;
            if (options.linkPredictor) {
                adamicAdarScore = options.linkPredictor.computeAdamicAdar(pA.id, pB.id);
                sharedNeighbors = options.linkPredictor.computeCommonNeighbors(pA.id, pB.id);
            }
            const score = computeCompositeConnectionScore({
                simCos,
                jaccardTags,
                sameCategory,
                daysDiff,
                adamicAdar: adamicAdarScore,
            });
            if (score >= minScore) {
                // Shared keywords
                const tokensB = tokenize(projectTexts[j]);
                const sharedKeywords = Array.from(new Set(tokensB.filter((t) => tokensA.has(t)))).slice(0, 5);
                const breakdown = {
                    text: Number(simCos.toFixed(4)),
                    tag: Number(jaccardTags.toFixed(4)),
                    cat: sameCategory ? 1.0 : 0.0,
                    time: Number(Math.exp(-0.05 * daysDiff).toFixed(4)),
                    adamicAdar: adamicAdarScore,
                };
                const reason = generateConnectionExplanation({
                    sharedTags,
                    sharedKeywords,
                    sameCategory,
                    categoryName: pA.categoryName || pB.categoryName,
                    daysDiff,
                    sharedNeighbors,
                    breakdown,
                });
                suggestions.push({
                    id: existing?.id,
                    sourceProjectId: pA.id,
                    targetProjectId: pB.id,
                    sourceProjectTitle: pA.title,
                    targetProjectTitle: pB.title,
                    score: Number(score.toFixed(2)),
                    reason,
                    status: 'suggested',
                    breakdown,
                    sharedTags,
                    sharedKeywords,
                });
            }
        }
    }
    return suggestions.sort((a, b) => b.score - a.score).slice(0, limit);
}
