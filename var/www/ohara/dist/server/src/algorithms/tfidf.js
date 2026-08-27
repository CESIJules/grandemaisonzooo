/**
 * TF-IDF Vector Space Model & Cosine Similarity Engine
 * La Grande Bibliothèque — Milestone 3
 *
 * Deterministic vector indexing with sublinear term frequency scaling,
 * smoothed inverse document frequency, and sparse cosine similarity.
 */
import { tokenize } from './tokenizer.js';
export class TFIDFIndex {
    docs = new Map();
    docFreqs = new Map();
    unitVectors = new Map();
    isDirty = false;
    addDocument(id, text) {
        if (this.docs.has(id)) {
            this.removeDocument(id);
        }
        const tokens = tokenize(text);
        const termFreqs = new Map();
        for (const t of tokens) {
            termFreqs.set(t, (termFreqs.get(t) || 0) + 1);
        }
        const doc = {
            id,
            tokens,
            termFreqs,
            length: tokens.length,
        };
        this.docs.set(id, doc);
        for (const term of termFreqs.keys()) {
            this.docFreqs.set(term, (this.docFreqs.get(term) || 0) + 1);
        }
        this.isDirty = true;
    }
    removeDocument(id) {
        const doc = this.docs.get(id);
        if (!doc)
            return false;
        for (const term of doc.termFreqs.keys()) {
            const count = this.docFreqs.get(term) || 1;
            if (count <= 1) {
                this.docFreqs.delete(term);
            }
            else {
                this.docFreqs.set(term, count - 1);
            }
        }
        this.docs.delete(id);
        this.unitVectors.delete(id);
        this.isDirty = true;
        return true;
    }
    rebuildVectors() {
        if (!this.isDirty)
            return;
        this.unitVectors.clear();
        const N = this.docs.size;
        if (N === 0) {
            this.isDirty = false;
            return;
        }
        for (const [id, doc] of this.docs.entries()) {
            if (doc.length === 0) {
                this.unitVectors.set(id, new Map());
                continue;
            }
            const sparseVec = new Map();
            let sumSquares = 0;
            for (const [term, rawTf] of doc.termFreqs.entries()) {
                const df = this.docFreqs.get(term) || 1;
                // Sublinear TF scaling: 1 + ln(tf)
                const sublinearTf = 1 + Math.log(rawTf);
                // Smoothed IDF: ln(1 + N/DF)
                const idf = Math.log(1 + N / df);
                const weight = sublinearTf * idf;
                sparseVec.set(term, weight);
                sumSquares += weight * weight;
            }
            const norm = Math.sqrt(sumSquares);
            if (norm > 0) {
                for (const [term, weight] of sparseVec.entries()) {
                    sparseVec.set(term, weight / norm);
                }
            }
            this.unitVectors.set(id, sparseVec);
        }
        this.isDirty = false;
    }
    computeCosineSimilarity(docAId, docBId) {
        this.rebuildVectors();
        const vecA = this.unitVectors.get(docAId);
        const vecB = this.unitVectors.get(docBId);
        if (!vecA || !vecB || vecA.size === 0 || vecB.size === 0) {
            return 0.0;
        }
        return sparseCosineSimilarity(vecA, vecB);
    }
    getSimilarDocuments(docId, limit = 10, minSimilarity = 0.05) {
        this.rebuildVectors();
        const targetVec = this.unitVectors.get(docId);
        if (!targetVec || targetVec.size === 0)
            return [];
        const similarities = [];
        for (const [otherId, otherVec] of this.unitVectors.entries()) {
            if (otherId === docId)
                continue;
            const sim = sparseCosineSimilarity(targetVec, otherVec);
            if (sim >= minSimilarity) {
                similarities.push({ id: otherId, similarity: Number(sim.toFixed(4)) });
            }
        }
        return similarities.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
    }
    computeAllPairwiseSimilarities() {
        this.rebuildVectors();
        const matrix = new Map();
        const docIds = Array.from(this.docs.keys());
        for (let i = 0; i < docIds.length; i++) {
            const idA = docIds[i];
            if (!matrix.has(idA))
                matrix.set(idA, new Map());
            for (let j = i + 1; j < docIds.length; j++) {
                const idB = docIds[j];
                if (!matrix.has(idB))
                    matrix.set(idB, new Map());
                const sim = this.computeCosineSimilarity(idA, idB);
                matrix.get(idA).set(idB, sim);
                matrix.get(idB).set(idA, sim);
            }
        }
        return matrix;
    }
    getVocabulary() {
        return Array.from(this.docFreqs.keys()).sort();
    }
    getDocumentVector(id) {
        this.rebuildVectors();
        return this.unitVectors.get(id);
    }
}
/**
 * Sparse Cosine Similarity calculation between two term-weight maps.
 */
export function sparseCosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.size === 0 || vecB.size === 0)
        return 0.0;
    // Iterate over smaller vector
    const [smaller, larger] = vecA.size < vecB.size ? [vecA, vecB] : [vecB, vecA];
    let dotProduct = 0.0;
    for (const [term, weightA] of smaller.entries()) {
        const weightB = larger.get(term);
        if (weightB !== undefined) {
            dotProduct += weightA * weightB;
        }
    }
    return Math.min(1.0, Math.max(0.0, dotProduct));
}
/**
 * Dense vector Cosine Similarity calculation.
 */
export function cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0)
        return 0.0;
    let dotProduct = 0.0;
    let normA = 0.0;
    let normB = 0.0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0)
        return 0.0;
    const sim = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    if (isNaN(sim))
        return 0.0;
    return Math.min(1.0, Math.max(0.0, sim));
}
/**
 * Functional TF-IDF calculation across an array of document text strings.
 */
export function computeTfIdf(corpus) {
    if (!corpus || corpus.length === 0) {
        return { vocabulary: [], idf: {}, vectors: [] };
    }
    const tokenizedDocs = corpus.map((doc) => tokenize(doc));
    const N = corpus.length;
    const docFreq = {};
    const vocabSet = new Set();
    for (const doc of tokenizedDocs) {
        const uniqueTokens = new Set(doc);
        for (const token of uniqueTokens) {
            vocabSet.add(token);
            docFreq[token] = (docFreq[token] || 0) + 1;
        }
    }
    const vocabulary = Array.from(vocabSet).sort();
    const idf = {};
    for (const token of vocabulary) {
        // Smoothed standard IDF: ln((N + 1) / (DF + 1)) + 1
        idf[token] = Math.log((N + 1) / ((docFreq[token] || 0) + 1)) + 1.0;
    }
    const vectors = tokenizedDocs.map((doc) => {
        if (doc.length === 0)
            return new Array(vocabulary.length).fill(0);
        const tf = {};
        for (const t of doc) {
            tf[t] = (tf[t] || 0) + 1;
        }
        const rawVec = vocabulary.map((token) => {
            const termTf = (tf[token] || 0) / doc.length;
            return termTf * (idf[token] || 0);
        });
        const norm = Math.sqrt(rawVec.reduce((sum, val) => sum + val * val, 0));
        if (norm === 0)
            return rawVec;
        return rawVec.map((val) => val / norm);
    });
    return { vocabulary, idf, vectors };
}
