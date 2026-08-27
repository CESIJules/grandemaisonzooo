/**
 * Graph Link Prediction & Adamic-Adar Index Engine
 * La Grande Bibliothèque — Milestone 3
 *
 * Deterministic topological graph link prediction for uncovering implicit
 * relationships between projects using Adamic-Adar, Common Neighbors, and Jaccard metrics.
 */
export class LinkPredictor {
    // Adjacency list: nodeId -> Set<neighborNodeId>
    adjacency = new Map();
    addEdge(u, v) {
        if (u === v)
            return; // Prevent self-loops
        if (!this.adjacency.has(u))
            this.adjacency.set(u, new Set());
        if (!this.adjacency.has(v))
            this.adjacency.set(v, new Set());
        this.adjacency.get(u).add(v);
        this.adjacency.get(v).add(u);
    }
    removeEdge(u, v) {
        this.adjacency.get(u)?.delete(v);
        this.adjacency.get(v)?.delete(u);
    }
    getNeighbors(u) {
        return this.adjacency.get(u) || new Set();
    }
    computeCommonNeighbors(u, v) {
        const neighborsU = this.getNeighbors(u);
        const neighborsV = this.getNeighbors(v);
        const common = [];
        for (const z of neighborsU) {
            if (neighborsV.has(z)) {
                common.push(z);
            }
        }
        return common;
    }
    /**
     * Adamic-Adar index with numerical safety regularization for degree-1 nodes:
     * AA(u, v) = sum_{z in N(u) cap N(v)} 1 / ln(max(2, |N(z)|))
     */
    computeAdamicAdar(u, v) {
        const common = this.computeCommonNeighbors(u, v);
        if (common.length === 0)
            return 0.0;
        let score = 0.0;
        for (const z of common) {
            const degree = this.getNeighbors(z).size;
            // Regularize denominator to avoid ln(1) = 0 division by zero
            const safeDegree = Math.max(2, degree);
            score += 1.0 / Math.log(safeDegree);
        }
        return Number(score.toFixed(4));
    }
    computeJaccard(u, v) {
        const neighborsU = this.getNeighbors(u);
        const neighborsV = this.getNeighbors(v);
        if (neighborsU.size === 0 && neighborsV.size === 0)
            return 0.0;
        let intersectionCount = 0;
        for (const z of neighborsU) {
            if (neighborsV.has(z)) {
                intersectionCount++;
            }
        }
        const unionCount = new Set([...neighborsU, ...neighborsV]).size;
        if (unionCount === 0)
            return 0.0;
        return Number((intersectionCount / unionCount).toFixed(4));
    }
    computeResourceAllocation(u, v) {
        const common = this.computeCommonNeighbors(u, v);
        if (common.length === 0)
            return 0.0;
        let score = 0.0;
        for (const z of common) {
            const degree = this.getNeighbors(z).size;
            score += 1.0 / Math.max(1, degree);
        }
        return Number(score.toFixed(4));
    }
    predictLinks(options = {}) {
        const minScore = options.minScore ?? 0.1;
        const limit = options.limit ?? 20;
        const nodeIds = Array.from(this.adjacency.keys());
        const candidates = [];
        for (let i = 0; i < nodeIds.length; i++) {
            const u = nodeIds[i];
            const neighborsU = this.getNeighbors(u);
            for (let j = i + 1; j < nodeIds.length; j++) {
                const v = nodeIds[j];
                if (neighborsU.has(v))
                    continue; // Already connected
                const shared = this.computeCommonNeighbors(u, v);
                if (shared.length === 0)
                    continue;
                const aa = this.computeAdamicAdar(u, v);
                if (aa >= minScore) {
                    candidates.push({
                        source: u,
                        target: v,
                        adamicAdar: aa,
                        commonNeighbors: shared.length,
                        jaccard: this.computeJaccard(u, v),
                        sharedNeighbors: shared,
                    });
                }
            }
        }
        return candidates.sort((a, b) => b.adamicAdar - a.adamicAdar).slice(0, limit);
    }
}
