# ♿ AGENT ACCESSIBILITÉ - Audit et Améliorations A11Y

## Rôle
Tu es l'agent spécialisé en accessibilité web (WCAG 2.1). Tu audites et corriges les problèmes d'accessibilité.

## Prérequis
- ✅ Agent 11-HTML-STRUCTURE terminé

---

## 📋 Checklist WCAG 2.1 (Niveau AA)

### 1. Perceptible

#### 1.1 Alternatives Textuelles
- [ ] Toutes les images ont un `alt` descriptif ou `alt=""` si décoratives
- [ ] Les icônes interactives ont un `aria-label`
- [ ] Les canvas ont une alternative textuelle

```html
<!-- Image informative -->
<img src="artist.jpg" alt="Portrait de Nelson North en studio">

<!-- Image décorative -->
<img src="decoration.svg" alt="" aria-hidden="true">

<!-- Icône bouton -->
<button aria-label="Lecture">
  <i class="fas fa-play" aria-hidden="true"></i>
</button>
```

#### 1.2 Médias Temporels
- [ ] Les vidéos ont des contrôles accessibles
- [ ] Option de sous-titres si contenu parlé
- [ ] Alternative textuelle pour vidéos d'ambiance

#### 1.3 Adaptable
- [ ] Structure de titres logique (h1 → h2 → h3)
- [ ] Landmarks ARIA (`role` ou balises sémantiques)
- [ ] Ordre de lecture logique dans le DOM

#### 1.4 Distinguable
- [ ] Contraste minimum 4.5:1 pour le texte
- [ ] Contraste minimum 3:1 pour les grands textes
- [ ] Texte redimensionnable jusqu'à 200%
- [ ] Pas de perte d'info en zoom 400%

```bash
# Vérifier les contrastes avec un outil
# Utiliser : https://webaim.org/resources/contrastchecker/
# Couleurs du site : 
# - Background: #050505
# - Text: #eee (ratio ~14:1 ✅)
# - Text secondary: #aaa (ratio ~8:1 ✅)
# - Text muted: #666 (ratio ~3.5:1 ⚠️ borderline)
```

### 2. Utilisable

#### 2.1 Accessibilité au Clavier
- [ ] Tous les éléments interactifs sont focusables
- [ ] Pas de piège au clavier
- [ ] Ordre de tabulation logique
- [ ] Focus visible sur tous les éléments

```css
/* Styles de focus visibles */
:focus-visible {
  outline: 2px solid var(--color-accent-primary);
  outline-offset: 2px;
}

/* Ne pas supprimer le focus ! */
/* ❌ *:focus { outline: none; } */
```

#### 2.2 Assez de Temps
- [ ] Pas de timeout sans avertissement
- [ ] Animations peuvent être pausées
- [ ] Respect de `prefers-reduced-motion`

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

#### 2.3 Crises et Réactions Physiques
- [ ] Pas de flash > 3 fois/seconde
- [ ] Option pour désactiver les animations

#### 2.4 Navigable
- [ ] Skip link vers le contenu principal
- [ ] Titres de page descriptifs
- [ ] Focus management dans les modales
- [ ] Indication de la page courante dans la nav

```html
<!-- Skip link -->
<a href="#main-content" class="skip-link">
  Aller au contenu principal
</a>

<style>
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  padding: 8px 16px;
  z-index: 10001;
  transition: top 0.2s;
}

.skip-link:focus {
  top: 0;
}
</style>
```

#### 2.5 Modalités d'Entrée
- [ ] Pas de gestures complexes obligatoires
- [ ] Cibles tactiles min 44x44px
- [ ] Pas d'actions sur keydown seul

### 3. Compréhensible

#### 3.1 Lisible
- [ ] Langue de la page définie (`lang="fr"`)
- [ ] Langue des passages en langue étrangère

#### 3.2 Prévisible
- [ ] Pas de changement de contexte inattendu
- [ ] Navigation cohérente
- [ ] Identification cohérente

#### 3.3 Assistance à la Saisie
- [ ] Labels associés aux champs
- [ ] Messages d'erreur explicites
- [ ] Suggestions de correction

```html
<div class="form-group">
  <label for="email">Adresse email</label>
  <input 
    type="email" 
    id="email" 
    name="email"
    aria-describedby="email-error"
    aria-invalid="false"
  >
  <span id="email-error" class="error-message" aria-live="polite">
    <!-- Message d'erreur dynamique -->
  </span>
</div>
```

### 4. Robuste

#### 4.1 Compatible
- [ ] HTML valide
- [ ] ARIA utilisé correctement
- [ ] Nom et rôle des composants personnalisés

---

## 📋 Tâches Spécifiques au Site

### 1. Radio Player

