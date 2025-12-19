# 📄 AGENT CSS PAGES - Styles Spécifiques aux Pages

## Rôle
Tu es l'agent qui extrait les styles spécifiques aux pages (admin, login) et qui ne sont PAS réutilisables comme composants.

## Prérequis
- ✅ Agent 06-CSS-COMPONENTS terminé (composants de base extraits)

---

## 📁 Fichiers à Créer

```
styles/
└── pages/
    ├── admin.css          ← Styles du panel admin
    └── login.css          ← Styles de la page login
```

---

## 📋 Tâches

### 1. Identifier les styles Admin

Dans `style.css`, trouver tous les styles liés à :
- `.admin-*`
- `.sidebar`, `.sidebar-*`
- `.nav-link` (dans contexte admin)
- `.music-item`, `.music-list`
- `.playlist-*`
- `.modal` (si spécifique admin)
- Tout ce qui est utilisé UNIQUEMENT dans `admin.html`

### 2. Créer pages/admin.css

```css
/* /var/www/html/styles/pages/admin.css */
/**
 * Admin Panel Styles
 * Used: admin.html only
 */

/* ===== LAYOUT ===== */
.admin-wrapper {
  display: flex;
  min-height: 100vh;
}

/* ===== SIDEBAR ===== */
.sidebar {
  width: 250px;
  background: var(--color-bg-secondary);
  border-right: 1px solid var(--color-bg-elevated);
  padding: var(--space-4);
  position: fixed;
  height: 100vh;
  overflow-y: auto;
}

.sidebar-header {
  padding: var(--space-4) 0;
  border-bottom: 1px solid var(--color-bg-elevated);
  margin-bottom: var(--space-4);
}

.sidebar-logo {
  font-family: var(--font-display);
  font-size: var(--font-size-xl);
  color: var(--color-text-primary);
}

.nav-link {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  color: var(--color-text-secondary);
  border-radius: var(--border-radius-md);
  transition: all var(--transition-fast);
  cursor: pointer;
}

.nav-link:hover {
  background: var(--color-bg-elevated);
  color: var(--color-text-primary);
}

.nav-link.active {
  background: var(--color-accent-primary);
  color: var(--color-bg-primary);
}

.nav-link i {
  width: 20px;
  text-align: center;
}

/* ===== MAIN CONTENT ===== */
.admin-main {
  flex: 1;
  margin-left: 250px;
  padding: var(--space-6);
}

.admin-section {
  display: none;
}

.admin-section.active,
.admin-section[style*="display: block"] {
  display: block;
}

.section-header {
  margin-bottom: var(--space-6);
}

.section-header h2 {
  font-family: var(--font-display);
  font-size: var(--font-size-2xl);
  margin: 0 0 var(--space-2);
}

.section-header p {
  color: var(--color-text-secondary);
  margin: 0;
}

/* ===== MUSIC LIST ===== */
.music-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.music-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  background: var(--color-bg-elevated);
  border-radius: var(--border-radius-md);
  transition: background var(--transition-fast);
}

.music-item:hover {
  background: var(--color-bg-surface);
}

.music-item-info {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex: 1;
}

.music-item-actions {
  display: flex;
  gap: var(--space-2);
}

/* ===== PLAYLIST EDITOR ===== */
.playlist-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-4);
}

.playlist-card {
  background: var(--color-bg-elevated);
  border-radius: var(--border-radius-lg);
  padding: var(--space-4);
  border: 1px solid transparent;
  transition: border-color var(--transition-fast);
}

.playlist-card:hover {
  border-color: var(--color-bg-surface);
}

.playlist-card.active {
  border-color: var(--color-accent-success);
}

.playlist-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-3);
}

.playlist-card-title {
  font-weight: 600;
  font-size: var(--font-size-lg);
}

.playlist-card-count {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

/* ===== HARMONIC SUGGESTIONS ===== */
.suggestion-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3);
  background: var(--color-bg-surface);
  border-radius: var(--border-radius-md);
  margin-bottom: var(--space-2);
}

.suggestion-badge {
  display: inline-block;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-xs);
  font-weight: 600;
}

.badge-bpm {
  background: var(--color-accent-warning);
  color: var(--color-bg-primary);
}

.badge-key {
  background: var(--color-accent-info);
  color: var(--color-bg-primary);
}

/* ===== MODALS ===== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
  opacity: 0;
  visibility: hidden;
  transition: all var(--transition-normal);
}

.modal-overlay.active {
  opacity: 1;
  visibility: visible;
}

.modal-content {
  background: var(--color-bg-secondary);
  border-radius: var(--border-radius-lg);
  padding: var(--space-6);
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

/* ===== RESPONSIVE ADMIN ===== */
@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);
    z-index: var(--z-menu);
    transition: transform var(--transition-normal);
  }

  .sidebar.open {
    transform: translateX(0);
  }

  .admin-main {
    margin-left: 0;
  }
}
```

