/**
 * Ohara — Seed Script
 * Populates the database with realistic test data.
 * Usage: npm run seed
 */
import crypto from 'node:crypto';
import { sqlite, initDb } from './index.js';
// Ensure schema is up-to-date
initDb(sqlite);
const now = Math.floor(Date.now() / 1000);
const hour = 3600;
const day = 86400;
// Find the first user in the DB or create a default admin user
let userId;
const existingUser = sqlite.prepare('SELECT id FROM users LIMIT 1').get();
if (!existingUser) {
    console.log('[Seed] Aucun utilisateur trouvé. Création de l\'utilisateur admin par défaut...');
    userId = crypto.randomUUID();
    const nowStr = new Date().toISOString();
    sqlite.prepare(`INSERT INTO users (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)`).run(userId, 'admin@grandemaisonzoo.com', '$2b$12$lKgtmcEYAMyw9kkTtSEUCO6rDGYOkVgGzoMl4buaMVxhF16PTbsS2', 'admin', 'admin', nowStr);
}
else {
    userId = existingUser.id;
}
console.log(`[Seed] Seeding data for user: ${userId}`);
// Clear existing seed data (except users) to avoid foreign key and unique constraint errors
sqlite.prepare('DELETE FROM project_tags').run();
sqlite.prepare('DELETE FROM blocks').run();
sqlite.prepare('DELETE FROM projects').run();
sqlite.prepare('DELETE FROM categories').run();
sqlite.prepare('DELETE FROM tags').run();
console.log('[Seed] Cleared existing tables.');
// ─── Categories ──────────────────────────────────────────
const catIds = {
    travail: crypto.randomUUID(),
    creatif: crypto.randomUUID(),
    perso: crypto.randomUUID(),
};
const insertCat = sqlite.prepare(`INSERT OR IGNORE INTO categories (id, name, color, description, created_at) VALUES (?, ?, ?, ?, ?)`);
insertCat.run(catIds.travail, 'Travail', '#3b82f6', 'Projets professionnels', now);
insertCat.run(catIds.creatif, 'Créatif', '#8b5cf6', 'Projets créatifs et design', now);
insertCat.run(catIds.perso, 'Personnel', '#22c55e', 'Projets personnels', now);
console.log('[Seed] 3 categories created.');
// ─── Tags ────────────────────────────────────────────────
const tagIds = {};
const tagNames = ['urgent', 'idée', 'en-cours', 'terminé', 'important'];
const insertTag = sqlite.prepare(`INSERT OR IGNORE INTO tags (id, name, created_at) VALUES (?, ?, ?)`);
for (const name of tagNames) {
    const id = crypto.randomUUID();
    tagIds[name] = id;
    insertTag.run(id, name, now);
}
console.log('[Seed] 5 tags created.');
const seedProjects = [
    {
        id: crypto.randomUUID(),
        title: 'Roadmap Produit Q4',
        description: 'Planification stratégique du quatrième trimestre',
        categoryId: catIds.travail,
        tags: ['urgent', 'en-cours'],
        createdAgo: 2 * hour,
        blocks: [
            {
                type: 'rich_text',
                content: { text: "# Objectifs Q4\n\nCe trimestre, nous nous concentrons sur trois axes majeurs :\n\n1. **Acquisition** — Doubler le nombre d'utilisateurs actifs\n2. **Rétention** — Améliorer le taux de rétention de 15%\n3. **Monétisation** — Lancer l'offre premium\n\nLe lancement est prévu pour le 15 novembre." },
                x: 60, y: 60, w: 380, h: 280,
            },
            {
                type: 'checklist',
                content: { items: [
                        { text: 'Définir les KPIs', checked: true },
                        { text: 'Valider le budget marketing', checked: true },
                        { text: 'Recruter 2 développeurs', checked: false },
                        { text: 'Finaliser le design de la landing', checked: false },
                        { text: 'Préparer la démo investisseurs', checked: false },
                    ] },
                x: 480, y: 60, w: 340, h: 260,
            },
            {
                type: 'markdown',
                content: { text: "## Notes de réunion\n\n- Pierre propose de décaler le lancement d'une semaine\n- Marie valide le budget com\n- **Action** : Raq doit finaliser les maquettes avant vendredi\n\n> \"On est dans les temps, faut juste pas relâcher\" — Pierre" },
                x: 60, y: 380, w: 380, h: 240,
            },
        ],
    },
    {
        id: crypto.randomUUID(),
        title: 'Design System V2',
        description: 'Refonte complète du design system',
        categoryId: catIds.creatif,
        tags: ['en-cours', 'important'],
        createdAgo: 1 * day,
        blocks: [
            {
                type: 'rich_text',
                content: { text: "# Design System V2\n\nPrincipes fondamentaux :\n\n- **Flat design** — Pas de glassmorphism, pas de shadows excessives\n- **Monochrome** — Couleurs uniquement fonctionnelles\n- **Espacement** — Utiliser une grille de 8px\n- **Typographie** — Inter pour le corps, JetBrains Mono pour le code\n\nLa V2 doit être 100% accessible (WCAG AA minimum)." },
                x: 60, y: 60, w: 400, h: 300,
            },
            {
                type: 'checklist',
                content: { items: [
                        { text: 'Palette de couleurs', checked: true },
                        { text: 'Composants boutons', checked: true },
                        { text: 'Composants formulaires', checked: false },
                        { text: 'Composants navigation', checked: false },
                        { text: 'Documentation Storybook', checked: false },
                    ] },
                x: 500, y: 60, w: 340, h: 260,
            },
        ],
    },
    {
        id: crypto.randomUUID(),
        title: 'Notes Réunion Équipe',
        description: 'Comptes rendus hebdomadaires',
        categoryId: catIds.travail,
        tags: ['en-cours'],
        createdAgo: 3 * day,
        blocks: [
            {
                type: 'markdown',
                content: { text: "## Réunion du 22 août\n\n**Présents** : Raq, Marie, Pierre, Alex\n\n### Points abordés\n\n1. Avancement du sprint 14\n2. Retours utilisateurs sur la beta\n3. Planning vacances septembre\n\n### Décisions\n\n- On reporte la feature \"export PDF\" au sprint 16\n- Marie prend le lead sur l'onboarding\n- Prochaine réunion : mardi 26 août à 10h" },
                x: 60, y: 60, w: 420, h: 340,
            },
            {
                type: 'checklist',
                content: { items: [
                        { text: "Envoyer le CR à toute l'équipe", checked: false },
                        { text: 'Mettre à jour le Kanban', checked: false },
                        { text: 'Bloquer le créneau mardi prochain', checked: true },
                    ] },
                x: 520, y: 60, w: 320, h: 200,
            },
        ],
    },
    {
        id: crypto.randomUUID(),
        title: 'Recherche UX Mobile',
        description: "Étude utilisateur pour l'app mobile",
        categoryId: catIds.creatif,
        tags: ['idée', 'important'],
        createdAgo: 5 * day,
        blocks: [
            {
                type: 'rich_text',
                content: { text: "# Recherche UX Mobile\n\n## Contexte\n\nLes utilisateurs mobiles représentent 68% de notre trafic mais seulement 23% des conversions. Il y a clairement un problème d'expérience.\n\n## Hypothèses\n\n1. Le formulaire d'inscription est trop long sur mobile\n2. La navigation principale n'est pas intuitive\n3. Les temps de chargement sont trop longs sur 4G" },
                x: 60, y: 60, w: 420, h: 360,
            },
            {
                type: 'markdown',
                content: { text: "## Résultats préliminaires\n\n| Métrique | Avant | Après |\n|----------|-------|-------|\n| Temps inscription | 4min30 | 1min45 |\n| Taux abandon | 67% | 34% |\n| Score SUS | 54 | 72 |\n\n> Les résultats sont encourageants." },
                x: 520, y: 60, w: 380, h: 280,
            },
        ],
    },
    {
        id: crypto.randomUUID(),
        title: 'Idées Brainstorm',
        description: "Vrac d'idées à explorer",
        categoryId: catIds.perso,
        tags: ['idée'],
        createdAgo: 7 * day,
        blocks: [
            {
                type: 'rich_text',
                content: { text: "# Brainstorm\n\nToutes les idées en vrac, à trier plus tard.\n\n- App de suivi d'habitudes minimaliste\n- Newsletter tech hebdo en français\n- Outil de génération de palettes couleurs\n- Plugin VSCode pour les TODO intelligents\n- Bot Discord pour les daily standups" },
                x: 60, y: 60, w: 380, h: 260,
            },
            {
                type: 'checklist',
                content: { items: [
                        { text: 'Évaluer la faisabilité de chaque idée', checked: false },
                        { text: 'Faire un mini business plan', checked: false },
                        { text: 'Identifier les concurrents', checked: false },
                        { text: 'Choisir 1 idée à prototyper', checked: false },
                    ] },
                x: 480, y: 60, w: 340, h: 220,
            },
            {
                type: 'markdown',
                content: { text: "## Critères de sélection\n\n1. **Impact** — Est-ce que ça résout un vrai problème ?\n2. **Effort** — Combien de temps pour un MVP ?\n3. **Marché** — Est-ce qu'il y a une demande ?\n4. **Passion** — Est-ce que ça me motive vraiment ?\n\nObjectif : choisir avant fin septembre." },
                x: 60, y: 360, w: 380, h: 240,
            },
        ],
    },
];
const insertProject = sqlite.prepare(`INSERT OR IGNORE INTO projects (id, title, description, space, visibility, owner_id, category_id, status, parent_id, canvas_pan_x, canvas_pan_y, canvas_zoom, created_at, updated_at) VALUES (?, ?, ?, 'personal', 'private', ?, ?, 'active', ?, 0, 0, 1.0, ?, ?)`);
const insertBlock = sqlite.prepare(`INSERT OR IGNORE INTO blocks (id, project_id, type, content, "order", canvas_x, canvas_y, canvas_w, canvas_h, canvas_z, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
const insertProjectTag = sqlite.prepare(`INSERT OR IGNORE INTO project_tags (project_id, tag_id) VALUES (?, ?)`);
for (const proj of seedProjects) {
    const createdAt = now - proj.createdAgo;
    insertProject.run(proj.id, proj.title, proj.description, userId, proj.categoryId, null, createdAt, createdAt);
    for (let i = 0; i < proj.blocks.length; i++) {
        const block = proj.blocks[i];
        const blockId = crypto.randomUUID();
        insertBlock.run(blockId, proj.id, block.type, JSON.stringify(block.content), i, block.x, block.y, block.w, block.h, i, createdAt, createdAt);
    }
    for (const tagName of proj.tags) {
        if (tagIds[tagName]) {
            insertProjectTag.run(proj.id, tagIds[tagName]);
        }
    }
}
console.log(`[Seed] ${seedProjects.length} projets créés avec blocs et tags.`);
// ─── Sous-projets (liés à des projets existants) ─────────
const subProjectsData = [
    {
        id: crypto.randomUUID(),
        title: 'Moodboard Couleurs',
        description: 'Planche tendance pour la palette couleurs V2',
        parentId: seedProjects[1].id, // Sous-projet de "Design System V2"
        categoryId: catIds.creatif,
        tags: ['idée'],
        createdAgo: 12 * hour,
    },
    {
        id: crypto.randomUUID(),
        title: 'Sprint Planning',
        description: 'Organisation des sprints du trimestre',
        parentId: seedProjects[0].id, // Sous-projet de "Roadmap Produit Q4"
        categoryId: catIds.travail,
        tags: ['en-cours', 'urgent'],
        createdAgo: 4 * hour,
    },
    {
        id: crypto.randomUUID(),
        title: 'Prototypage App',
        description: 'Premier prototype de l\'app habitudes',
        parentId: seedProjects[4].id, // Sous-projet de "Idées Brainstorm"
        categoryId: catIds.perso,
        tags: ['idée'],
        createdAgo: 2 * day,
    },
];
for (const sub of subProjectsData) {
    const createdAt = now - sub.createdAgo;
    insertProject.run(sub.id, sub.title, sub.description, userId, sub.categoryId, sub.parentId, createdAt, createdAt);
    for (const tagName of sub.tags) {
        if (tagIds[tagName]) {
            insertProjectTag.run(sub.id, tagIds[tagName]);
        }
    }
}
console.log(`[Seed] ${subProjectsData.length} sous-projets créés.`);
console.log('[Seed] Terminé ! Lancez "npm run dev" pour voir les données.');
