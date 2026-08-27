/**
 * Search REST API Routes & Query Parser
 * La Grande Bibliothèque — Milestone 3
 *
 * Provides instant multi-attribute search across projects, tags, categories,
 * block contents, authors, and dates using Okapi BM25 scoring and in-memory cache.
 */
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { searchIndexManager } from './searchIndex.js';
import { tokenize } from '../algorithms/tokenizer.js';
import { computeBm25 } from '../algorithms/bm25.js';
export const searchRouter = Router();
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
/**
 * Parses search query string into structured attribute filters and free-text terms.
 */
export function parseSearchQuery(query) {
    const result = {
        tags: [],
        freeText: '',
    };
    if (!query || typeof query !== 'string')
        return result;
    const tokens = query.trim().split(/\s+/);
    const textParts = [];
    for (const token of tokens) {
        if (!token)
            continue;
        if (token.startsWith('cat:')) {
            result.category = token.slice(4).trim();
        }
        else if (token.startsWith('tag:')) {
            const val = token.slice(4).trim();
            if (val)
                result.tags.push(val);
        }
        else if (token.startsWith('type:')) {
            result.contentType = token.slice(5).trim();
        }
        else if (token.startsWith('by:')) {
            result.author = token.slice(3).trim();
        }
        else if (token.startsWith('after:') || token.startsWith('from:')) {
            result.after = token.startsWith('after:') ? token.slice(6).trim() : token.slice(5).trim();
        }
        else if (token.startsWith('before:') || token.startsWith('to:')) {
            result.before = token.startsWith('before:') ? token.slice(7).trim() : token.slice(3).trim();
        }
        else if (token.length > 0) {
            textParts.push(token.replace(/^"|"$/g, ''));
        }
    }
    result.freeText = textParts.join(' ').trim();
    return result;
}
// ==========================================
// GET /api/search
// ==========================================
searchRouter.get('/', requireAuth, async (req, res, next) => {
    try {
        const currentUser = req.user;
        await searchIndexManager.ensureInitialized();
        const rawQ = req.query.q || '';
        const rawTag = req.query.tag || req.query.tags;
        const rawCat = req.query.cat || req.query.category;
        const rawType = req.query.type || req.query.contentType;
        const rawBy = req.query.by || req.query.author;
        const rawFrom = req.query.from || req.query.after;
        const rawTo = req.query.to || req.query.before;
        const rawSpace = req.query.space;
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
        const offset = Math.max(0, parseInt(req.query.offset || '0', 10));
        // Parse inline prefix tokens
        const ast = parseSearchQuery(rawQ);
        const filterCategory = rawCat || ast.category;
        const filterTags = new Set();
        if (ast.tags.length > 0) {
            ast.tags.forEach((t) => filterTags.add(t.toLowerCase()));
        }
        if (rawTag) {
            if (Array.isArray(rawTag)) {
                rawTag.forEach((t) => filterTags.add(String(t).toLowerCase()));
            }
            else {
                String(rawTag)
                    .split(',')
                    .forEach((t) => {
                    const tr = t.trim().toLowerCase();
                    if (tr)
                        filterTags.add(tr);
                });
            }
        }
        const filterType = rawType || ast.contentType;
        const filterAuthor = rawBy || ast.author;
        const filterFrom = rawFrom || ast.after;
        const filterTo = rawTo || ast.before;
        const freeText = ast.freeText;
        // Retrieve accessible projects for current user
        const accessible = searchIndexManager.getAccessibleProjects(currentUser.id, rawSpace);
        if (accessible.length === 0) {
            return res.status(200).json({ query: rawQ, total: 0, limit, offset, results: [] });
        }
        // Step 1: Attribute Filters
        const filtered = accessible.filter((p) => {
            // Category filter
            if (filterCategory) {
                const catNorm = filterCategory.toLowerCase();
                const matchesCat = (p.categoryId && p.categoryId.toLowerCase() === catNorm) ||
                    (p.category && p.category.name.toLowerCase() === catNorm);
                if (!matchesCat)
                    return false;
            }
            // Tag filter (must contain all specified tags)
            if (filterTags.size > 0) {
                for (const reqTag of filterTags) {
                    if (!p.tagNames.includes(reqTag))
                        return false;
                }
            }
            // Content type filter
            if (filterType) {
                const typeNorm = filterType.toLowerCase();
                const hasBlockType = p.blocks.some((b) => {
                    if (b.type.toLowerCase() === typeNorm)
                        return true;
                    // Handle media sub-types (audio, image, pdf, video)
                    if (b.type === 'media' && ['audio', 'image', 'pdf', 'video'].includes(typeNorm)) {
                        return true;
                    }
                    return false;
                });
                if (!hasBlockType)
                    return false;
            }
            // Author filter
            if (filterAuthor) {
                const byNorm = filterAuthor.toLowerCase();
                const matchesAuthor = p.ownerId.toLowerCase() === byNorm ||
                    p.owner.name.toLowerCase().includes(byNorm) ||
                    p.owner.email.toLowerCase().includes(byNorm);
                if (!matchesAuthor)
                    return false;
            }
            // Date range filter
            if (filterFrom) {
                let fromDate = !isNaN(Number(filterFrom)) ? new Date(Number(filterFrom)) : new Date(filterFrom);
                if (!isNaN(Number(filterFrom)) && Number(filterFrom) < 10000000000) {
                    fromDate = new Date(Number(filterFrom) * 1000);
                }
                const pTime = p.updatedAt instanceof Date ? p.updatedAt.getTime() : new Date(p.updatedAt).getTime();
                if (!isNaN(fromDate.getTime()) && pTime < fromDate.getTime())
                    return false;
            }
            if (filterTo) {
                let toDate = !isNaN(Number(filterTo)) ? new Date(Number(filterTo)) : new Date(filterTo);
                if (!isNaN(Number(filterTo)) && Number(filterTo) < 10000000000) {
                    toDate = new Date(Number(filterTo) * 1000);
                }
                if (typeof filterTo === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(filterTo.trim())) {
                    toDate = new Date(toDate.getTime() + 86400000 - 1);
                }
                const pTime = p.updatedAt instanceof Date ? p.updatedAt.getTime() : new Date(p.updatedAt).getTime();
                if (!isNaN(toDate.getTime()) && pTime > toDate.getTime())
                    return false;
            }
            return true;
        });
        if (filtered.length === 0) {
            return res.status(200).json({ query: rawQ, total: 0, limit, offset, results: [] });
        }
        // Step 2: Relevance Scoring & Title Boost
        let scoredResults = [];
        if (freeText && freeText.trim().length > 0) {
            const queryTokens = tokenize(freeText);
            const corpusTexts = filtered.map((p) => p.fullText);
            const docLengths = corpusTexts.map((d) => tokenize(d).length);
            const avgLen = docLengths.reduce((a, b) => a + b, 0) / (docLengths.length || 1);
            const docFreqs = {};
            for (const d of corpusTexts) {
                for (const t of new Set(tokenize(d))) {
                    docFreqs[t] = (docFreqs[t] || 0) + 1;
                }
            }
            const qLower = freeText.toLowerCase().trim();
            for (let i = 0; i < filtered.length; i++) {
                const p = filtered[i];
                let bm25Score = computeBm25(freeText, p.fullText, docLengths, avgLen, filtered.length, docFreqs);
                // Title match boost hierarchy
                const titleLower = p.title.toLowerCase().trim();
                if (titleLower === qLower) {
                    bm25Score += 100.0;
                }
                else if (titleLower.startsWith(qLower)) {
                    bm25Score += 50.0;
                }
                else if (titleLower.includes(qLower)) {
                    bm25Score += 20.0;
                }
                if (bm25Score > 0) {
                    // Find matched block previews
                    const matchedBlocks = [];
                    for (const b of p.blocks) {
                        const bTokens = tokenize(b.text);
                        const matches = queryTokens.some((qt) => bTokens.includes(qt));
                        if (matches || (filterType && b.type.toLowerCase() === filterType.toLowerCase())) {
                            matchedBlocks.push({
                                id: b.id,
                                type: b.type,
                                preview: b.text.length > 140 ? b.text.slice(0, 140) + '...' : b.text,
                            });
                        }
                    }
                    scoredResults.push({
                        project: p,
                        matchScore: Number(bm25Score.toFixed(2)),
                        matchedBlocks: matchedBlocks.slice(0, 3),
                    });
                }
            }
            scoredResults.sort((a, b) => b.matchScore - a.matchScore);
        }
        else {
            // Attribute-only search: sort by updatedAt descending
            scoredResults = filtered
                .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
                .map((p) => ({
                project: p,
                matchScore: 1.0,
                matchedBlocks: p.blocks.slice(0, 2).map((b) => ({
                    id: b.id,
                    type: b.type,
                    preview: b.text.length > 140 ? b.text.slice(0, 140) + '...' : b.text,
                })),
            }));
        }
        const total = scoredResults.length;
        const paginated = scoredResults.slice(offset, offset + limit);
        const formatted = paginated.map(({ project: p, matchScore, matchedBlocks }) => ({
            id: p.id,
            title: p.title,
            description: p.description,
            category: p.category ? p.category.name : null,
            categoryId: p.categoryId,
            tags: p.tagNames,
            matchScore,
            matchedBlocks,
            space: p.space,
            owner: p.owner,
            author: p.owner.name || p.owner.email,
            createdAt: safeISO(p.createdAt),
            updatedAt: safeISO(p.updatedAt),
        }));
        return res.status(200).json({
            query: rawQ,
            total,
            limit,
            offset,
            results: formatted,
        });
    }
    catch (err) {
        next(err);
    }
});
