# 📦 AGENT INVENTAIRE - Cartographie Exhaustive

## Rôle
Tu es l'agent qui crée l'inventaire COMPLET du code existant. Tu ne modifies RIEN, tu documentes TOUT.

## Mission
Générer un fichier `INVENTORY.md` avec la liste exhaustive de :
- Chaque fonction JavaScript
- Chaque classe CSS
- Chaque bloc HTML significatif
- Chaque endpoint PHP
- Chaque variable globale

---

## 📋 Tâches

### 1. Inventaire JavaScript (script.js + admin.js)

```bash
# Extraire toutes les fonctions
grep -n "function \|const .* = (" /var/www/html/script.js
grep -n "function \|const .* = (" /var/www/html/admin.js
```

Pour chaque fonction, documenter :
```markdown
| Fonction | Fichier | Ligne | Description | Dépendances | Module Cible |
|----------|---------|-------|-------------|-------------|--------------|
| loadArtists() | script.js | 30 | Charge les artistes depuis l'API | fetch, escapeHtml | artists.ts |
| setupVisualizer() | script.js | 570 | Initialise l'audio visualizer | audioContext | radio.ts |
```

### 2. Inventaire CSS (style.css)

```bash
# Extraire toutes les classes et IDs
grep -oE '\.[a-zA-Z][a-zA-Z0-9_-]*|#[a-zA-Z][a-zA-Z0-9_-]*' /var/www/html/style.css | sort -u
```

Pour chaque classe, documenter :
```markdown
| Sélecteur | Ligne | Composant | Fichier Cible |
|-----------|-------|-----------|---------------|
| .burger | 145 | Navigation | components/menu.css |
| .rc-container | 890 | Radio Controller | components/radio.css |
| #loadingScreen | 34 | Intro | components/loading.css |
```

### 3. Inventaire HTML (index.html + admin.html)

Lister chaque section/composant majeur :
```markdown
| Élément | ID/Class | Fichier | Ligne | Description |
|---------|----------|---------|-------|-------------|
| <div> | #loadingScreen | index.html | 28 | Écran de chargement |
| <nav> | #menu | index.html | 125 | Menu overlay |
| <section> | #radio | index.html | 180 | Section lecteur radio |
```

### 4. Inventaire PHP

```bash
# Lister tous les fichiers PHP
ls -la /var/www/html/*.php
```

Pour chaque fichier :
```markdown
| Fichier | Type | Auth Required | Méthode | Description | Nouveau Chemin |
|---------|------|---------------|---------|-------------|----------------|
| auth.php | API | Non | POST | Login | api/auth/login.php |
| get_playlists.php | API | Non | GET | Liste playlists | api/playlists/list.php |
| playlists.php | Classe | - | - | PlaylistManager | includes/PlaylistManager.php |
```

### 5. Variables Globales JS

```bash
grep -n "^let \|^const \|^var " /var/www/html/script.js | head -50
```

```markdown
| Variable | Type | Fichier | Ligne | Usage | Refacto |
|----------|------|---------|-------|-------|---------|
| isNavigating | boolean | script.js | 6 | État navigation | NavigationState.isNavigating |
| audioContext | AudioContext | script.js | 580 | Web Audio API | RadioModule.audioContext |
```

---

## 📄 Output Attendu

Créer le fichier `/var/www/html/.agents/INVENTORY.md` avec toutes ces tables remplies.

---

## ✅ Checklist de Complétion

- [ ] Toutes les fonctions JS listées (script.js)
- [ ] Toutes les fonctions JS listées (admin.js)
- [ ] Toutes les classes CSS listées
- [ ] Tous les IDs CSS listés
- [ ] Tous les blocs HTML majeurs listés
- [ ] Tous les fichiers PHP documentés
- [ ] Toutes les variables globales identifiées
- [ ] Fichier INVENTORY.md créé et committé

---

## Commandes Utiles

```bash
# Compter les fonctions
grep -c "function " /var/www/html/script.js

# Compter les classes CSS
grep -oE '\.[a-zA-Z][a-zA-Z0-9_-]*' /var/www/html/style.css | sort -u | wc -l

# Voir la structure HTML
grep -n "<section\|<div id=\|<nav\|<header\|<footer\|<main" /var/www/html/index.html
```
