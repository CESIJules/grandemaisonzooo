/**
 * Pure TypeScript Markdown + YAML Frontmatter Serializer and Parser
 * La Grande Bibliothèque — Milestone 5 (Feature 27: Markdown Import/Export Portability)
 *
 * Supports:
 *   - YAML frontmatter serialization & robust fallback parsing without external dependencies.
 *   - All 8 polymorphic block types: rich_text, markdown, drawing, checklist, table, media, embed, code.
 *   - Resilient recovery on malformed/corrupted YAML frontmatter.
 *   - Fallback project title detection from top markdown `# Heading`.
 *   - Bidirectional wikilink preservation [[Title | Alias]].
 */
/**
 * Serializes project metadata and content blocks into a Markdown string with YAML frontmatter.
 */
export function serializeMarkdownWithFrontmatter(metadata, bodyOrBlocks) {
    const frontmatterLines = ['---'];
    for (const [key, value] of Object.entries(metadata)) {
        if (value === undefined)
            continue;
        if (Array.isArray(value)) {
            if (value.length === 0) {
                frontmatterLines.push(`${key}: []`);
            }
            else {
                const formattedItems = value.map((v) => typeof v === 'string' ? JSON.stringify(v) : JSON.stringify(v));
                frontmatterLines.push(`${key}: [${formattedItems.join(', ')}]`);
            }
        }
        else if (typeof value === 'object' && value !== null) {
            frontmatterLines.push(`${key}: ${JSON.stringify(value)}`);
        }
        else if (typeof value === 'string') {
            // Escape or quote strings if containing newlines or colons
            if (value.includes('\n') || value.includes(':') || value.includes('#') || value.startsWith('"')) {
                frontmatterLines.push(`${key}: ${JSON.stringify(value)}`);
            }
            else {
                frontmatterLines.push(`${key}: ${value}`);
            }
        }
        else {
            frontmatterLines.push(`${key}: ${value}`);
        }
    }
    frontmatterLines.push('---');
    frontmatterLines.push('');
    if (typeof bodyOrBlocks === 'string') {
        frontmatterLines.push(bodyOrBlocks);
    }
    else if (Array.isArray(bodyOrBlocks)) {
        const sortedBlocks = [...bodyOrBlocks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        for (const block of sortedBlocks) {
            const type = block.type || 'markdown';
            const content = block.content || {};
            switch (type) {
                case 'markdown':
                    frontmatterLines.push(content.markdown || '');
                    break;
                case 'rich_text':
                    frontmatterLines.push(content.text || content.markdown || '');
                    break;
                case 'checklist':
                    if (Array.isArray(content.items)) {
                        for (const item of content.items) {
                            const checkMark = item.checked ? 'x' : ' ';
                            frontmatterLines.push(`- [${checkMark}] ${item.text || ''}`);
                        }
                    }
                    break;
                case 'code': {
                    const lang = content.language || '';
                    const code = content.code || '';
                    frontmatterLines.push(`\`\`\`${lang}`);
                    frontmatterLines.push(code);
                    frontmatterLines.push('```');
                    break;
                }
                case 'drawing':
                    frontmatterLines.push(`<!-- drawing-block: ${JSON.stringify(content)} -->`);
                    break;
                case 'table':
                    if (Array.isArray(content.headers) && content.headers.length > 0) {
                        frontmatterLines.push(`| ${content.headers.join(' | ')} |`);
                        frontmatterLines.push(`| ${content.headers.map(() => '---').join(' | ')} |`);
                        if (Array.isArray(content.rows)) {
                            for (const row of content.rows) {
                                if (Array.isArray(row)) {
                                    frontmatterLines.push(`| ${row.join(' | ')} |`);
                                }
                            }
                        }
                    }
                    break;
                case 'media':
                    frontmatterLines.push(`<!-- block:media ${JSON.stringify(content)} -->`);
                    break;
                case 'embed':
                    frontmatterLines.push(`<!-- block:embed ${JSON.stringify(content)} -->`);
                    break;
                default:
                    frontmatterLines.push(`<!-- block:${type} ${JSON.stringify(content)} -->`);
                    break;
            }
            frontmatterLines.push('');
        }
    }
    return frontmatterLines.join('\n');
}
/**
 * Robust pure TypeScript YAML frontmatter and polymorphic block parser.
 * Recovers gracefully from syntax anomalies or corrupted YAML headers.
 */
export function parseMarkdownWithFrontmatter(markdown) {
    const frontmatter = {};
    let body = markdown;
    // Frontmatter detection
    const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (match) {
        const yamlText = match[1];
        body = match[2];
        const lines = yamlText.split(/\r?\n/);
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#'))
                continue;
            const colonIdx = trimmed.indexOf(':');
            if (colonIdx !== -1) {
                const key = trimmed.slice(0, colonIdx).trim();
                let rawVal = trimmed.slice(colonIdx + 1).trim();
                if (rawVal.startsWith('[') && rawVal.endsWith(']')) {
                    try {
                        frontmatter[key] = JSON.parse(rawVal);
                    }
                    catch {
                        const inner = rawVal.slice(1, -1).trim();
                        if (inner.length === 0) {
                            frontmatter[key] = [];
                        }
                        else {
                            frontmatter[key] = inner
                                .split(',')
                                .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
                                .filter(Boolean);
                        }
                    }
                }
                else if (rawVal.startsWith('{') && rawVal.endsWith('}')) {
                    try {
                        frontmatter[key] = JSON.parse(rawVal);
                    }
                    catch {
                        frontmatter[key] = rawVal;
                    }
                }
                else if (rawVal.startsWith('"') && rawVal.endsWith('"')) {
                    frontmatter[key] = rawVal.slice(1, -1);
                }
                else if (rawVal.startsWith("'") && rawVal.endsWith("'")) {
                    frontmatter[key] = rawVal.slice(1, -1);
                }
                else if (rawVal === 'true') {
                    frontmatter[key] = true;
                }
                else if (rawVal === 'false') {
                    frontmatter[key] = false;
                }
                else if (rawVal === 'null') {
                    frontmatter[key] = null;
                }
                else if (!isNaN(Number(rawVal)) && rawVal !== '') {
                    frontmatter[key] = Number(rawVal);
                }
                else {
                    frontmatter[key] = rawVal;
                }
            }
        }
    }
    else {
        // If no clean matching closing ---, check if starts with --- but corrupted
        if (markdown.startsWith('---')) {
            const closingIndex = markdown.indexOf('---', 3);
            if (closingIndex !== -1) {
                body = markdown.slice(closingIndex + 3).replace(/^\r?\n/, '');
            }
        }
    }
    // Fallback title resolution from top heading if missing in frontmatter
    if (!frontmatter.title) {
        const headingMatch = body.match(/^#\s+(.*)/m);
        if (headingMatch) {
            frontmatter.title = headingMatch[1].trim();
        }
    }
    // Extract polymorphic content blocks from markdown body
    const extractedBlocks = [];
    const lines = body.split(/\r?\n/);
    let idx = 0;
    while (idx < lines.length) {
        const line = lines[idx];
        const trimmed = line.trim();
        // 1. Code Block Fence ```
        if (trimmed.startsWith('```')) {
            const language = trimmed.slice(3).trim();
            const codeLines = [];
            idx++;
            while (idx < lines.length && !lines[idx].trim().startsWith('```')) {
                codeLines.push(lines[idx]);
                idx++;
            }
            extractedBlocks.push({
                type: 'code',
                content: {
                    language: language || 'typescript',
                    code: codeLines.join('\n'),
                },
            });
            idx++;
            continue;
        }
        // 2. Checklist Items (- [ ] or - [x] or - [X])
        if (/^-\s+\[([ xX])\]\s+(.*)$/.test(trimmed)) {
            const checklistItems = [];
            while (idx < lines.length) {
                const itemMatch = lines[idx].trim().match(/^-\s+\[([ xX])\]\s+(.*)$/);
                if (!itemMatch)
                    break;
                checklistItems.push({
                    id: `chk_${checklistItems.length + 1}`,
                    checked: itemMatch[1].toLowerCase() === 'x',
                    text: itemMatch[2].trim(),
                });
                idx++;
            }
            extractedBlocks.push({
                type: 'checklist',
                content: { items: checklistItems },
            });
            continue;
        }
        // 3. Drawing Comment: <!-- drawing-block: ... -->
        if (trimmed.startsWith('<!-- drawing-block:')) {
            const jsonStr = trimmed.replace('<!-- drawing-block:', '').replace('-->', '').trim();
            try {
                extractedBlocks.push({
                    type: 'drawing',
                    content: JSON.parse(jsonStr),
                });
            }
            catch {
                extractedBlocks.push({
                    type: 'drawing',
                    content: { strokes: [] },
                });
            }
            idx++;
            continue;
        }
        // 4. Generic Block Comment: <!-- block:type ... -->
        const blockMatch = trimmed.match(/^<!--\s*block:(\w+)\s+([\s\S]*?)\s*-->$/);
        if (blockMatch) {
            const blockType = blockMatch[1];
            const jsonStr = blockMatch[2];
            try {
                extractedBlocks.push({
                    type: blockType,
                    content: JSON.parse(jsonStr),
                });
            }
            catch {
                extractedBlocks.push({
                    type: blockType,
                    content: {},
                });
            }
            idx++;
            continue;
        }
        // 5. Table Blocks: | Header | Header |
        if (trimmed.startsWith('|') && trimmed.endsWith('|') && lines[idx + 1]?.trim().startsWith('|') && lines[idx + 1]?.includes('---')) {
            const headers = trimmed.split('|').map((s) => s.trim()).filter(Boolean);
            idx += 2; // skip header and delimiter
            const rows = [];
            while (idx < lines.length && lines[idx].trim().startsWith('|')) {
                const rowCols = lines[idx].trim().split('|').map((s) => s.trim()).filter(Boolean);
                rows.push(rowCols);
                idx++;
            }
            extractedBlocks.push({
                type: 'table',
                content: { headers, rows },
            });
            continue;
        }
        // 6. Generic Text / Markdown Block
        if (trimmed.length > 0) {
            const markdownLines = [line];
            idx++;
            while (idx < lines.length &&
                lines[idx].trim().length > 0 &&
                !lines[idx].trim().startsWith('```') &&
                !lines[idx].trim().startsWith('- [') &&
                !lines[idx].trim().startsWith('<!--') &&
                !lines[idx].trim().startsWith('|')) {
                markdownLines.push(lines[idx]);
                idx++;
            }
            extractedBlocks.push({
                type: 'markdown',
                content: { markdown: markdownLines.join('\n') },
            });
            continue;
        }
        idx++;
    }
    return { frontmatter, body, extractedBlocks };
}
