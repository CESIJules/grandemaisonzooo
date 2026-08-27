/**
 * Tag Co-occurrence Matrix & Automated Suggestion Engine
 * La Grande Bibliothèque — Milestone 3
 *
 * Deterministic tag recommendation using symmetric co-occurrence graph analysis,
 * Jaccard & Dice similarity metrics, and triple-source superposition
 * (Keyword TF-IDF + Tag Co-occurrence + Neighbor Tag Propagation).
 */
import { tokenize } from './tokenizer.js';
import { computeTfIdf, cosineSimilarity } from './tfidf.js';
/**
 * Computes a symmetrical tag co-occurrence matrix from an array of project tag lists.
 */
export function computeTagCooccurrenceMatrix(projectTagsList) {
    const tagSet = new Set();
    for (const tags of projectTagsList) {
        for (const t of tags) {
            const clean = t.toLowerCase().trim();
            if (clean)
                tagSet.add(clean);
        }
    }
    const tags = Array.from(tagSet).sort();
    const tagIndices = new Map(tags.map((t, idx) => [t, idx]));
    const size = tags.length;
    const matrix = Array.from({ length: size }, () => new Array(size).fill(0));
    for (const projTags of projectTagsList) {
        const cleanTags = Array.from(new Set(projTags.map((t) => t.toLowerCase().trim()).filter(Boolean)));
        for (let i = 0; i < cleanTags.length; i++) {
            const idx1 = tagIndices.get(cleanTags[i]);
            if (idx1 === undefined)
                continue;
            matrix[idx1][idx1] += 1;
            for (let j = i + 1; j < cleanTags.length; j++) {
                const idx2 = tagIndices.get(cleanTags[j]);
                if (idx2 === undefined)
                    continue;
                matrix[idx1][idx2] += 1;
                matrix[idx2][idx1] += 1;
            }
        }
    }
    const jaccard = (t1, t2) => {
        const idx1 = tagIndices.get(t1.toLowerCase().trim());
        const idx2 = tagIndices.get(t2.toLowerCase().trim());
        if (idx1 === undefined || idx2 === undefined)
            return 0.0;
        if (idx1 === idx2)
            return matrix[idx1][idx1] > 0 ? 1.0 : 0.0;
        const c11 = matrix[idx1][idx1];
        const c22 = matrix[idx2][idx2];
        const c12 = matrix[idx1][idx2];
        const denom = c11 + c22 - c12;
        if (denom <= 0)
            return 0.0;
        return c12 / denom;
    };
    const dice = (t1, t2) => {
        const idx1 = tagIndices.get(t1.toLowerCase().trim());
        const idx2 = tagIndices.get(t2.toLowerCase().trim());
        if (idx1 === undefined || idx2 === undefined)
            return 0.0;
        if (idx1 === idx2)
            return matrix[idx1][idx1] > 0 ? 1.0 : 0.0;
        const c11 = matrix[idx1][idx1];
        const c22 = matrix[idx2][idx2];
        const c12 = matrix[idx1][idx2];
        const denom = c11 + c22;
        if (denom <= 0)
            return 0.0;
        return (2 * c12) / denom;
    };
    return { tags, matrix, jaccard, dice };
}
export class TagCooccurrenceMatrix {
    tagData = {
        tags: [],
        matrix: [],
        jaccard: () => 0,
        dice: () => 0,
    };
    buildMatrix(projects) {
        const tagLists = projects.map((p) => p.tags);
        this.tagData = computeTagCooccurrenceMatrix(tagLists);
    }
    getJaccard(tagA, tagB) {
        return this.tagData.jaccard(tagA, tagB);
    }
    getDice(tagA, tagB) {
        return this.tagData.dice(tagA, tagB);
    }
    /**
     * Suggests top tags for a target project using triple-source superposition.
     */
    suggestTags(params) {
        const { targetProjectId, existingTags = [], projectText = '', corpusProjects = [], dismissedTags = new Set(), topK = 5, } = params;
        const existingSet = new Set(existingTags.map((t) => t.toLowerCase().trim()));
        const targetTokens = tokenize(projectText);
        const targetTokenSet = new Set(targetTokens);
        if (targetTokens.length === 0 && existingTags.length === 0) {
            return [];
        }
        // 1. Build TF-IDF vectors for content similarity across corpus
        const validCorpus = corpusProjects.filter((p) => p.id !== targetProjectId);
        const allTexts = [projectText, ...validCorpus.map((p) => p.text)];
        const { vectors } = computeTfIdf(allTexts);
        const targetVector = vectors[0] || [];
        // Candidate accumulator: tag -> { kwScore, cooccurScore, nbrScore, reasons: string[] }
        const candidates = new Map();
        const ensureCandidate = (tag) => {
            if (!candidates.has(tag)) {
                candidates.set(tag, { kwScore: 0, cooccurScore: 0, nbrScore: 0, reasons: [] });
            }
            return candidates.get(tag);
        };
        // Source 1: Keyword-to-Tag Mapping ($S_{kw}$) & Direct Token Match
        for (let i = 0; i < validCorpus.length; i++) {
            const p = validCorpus[i];
            const pVector = vectors[i + 1] || [];
            const simText = cosineSimilarity(targetVector, pVector);
            const pTokens = tokenize(p.text);
            const overlapTokens = targetTokens.filter((t) => pTokens.includes(t));
            for (const rawTag of p.tags) {
                const tag = rawTag.toLowerCase().trim();
                if (!tag || existingSet.has(tag) || dismissedTags.has(tag))
                    continue;
                const cand = ensureCandidate(tag);
                cand.kwScore += simText * 1.5 + overlapTokens.length * 0.1;
                if (overlapTokens.length > 0 && cand.reasons.length < 2) {
                    const sample = overlapTokens.slice(0, 2).join(', ');
                    cand.reasons.push(`matched keywords (${sample})`);
                }
            }
        }
        // Direct token appearance of tag name in target text
        for (const tag of this.tagData.tags) {
            if (existingSet.has(tag) || dismissedTags.has(tag))
                continue;
            if (targetTokenSet.has(tag)) {
                const cand = ensureCandidate(tag);
                cand.kwScore += 2.0;
                cand.reasons.push('found directly in project text');
            }
        }
        // Source 2: Tag-to-Tag Co-occurrence ($S_{co}$)
        if (existingTags.length > 0) {
            for (const existing of existingTags) {
                for (const candidateTag of this.tagData.tags) {
                    if (existingSet.has(candidateTag) || dismissedTags.has(candidateTag))
                        continue;
                    const jacc = this.getJaccard(existing, candidateTag);
                    if (jacc > 0) {
                        const cand = ensureCandidate(candidateTag);
                        cand.cooccurScore += jacc;
                        if (jacc >= 0.2 && cand.reasons.length < 3) {
                            cand.reasons.push(`frequently co-occurs with "${existing}"`);
                        }
                    }
                }
            }
        }
        // Source 3: Neighbor Project Tag Propagation ($S_{nbr}$)
        const neighbors = [];
        for (let i = 0; i < validCorpus.length; i++) {
            const p = validCorpus[i];
            const pVector = vectors[i + 1] || [];
            const sim = cosineSimilarity(targetVector, pVector);
            if (sim > 0.1) {
                neighbors.push({ project: p, sim });
            }
        }
        neighbors.sort((a, b) => b.sim - a.sim);
        for (const { project, sim } of neighbors.slice(0, 5)) {
            for (const rawTag of project.tags) {
                const tag = rawTag.toLowerCase().trim();
                if (!tag || existingSet.has(tag) || dismissedTags.has(tag))
                    continue;
                const cand = ensureCandidate(tag);
                cand.nbrScore += sim;
            }
        }
        // Superposition weights: alpha=0.40, beta=0.30, gamma=0.30
        const alpha = 0.40;
        const beta = 0.30;
        const gamma = 0.30;
        const scored = [];
        for (const [tag, data] of candidates.entries()) {
            const rawComposite = alpha * data.kwScore + beta * data.cooccurScore + gamma * data.nbrScore;
            if (rawComposite <= 0)
                continue;
            // Normalize score into [0.10, 0.99]
            const score = Math.min(0.99, Math.max(0.10, Number((rawComposite / (rawComposite + 1.0)).toFixed(2))));
            const confidence = Number(Math.min(1.0, score * 1.1).toFixed(2));
            let reason = 'Suggested based on collective corpus relevance';
            if (data.reasons.length > 0) {
                // Deduplicate reasons
                const uniqueReasons = Array.from(new Set(data.reasons));
                reason = uniqueReasons.slice(0, 2).join(' and ');
                reason = reason.charAt(0).toUpperCase() + reason.slice(1);
            }
            scored.push({
                tag,
                score,
                confidence,
                reason,
            });
        }
        return scored.sort((a, b) => b.score - a.score).slice(0, topK);
    }
}