```html
<div class="radio-player" role="region" aria-label="Lecteur radio">
  <!-- Status annoncé aux lecteurs d'écran -->
  <div class="sr-only" aria-live="polite" id="radio-status">
    En pause
  </div>
  
  <button 
    id="play-radio"
    aria-label="Lecture"
    aria-pressed="false"
  >
    <i class="fas fa-play" aria-hidden="true"></i>
  </button>
  
  <!-- Volume slider -->
  <div class="volume-control">
    <label for="volume" class="sr-only">Volume</label>
    <input 
      type="range" 
      id="volume"
      min="0" 
      max="100" 
      value="80"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow="80"
      aria-valuetext="Volume à 80%"
    >
  </div>
  
  <!-- Track info -->
  <div aria-live="polite" aria-atomic="true">
    <p class="track-title">Titre de la chanson</p>
    <p class="track-artist">Nom de l'artiste</p>
  </div>
</div>
```

### 2. Menu Navigation

```html
<nav id="main-nav" aria-label="Navigation principale">
  <button 
    id="menu-close"
    aria-label="Fermer le menu"
  >
    <i class="fas fa-times" aria-hidden="true"></i>
  </button>
  
  <ul role="menubar">
    <li role="none">
      <a 
        href="#accueil" 
        role="menuitem"
        aria-current="page"
      >
        Accueil
      </a>
    </li>
    <li role="none">
      <a href="#radio" role="menuitem">Radio</a>
    </li>
    <!-- ... -->
  </ul>
</nav>
```

```javascript
// Focus trap dans le menu
function trapFocus(element) {
  const focusableElements = element.querySelectorAll(
    'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
  );
  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];

  element.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable.focus();
      } else if (!e.shiftKey && document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable.focus();
      }
    }
  });
}
```

### 3. Timeline

```html
<section 
  id="timeline" 
  aria-labelledby="timeline-title"
  aria-describedby="timeline-desc"
>
  <h2 id="timeline-title">Timeline</h2>
  <p id="timeline-desc" class="sr-only">
    Chronologie des événements et sorties du collectif
  </p>
  
  <div 
    class="timeline-track" 
    role="list"
    aria-label="Événements"
  >
    <article 
      class="timeline-post"
      role="listitem"
    >
      <time datetime="2024-03-15">15 mars 2024</time>
      <h3>Titre de l'événement</h3>
      <p>Description...</p>
    </article>
  </div>
</section>
```

### 4. Classes CSS Utilitaires A11Y

```css
/* Masquer visuellement mais garder pour lecteurs d'écran */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Rendre visible au focus */
.sr-only-focusable:focus {
  position: static;
  width: auto;
  height: auto;
  overflow: visible;
  clip: auto;
  white-space: normal;
}

/* Réduire les mouvements */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  :root {
    --color-text-primary: #fff;
    --color-bg-primary: #000;
  }
}
```

---

## 🧪 Tests d'Accessibilité

### Outils Automatiques

```bash
# Lighthouse (dans Chrome DevTools)
# Onglet Lighthouse > Accessibility

# axe DevTools (extension Chrome)
# https://www.deque.com/axe/devtools/

# WAVE (extension)
# https://wave.webaim.org/
```

### Tests Manuels

1. **Navigation clavier uniquement**
   - Tab à travers toute la page
   - Vérifier que le focus est toujours visible
   - Tester Entrée/Espace sur les boutons
   - Tester Échap pour fermer les modales

2. **Lecteur d'écran**
   - VoiceOver (Mac) : Cmd + F5
   - NVDA (Windows) : gratuit
   - Vérifier que le contenu est annoncé correctement

3. **Zoom**
   - Zoomer à 200% : pas de perte de contenu
   - Zoomer à 400% : navigation possible

4. **Mode daltonien**
   - Extension Chrome "Colorblind"
   - Vérifier que l'info n'est pas transmise par la couleur seule

---

## ✅ Checklist de Complétion

### Structure
- [ ] Skip link fonctionnel
- [ ] Landmarks ARIA présents
- [ ] Titres hiérarchiques corrects
- [ ] Lang défini sur html

### Images & Médias
- [ ] Alt sur toutes les images
- [ ] Icônes avec aria-label
- [ ] Vidéos avec contrôles

### Formulaires
- [ ] Labels sur tous les champs
- [ ] Messages d'erreur accessibles
- [ ] Autocomplete approprié

### Interactivité
- [ ] Focus visible partout
- [ ] Pas de piège clavier
- [ ] Reduced motion respecté
- [ ] Focus trap dans modales

### Contrastes
- [ ] Texte : ratio ≥ 4.5:1
- [ ] Grands textes : ratio ≥ 3:1
- [ ] Éléments UI : ratio ≥ 3:1

### Tests
- [ ] Lighthouse score ≥ 90
- [ ] axe : 0 erreurs critiques
- [ ] Test clavier complet
- [ ] Test lecteur d'écran

- [ ] Commit : "feat(a11y): accessibility improvements WCAG 2.1 AA"
