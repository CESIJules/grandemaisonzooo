/**
 * In-Memory Search Index & Invalidation Cache Manager
 * La Grande Bibliothèque — Milestone 3
 *
 * Provides sub-10ms search latency across 1,000+ projects by maintaining
 * an in-memory document store and inverted index with atomic mutation hooks.
 */
import { db } from '../db/index.js';
import { projects } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { tokenize } from '../algorithms/tokenizer.js';
export class SearchIndexManager {
    static instance;
    projectCache = new Map();
    invertedIndex = new Map(); // token -> Set<projectId>
    isInitialized = false;
    static getInstance() {
        if (!SearchIndexManager.instance) {
            SearchIndexManager.instance = new SearchIndexManager();
        }
        return SearchIndexManager.instance;
    }
    async initialize() {
        const allProjects = await db.query.projects.findMany({
            with: {
                owner: { columns: { id: true, name: true, email: true } },
                category: true,
                projectTags: { with: { tag: true } },
                blocks: true,
            },
        });
        this.projectCache.clear();
        this.invertedIndex.clear();
        for (const p of allProjects) {
            this.indexProjectInternal(p);
        }
        this.isInitialized = true;
    }
    async ensureInitialized() {
        if (!this.isInitialized) {
            await this.initialize();
        }
    }
    indexProjectInternal(p) {
        const tagList = p.projectTags ? p.projectTags.map((pt) => pt.tag).filter(Boolean) : [];
        const tagNames = tagList.map((t) => (t.name || '').toLowerCase());
        const blockList = [];
        let blockTextCombined = '';
        if (p.blocks && Array.isArray(p.blocks)) {
            for (const b of p.blocks) {
                let textContent = '';
                let parsed = b.content;
                if (typeof parsed === 'string') {
                    try {
                        parsed = JSON.parse(parsed);
                    }
                    catch {
                        parsed = { text: b.content };
                    }
                }
                if (parsed && typeof parsed === 'object') {
                    if (parsed.text)
                        textContent += parsed.text + ' ';
                    if (parsed.markdown)
                        textContent += parsed.markdown + ' ';
                    if (parsed.code)
                        textContent += parsed.code + ' ';
                    if (parsed.caption)
                        textContent += parsed.caption + ' ';
                    if (parsed.title)
                        textContent += parsed.title + ' ';
                    if (parsed.fileName)
                        textContent += parsed.fileName + ' ';
                    if (parsed.url)
                        textContent += parsed.url + ' ';
                    if (Array.isArray(parsed.items)) {
                        for (const item of parsed.items) {
                            if (item && item.text)
                                textContent += item.text + ' ';
                        }
                    }
                    if (Array.isArray(parsed.headers))
                        textContent += parsed.headers.join(' ') + ' ';
                    if (Array.isArray(parsed.rows)) {
                        for (const row of parsed.rows) {
                            if (Array.isArray(row))
                                textContent += row.join(' ') + ' ';
                        }
                    }
                }
                blockList.push({ id: b.id, type: b.type, text: textContent.trim() });
                blockTextCombined += textContent + ' ';
            }
        }
        const fullText = `${p.title || ''} ${p.title || ''} ${p.title || ''} ${tagNames.join(' ')} ${p.description || ''} ${blockTextCombined}`.trim();
        const tokens = tokenize(fullText);
        function parseTimestamp(val) {
            if (val instanceof Date)
                return val;
            if (typeof val === 'number') {
                return val < 10000000000 ? new Date(val * 1000) : new Date(val);
            }
            if (typeof val === 'string') {
                const num = Number(val);
                if (!isNaN(num)) {
                    return num < 10000000000 ? new Date(num * 1000) : new Date(num);
                }
                const d = new Date(val);
                if (!isNaN(d.getTime()))
                    return d;
            }
            return new Date();
        }
        const cached = {
            id: p.id,
            title: p.title || '',
            description: p.description || '',
            space: p.space || 'personal',
            visibility: p.visibility || (p.space === 'shared' ? 'shared' : 'private'),
            ownerId: p.ownerId || '',
            owner: p.owner || { id: p.ownerId || '', name: 'Unknown', email: '' },
            categoryId: p.categoryId || null,
            category: p.category || null,
            tags: tagList,
            tagNames,
            blocks: blockList,
            parentId: p.parentId || null,
            fullText,
            tokenCount: tokens.length,
            createdAt: parseTimestamp(p.createdAt),
            updatedAt: parseTimestamp(p.updatedAt),
        };
        this.projectCache.set(p.id, cached);
        const uniqueTokens = new Set(tokens);
        for (const token of uniqueTokens) {
            if (!this.invertedIndex.has(token)) {
                this.invertedIndex.set(token, new Set());
            }
            this.invertedIndex.get(token).add(p.id);
        }
    }
    async invalidateProject(projectId) {
        this.removeProject(projectId);
        const p = await db.query.projects.findFirst({
            where: eq(projects.id, projectId),
            with: {
                owner: { columns: { id: true, name: true, email: true } },
                category: true,
                projectTags: { with: { tag: true } },
                blocks: true,
            },
        });
        if (p) {
            this.indexProjectInternal(p);
        }
    }
    async indexProject(projectId) {
        return this.invalidateProject(projectId);
    }
    removeProject(projectId) {
        this.projectCache.delete(projectId);
        for (const idSet of this.invertedIndex.values()) {
            idSet.delete(projectId);
        }
    }
    getAccessibleProjects(userId, spaceParam) {
        const list = [];
        for (const p of this.projectCache.values()) {
            if (spaceParam === 'personal') {
                if (p.space === 'personal' && p.ownerId === userId)
                    list.push(p);
            }
            else if (spaceParam === 'shared') {
                if (p.space === 'shared')
                    list.push(p);
            }
            else {
                if (p.space === 'shared' || (p.space === 'personal' && p.ownerId === userId)) {
                    list.push(p);
                }
            }
        }
        return list;
    }
    getProject(projectId) {
        return this.projectCache.get(projectId);
    }
    getAllProjects() {
        return Array.from(this.projectCache.values());
    }
}
export const searchIndexManager = SearchIndexManager.getInstance();
