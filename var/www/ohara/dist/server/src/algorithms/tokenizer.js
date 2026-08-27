/**
 * Multilingual Text Tokenizer & Normalizer
 * La Grande Bibliothèque — Milestone 3
 *
 * Deterministic text processing supporting French & English,
 * diacritic normalization, hyphenated music term preservation,
 * domain stopword filtering, and bi-gram generation.
 */
// Protected music & production domain terms that must NEVER be filtered as stopwords
export const PROTECTED_TERMS = new Set([
    '808', '909', '303', '3', '707', '606', '8', '16', '24', '32',
    'bpm', 'eq', 'dj', 'mc', 'ep', 'lp', 'vst', 'daw', 'fm', 'am',
    'midi', 'hz', 'khz', 'db', 'lfo', 'vco', 'vcf', 'vca', 'adsr',
    'cv', 'gate', 'pan', 'aux', 'bus', 'fx', 'dry', 'wet', 'mix',
    'hi-hats', 'sub-bass', 'tr-808', 'tr-909', 'tb-303', 'sub-37',
    'x-fade', 'pre-amp', 'juno-106', 'moog', 'korg', 'roland', 'ableton'
]);
// French & English comprehensive stopword dictionary
export const STOPWORDS = new Set([
    // English Stopwords
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and',
    'any', 'are', 'aren\'t', 'as', 'at', 'be', 'because', 'been', 'before', 'being',
    'below', 'between', 'both', 'but', 'by', 'can\'t', 'cannot', 'could', 'couldn\'t',
    'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing', 'don\'t', 'down', 'during',
    'each', 'few', 'for', 'from', 'further', 'had', 'hadn\'t', 'has', 'hasn\'t',
    'have', 'haven\'t', 'having', 'he', 'he\'d', 'he\'ll', 'he\'s', 'her', 'here',
    'here\'s', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'how\'s', 'i',
    'i\'d', 'i\'ll', 'i\'m', 'i\'ve', 'if', 'in', 'into', 'is', 'isn\'t', 'it',
    'it\'s', 'its', 'itself', 'let\'s', 'me', 'more', 'most', 'mustn\'t', 'my',
    'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other',
    'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'shan\'t',
    'she', 'she\'d', 'she\'ll', 'she\'s', 'should', 'shouldn\'t', 'so', 'some',
    'such', 'than', 'that', 'that\'s', 'the', 'their', 'theirs', 'them',
    'themselves', 'then', 'there', 'there\'s', 'these', 'they', 'they\'d',
    'they\'ll', 'they\'re', 'they\'ve', 'this', 'those', 'through', 'to', 'too',
    'under', 'until', 'up', 'very', 'was', 'wasn\'t', 'we', 'we\'d', 'we\'ll',
    'we\'re', 'we\'ve', 'were', 'weren\'t', 'what', 'what\'s', 'when', 'when\'s',
    'where', 'where\'s', 'which', 'while', 'who', 'who\'s', 'whom', 'why',
    'why\'s', 'with', 'won\'t', 'would', 'wouldn\'t', 'you', 'you\'d', 'you\'ll',
    'you\'re', 'you\'ve', 'your', 'yours', 'yourself', 'yourselves',
    // French Stopwords
    'alors', 'au', 'aucuns', 'aussi', 'autre', 'avant', 'avec', 'avoir', 'bon',
    'car', 'ce', 'cela', 'ces', 'cet', 'cette', 'ceux', 'chaque', 'ci', 'comme', 'comment',
    'dans', 'des', 'du', 'dedans', 'dehors', 'depuis', 'deux', 'devrait', 'doit',
    'donc', 'dos', 'droite', 'debut', 'elle', 'elles', 'en', 'encore', 'essai',
    'est', 'et', 'etaient', 'etat', 'ete', 'etions', 'etre', 'eu', 'fait',
    'faites', 'fois', 'font', 'hors', 'ici', 'il', 'ils', 'je', 'juste', 'la',
    'le', 'les', 'leur', 'leurs', 'lui', 'ma', 'maintenant', 'mais', 'mes',
    'mine', 'moins', 'mon', 'mot', 'meme', 'ni', 'nommes', 'notre', 'nous',
    'nouveaux', 'ou', 'par', 'parce', 'parole', 'pas', 'personnes', 'peut',
    'peu', 'piece', 'plupart', 'pour', 'pourquoi', 'quand', 'que', 'quel',
    'quelle', 'quelles', 'quels', 'qui', 'sa', 'sans', 'ses', 'seulement',
    'si', 'sien', 'son', 'sont', 'sous', 'soyez', 'sujet', 'sur', 'ta', 'tandis',
    'tellement', 'tels', 'tes', 'ton', 'tous', 'tout', 'trop', 'tres', 'tu',
    'valeur', 'voie', 'voient', 'vont', 'votre', 'vous', 'vu', 'ca', 'etaient',
    'etat', 'etions', 'ete', 'etre', 'de', 'un', 'une', 'd', 'l', 'j', 'm', 't', 's', 'n', 'c', 'qu'
]);
/**
 * Normalizes a text string: diacritics, ligatures, contractions, hyphens.
 */