### 3. Identifier les styles Login

Dans `style.css`, trouver tous les styles liés à :
- `.login-*`
- Formulaire de connexion
- Tout ce qui est utilisé UNIQUEMENT dans `login.html`

### 4. Créer pages/login.css

```css
/* /var/www/html/styles/pages/login.css */
/**
 * Login Page Styles
 * Used: login.html only
 */

.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-primary);
}

.login-box {
  background: var(--color-bg-secondary);
  padding: var(--space-8);
  border-radius: var(--border-radius-lg);
  width: 100%;
  max-width: 400px;
  text-align: center;
}

.login-logo {
  font-family: var(--font-display);
  font-size: var(--font-size-2xl);
  margin-bottom: var(--space-6);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.login-input {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-bg-surface);
  border-radius: var(--border-radius-md);
  color: var(--color-text-primary);
  font-size: var(--font-size-base);
  transition: border-color var(--transition-fast);
}

.login-input:focus {
  outline: none;
  border-color: var(--color-accent-primary);
}

.login-btn {
  padding: var(--space-3) var(--space-6);
  background: var(--color-accent-primary);
  color: var(--color-bg-primary);
  border: none;
  border-radius: var(--border-radius-md);
  font-weight: 600;
  cursor: pointer;
  transition: opacity var(--transition-fast);
}

.login-btn:hover {
  opacity: 0.9;
}

.login-error {
  color: var(--color-accent-danger);
  font-size: var(--font-size-sm);
  margin-top: var(--space-2);
}
```

### 5. Mettre à jour les fichiers HTML

Dans `admin.html` :
```html
<link rel="stylesheet" href="styles/main.css" />
<link rel="stylesheet" href="styles/pages/admin.css" />
```

Dans `login.html` :
```html
<link rel="stylesheet" href="styles/main.css" />
<link rel="stylesheet" href="styles/pages/login.css" />
```

---

## ✅ Checklist de Complétion

- [ ] Styles admin identifiés dans style.css
- [ ] pages/admin.css créé
- [ ] Styles login identifiés dans style.css
- [ ] pages/login.css créé
- [ ] Variables CSS utilisées (pas de valeurs hardcodées)
- [ ] admin.html mis à jour avec nouveaux imports
- [ ] login.html mis à jour avec nouveaux imports
- [ ] Test visuel admin : tout fonctionne
- [ ] Test visuel login : tout fonctionne
- [ ] Test responsive admin
- [ ] Commit : "refactor(css): extract page-specific styles"

---

## 🧪 Tests de Validation

1. Ouvrir `/admin.html` - vérifier :
   - Sidebar s'affiche correctement
   - Navigation fonctionne
   - Liste de musique s'affiche
   - Modales s'ouvrent correctement
   - Responsive sur mobile

2. Ouvrir `/login.html` - vérifier :
   - Centrage du formulaire
   - Styles des inputs
   - Hover sur le bouton
