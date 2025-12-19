# 🧩 AGENT CSS COMPONENTS - Extraction des Composants

## Rôle
Tu es l'agent qui extrait les styles des composants réutilisables du fichier monolithique vers des fichiers modulaires.

## Prérequis
- ✅ Agent 05-CSS-AUDIT terminé (CSS-AUDIT-REPORT.md existe)
- ✅ Lire CSS-AUDIT-REPORT.md avant de commencer

---

## 📁 Fichiers à Créer

```
styles/
├── base/
│   ├── variables.css      ← Variables CSS globales
│   ├── reset.css          ← Reset et styles de base
│   ├── typography.css     ← Styles de texte
│   └── animations.css     ← @keyframes
├── components/
│   ├── buttons.css        ← .btn, .btn-*
│   ├── forms.css          ← input, select, textarea
│   ├── loading.css        ← #loadingScreen, .marquee-*
│   ├── video-overlay.css  ← .video-overlay
│   ├── menu.css           ← .burger, #menu, .menu-*
│   ├── scroll-arrow.css   ← #scrollArrow
│   ├── radio.css          ← #radio, .vinyl-*, .visualizer
│   ├── radio-controller.css ← .rc-*
│   ├── timeline.css       ← .timeline-*, #timeline
│   └── artists.css        ← .artiste, .artiste-*
└── layout/
    ├── sections.css       ← .screen, section styles
    ├── grid.css           ← Grilles et layouts
    └── responsive.css     ← @media queries
```

---

## 📋 Tâches

### 1. Créer base/variables.css

```css
/* /var/www/html/styles/base/variables.css */

:root {
  /* ===== COLORS ===== */
  --color-bg-primary: #050505;
  --color-bg-secondary: #0a0a0a;
  --color-bg-surface: #111;
  --color-bg-elevated: #1a1a1a;
  
  --color-text-primary: #eee;
  --color-text-secondary: #aaa;
  --color-text-muted: #666;
  
  --color-accent-primary: #fff;
  --color-accent-success: #28a745;
  --color-accent-danger: #dc3545;
  --color-accent-warning: #ffc107;
  --color-accent-info: #0dcaf0;
  
  /* ===== TYPOGRAPHY ===== */
  --font-primary: 'Space Grotesk', sans-serif;
  --font-display: 'SyneGMZExtraBold', sans-serif;
  --font-display-bold: 'SyneGMZBold', sans-serif;
  
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.5rem;
  --font-size-2xl: 2rem;
  --font-size-3xl: 3rem;
  
  /* ===== SPACING ===== */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  
  /* ===== BORDERS ===== */
  --border-radius-sm: 4px;
  --border-radius-md: 8px;
  --border-radius-lg: 12px;
  --border-radius-full: 9999px;
  
  /* ===== TRANSITIONS ===== */
  --transition-fast: 150ms ease;
  --transition-normal: 300ms ease;
  --transition-slow: 500ms ease;
  --transition-bounce: 300ms cubic-bezier(0.68, -0.55, 0.265, 1.55);
  
  /* ===== Z-INDEX ===== */
  --z-base: 1;
  --z-dropdown: 100;
  --z-sticky: 500;
  --z-overlay: 900;
  --z-menu: 1000;
  --z-modal: 2000;
  --z-tooltip: 3000;
  --z-loading: 10000;
  
  /* ===== BREAKPOINTS (for reference, use in media queries) ===== */
  /* --bp-sm: 576px; */
  /* --bp-md: 768px; */
  /* --bp-lg: 992px; */
  /* --bp-xl: 1200px; */
}
```

### 2. Créer base/reset.css

Extraire les lignes correspondantes de style.css :
- `*, *::before, *::after { box-sizing: border-box; }`
- `html, body { ... }`
- Styles de base des éléments (a, img, etc.)

### 3. Processus d'Extraction pour Chaque Composant

Pour chaque composant :

1. **Identifier** les lignes dans style.css (via CSS-AUDIT-REPORT.md)
2. **Copier** les styles dans le nouveau fichier
3. **Remplacer** les valeurs hardcodées par des variables CSS
4. **Ajouter** un commentaire header

Exemple pour `components/loading.css` :

```css
/* /var/www/html/styles/components/loading.css */
/**
 * Loading Screen Component
 * Used: index.html - Intro loading animation
 */

#loadingScreen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: var(--color-bg-primary);
  z-index: var(--z-loading);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: opacity var(--transition-slow), visibility var(--transition-slow);
}

#loadingScreen.hidden {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

.marquee-container {
  width: 100%;
  overflow: hidden;
  white-space: nowrap;
}

.marquee-content {
  display: flex;
  width: fit-content;
  animation: scrollRight 8s linear infinite;
}

.marquee-item {
  font-family: var(--font-display);
  font-size: 4vw;
  font-style: italic;
  color: var(--color-text-secondary);
  padding-right: 2vw;
  white-space: nowrap;
}

.marquee-separator {
  font-style: normal;
  display: inline-block;
  margin: 0 0.2em;
}
```

### 4. Créer le fichier principal d'import

```css
/* /var/www/html/styles/main.css */
/**
 * Grande Maison - Main Stylesheet
 * This file imports all modular CSS files
 */

/* Base */
@import 'base/variables.css';
@import 'base/reset.css';
@import 'base/typography.css';
@import 'base/animations.css';

/* Components */
@import 'components/buttons.css';
@import 'components/forms.css';
@import 'components/loading.css';
@import 'components/video-overlay.css';
@import 'components/menu.css';
@import 'components/scroll-arrow.css';
@import 'components/radio.css';
@import 'components/radio-controller.css';
@import 'components/timeline.css';
@import 'components/artists.css';

/* Layout */
@import 'layout/sections.css';
@import 'layout/grid.css';
@import 'layout/responsive.css';
```

---

## ✅ Checklist par Fichier

### Base
- [ ] variables.css créé avec toutes les variables
- [ ] reset.css extrait
- [ ] typography.css extrait (fonts, text styles)
- [ ] animations.css extrait (@keyframes)

### Components
- [ ] buttons.css extrait
- [ ] forms.css extrait
- [ ] loading.css extrait
- [ ] video-overlay.css extrait
- [ ] menu.css extrait
- [ ] scroll-arrow.css extrait
- [ ] radio.css extrait
- [ ] radio-controller.css extrait
- [ ] timeline.css extrait
- [ ] artists.css extrait

### Layout
- [ ] sections.css extrait
- [ ] grid.css extrait
- [ ] responsive.css extrait (toutes les @media)

### Final
- [ ] main.css créé avec tous les @import
- [ ] Valeurs hardcodées remplacées par variables
- [ ] Chaque fichier a un header comment
- [ ] Test visuel : le site a le même aspect

---

## 🧪 Test de Validation

1. Remplacer temporairement dans `index.html` :
```html
<!-- Ancien -->
<link rel="stylesheet" href="style.css" />

<!-- Nouveau (test) -->
<link rel="stylesheet" href="styles/main.css" />
```

2. Vérifier visuellement chaque page
3. Vérifier en responsive (mobile, tablet, desktop)
4. Si OK, committer et passer à l'agent suivant

---

## ⚠️ Points d'Attention

1. **NE PAS** modifier la logique CSS, seulement réorganiser
2. **Garder** le fichier style.css original jusqu'à validation complète
3. **Tester** après chaque composant extrait
4. Les media queries peuvent être dans responsive.css OU dans chaque composant (décider d'une convention)