export function normalizeText(text, options = {}) {
    if (!text || typeof text !== 'string')
        return '';
    let normalized = text;
    // 1. Explicit ligature and special character substitutions
    normalized = normalized
        .replace(/[œŒ]/g, 'oe')
        .replace(/[æÆ]/g, 'ae')
        .replace(/[øØ]/g, 'o')
        .replace(/ß/g, 'ss')
        .replace(/[çÇ]/g, 'c');
    // 2. Diacritic stripping via Unicode Normalization Form KD (NFD)
    if (options.stripAccents !== false) {
        normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }
    // 3. Lowercasing
    if (options.lowercase !== false) {
        normalized = normalized.toLowerCase();
    }
    // 4. French elisions detachment (l'art -> art, d'accord -> accord, c'est -> est)
    normalized = normalized.replace(/\b([ldjcmtns]|qu)['’]/gi, ' ');
    // 5. English contractions normalization (artist's -> artist)
    normalized = normalized.replace(/['’]s\b/gi, '');
    // 6. Replace non-alphanumeric punctuation (except hyphen and underscore) with whitespace
    normalized = normalized.replace(/[^\w\s-]/g, ' ');
    return normalized;
}
/**
 * Extracts normalized word tokens from text, filtering stopwords and preserving domain terms.
 */
export function tokenize(text, options = {}) {
    if (!text || typeof text !== 'string')
        return [];
    const filterStop = options.filterStopwords !== false;
    const minLen = options.minWordLength ?? 1;
    const customStop = options.customStopwords;
    const normalized = normalizeText(text, options);
    const rawTokens = normalized.split(/\s+/);
    const tokens = [];
    for (const raw of rawTokens) {
        // Strip leading/trailing hyphens/underscores
        const t = raw.replace(/^[-_]+|[-_]+$/g, '').trim();
        if (!t || t.length < minLen)
            continue;
        const isProtected = PROTECTED_TERMS.has(t);
        if (filterStop && !isProtected) {
            if (STOPWORDS.has(t))
                continue;
            if (customStop && customStop.has(t))
                continue;
        }
        tokens.push(t);
    }
    if (options.includeBigrams) {
        const bigrams = extractBigrams(tokens);
        return [...tokens, ...bigrams];
    }
    return tokens;
}
/**
 * Generates phrase bi-grams from an array of tokens (e.g. ['modular', 'synth'] -> ['modular_synth']).
 */
export function extractBigrams(tokens) {
    if (!tokens || tokens.length < 2)
        return [];
    const bigrams = [];
    for (let i = 0; i < tokens.length - 1; i++) {
        bigrams.push(`${tokens[i]}_${tokens[i + 1]}`);
    }
    return bigrams;
}
