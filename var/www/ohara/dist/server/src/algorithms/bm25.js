/**
 * Okapi BM25 Ranking Engine & In-Memory Inverted Index
 * La Grande Bibliothèque — Milestone 3
 *
 * Deterministic text retrieval using Robertson-Spärck Jones smoothed non-negative IDF
 * and field-weighted document representation.
 */
import { tokenize } from './tokenizer.js';
export class BM25Index {
    k1;
    b;
    weights;
    // term -> Map(docId -> weighted term frequency)
    postings = new Map();
    // docId -> total weighted length of doc
    docLengths = new Map();
    // docId -> metadata
    docMetadata = new Map();
    totalLength = 0;
    docCount = 0;
    constructor(options = {}) {
        this.k1 = options.k1 ?? 1.5;
        this.b = options.b ?? 0.75;
        this.weights = {
            title: options.fieldWeights?.title ?? 3.0,
            tags: options.fieldWeights?.tags ?? 2.5,
            description: options.fieldWeights?.description ?? 1.5,
            body: options.fieldWeights?.body ?? 1.0,
        };
    }
    addDocument(doc) {
        if (this.docLengths.has(doc.id)) {
            this.removeDocument(doc.id);
        }
        const termFreqs = new Map();
        let docLen = 0;
        if ('text' in doc) {
            const tokens = tokenize(doc.text);
            docLen = tokens.length;
            for (const t of tokens) {
                termFreqs.set(t, (termFreqs.get(t) || 0) + 1.0);
            }
        }
        else {
            // Field-weighted token extraction
            const titleTokens = tokenize(doc.title || '');
            const tagsTokens = tokenize((doc.tags || []).join(' '));
            const descTokens = tokenize(doc.description || '');
            const bodyTokens = tokenize(doc.body || '');
            docLen =
                titleTokens.length * this.weights.title +
                    tagsTokens.length * this.weights.tags +
                    descTokens.length * this.weights.description +
                    bodyTokens.length * this.weights.body;
            for (const t of titleTokens) {
                termFreqs.set(t, (termFreqs.get(t) || 0) + this.weights.title);
            }
            for (const t of tagsTokens) {
                termFreqs.set(t, (termFreqs.get(t) || 0) + this.weights.tags);
            }
            for (const t of descTokens) {
                termFreqs.set(t, (termFreqs.get(t) || 0) + this.weights.description);
            }
            for (const t of bodyTokens) {
                termFreqs.set(t, (termFreqs.get(t) || 0) + this.weights.body);
            }
            if (doc.metadata) {
                this.docMetadata.set(doc.id, doc.metadata);
            }
        }
        for (const [term, freq] of termFreqs.entries()) {
            if (!this.postings.has(term)) {
                this.postings.set(term, new Map());
            }
            this.postings.get(term).set(doc.id, freq);
        }
        this.docLengths.set(doc.id, Math.max(1, docLen));
        this.totalLength += Math.max(1, docLen);
        this.docCount++;
    }
    updateDocument(doc) {
        this.addDocument(doc);
    }
    removeDocument(id) {
        if (!this.docLengths.has(id))
            return false;
        const len = this.docLengths.get(id);
        this.totalLength -= len;
        this.docLengths.delete(id);
        this.docMetadata.delete(id);
        this.docCount--;
        for (const [term, docMap] of this.postings.entries()) {
            docMap.delete(id);
            if (docMap.size === 0) {
                this.postings.delete(term);
            }
        }
        return true;
    }
    getDocumentCount() {
        return this.docCount;
    }
    getAverageDocumentLength() {
        if (this.docCount === 0)
            return 0;
        return this.totalLength / this.docCount;
    }
    clear() {
        this.postings.clear();
        this.docLengths.clear();
        this.docMetadata.clear();
        this.totalLength = 0;
        this.docCount = 0;
    }
    search(query, options = {}) {
        if (this.docCount === 0)
            return [];
        const queryTokens = tokenize(query);
        if (queryTokens.length === 0)
            return [];
        const limit = options.limit ?? 20;
        const minScore = options.minScore ?? 0.0;
        const avgdl = this.getAverageDocumentLength();
        const scores = new Map();
        for (const term of queryTokens) {
            const posting = this.postings.get(term);
            if (!posting)
                continue;
            const df = posting.size;
            // Robertson-Spärck Jones non-negative IDF
            const idf = Math.log((this.docCount - df + 0.5) / (df + 0.5) + 1.0);
            for (const [docId, freq] of posting.entries()) {
                const docLen = this.docLengths.get(docId) || avgdl;
                const num = freq * (this.k1 + 1);
                const den = freq + this.k1 * (1 - this.b + this.b * (docLen / (avgdl || 1)));
                const termScore = idf * (num / den);
                if (!scores.has(docId)) {
                    scores.set(docId, { score: 0, matchedTerms: new Set() });
                }
                const entry = scores.get(docId);
                entry.score += termScore;
                entry.matchedTerms.add(term);
            }
        }
        const results = [];
        for (const [docId, { score, matchedTerms }] of scores.entries()) {
            if (score < minScore)
                continue;
            const meta = this.docMetadata.get(docId);
            if (options.filter && !options.filter(meta))
                continue;
            results.push({
                id: docId,
                score: Number(score.toFixed(4)),
                matchedTerms: Array.from(matchedTerms),
                metadata: meta,
            });
        }
        return results.sort((a, b) => b.score - a.score).slice(0, limit);
    }
}
/**
 * Standalone direct BM25 scoring helper matching standard signature.
 */
export function computeBm25(query, document, docLengths, avgDocLength, totalDocs, docFreqs, k1 = 1.2, b = 0.75) {
    if (totalDocs === 0)
        return 0;
    const queryTokens = tokenize(query);
    const docTokens = tokenize(document);
    const docLen = docTokens.length;
    if (queryTokens.length === 0 || docLen === 0)
        return 0;
    const tf = {};
    for (const t of docTokens) {
        tf[t] = (tf[t] || 0) + 1;
    }
    let score = 0;
    for (const term of queryTokens) {
        const count = tf[term] || 0;
        if (count === 0)
            continue;
        const df = docFreqs[term] || 1;
        // Robertson-Spärck Jones non-negative IDF: ln((N - DF + 0.5) / (DF + 0.5) + 1.0)
        const idf = Math.log((totalDocs - df + 0.5) / (df + 0.5) + 1.0);
        const num = count * (k1 + 1);
        const den = count + k1 * (1 - b + b * (docLen / (avgDocLength || 1)));
        score += idf * (num / den);
    }
    return score;
}
