# 🏷️ AGENT HTML STRUCTURE - Refactoring HTML Sémantique

## Rôle
Tu es l'agent qui améliore la structure HTML : sémantique, accessibilité de base, nettoyage du markup.

## Prérequis
- ✅ Agents CSS terminés (styles stables)
- ✅ Agents JS/TS terminés (scripts stables)

---

## 📋 Objectifs

1. **HTML Sémantique** : Utiliser les bonnes balises (`<header>`, `<nav>`, `<main>`, `<article>`, `<section>`, `<footer>`)
2. **Nettoyage** : Supprimer le HTML inline inutile, classes redondantes
3. **Organisation** : Structure cohérente et lisible
4. **Performance** : Optimiser le chargement (lazy loading, preload)

---

## 📄 Fichiers à Traiter

1. `index.html` - Page principale
2. `admin.html` - Panel admin
3. `login.html` - Page de connexion

---

## 📋 Tâches

### 1. Analyser la Structure Actuelle

```bash
# Voir la structure des sections
grep -n "<section\|<div id=\|<nav\|<header\|<footer\|<main\|<article" /var/www/html/index.html
```

### 2. Template de Structure Sémantique

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Grande Maison - Collectif musical">
  <meta name="theme-color" content="#050505">
  
  <title>GRANDE MAISON</title>
  
  <!-- Preload critical resources -->
  <link rel="preload" href="/assets/fonts/Syne-ExtraBoldGMZV4.ttf" as="font" type="font/ttf" crossorigin>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  
  <!-- Styles -->
  <link rel="stylesheet" href="/dist/main.css">
  
  <!-- Favicon -->
  <link rel="icon" type="image/x-icon" href="/favicon.ico">
</head>

<body>
  <!-- Skip to main content (a11y) -->
  <a href="#main-content" class="skip-link">Aller au contenu principal</a>

  <!-- Loading Screen -->
  <div id="loading-screen" class="loading-screen" aria-hidden="true">
    <div class="loading-screen__marquee">
      <!-- Injected by JS -->
    </div>
  </div>

  <!-- Video Intro Overlay -->
  <div id="video-overlay" class="video-overlay" aria-hidden="true">
    <video 
      id="landing-video"
      playsinline
      preload="none"
      poster="/assets/images/landing-poster.jpg"
    >
      <source src="/vid/landing-720p.mp4" type="video/mp4" media="(max-width: 768px)">
      <source src="/vid/landing.mp4" type="video/mp4">
    </video>
  </div>

  <!-- Background Canvas -->
  <canvas id="ascii-bg" class="ascii-background" aria-hidden="true"></canvas>

  <!-- Header -->
  <header class="site-header">
    <button 
      id="menu-toggle" 
      class="menu-toggle"
      aria-label="Ouvrir le menu"
      aria-expanded="false"
      aria-controls="main-nav"
    >
      <span class="menu-toggle__icon">☰</span>
    </button>
  </header>

  <!-- Main Navigation (Overlay) -->
  <nav id="main-nav" class="main-nav" aria-label="Navigation principale" aria-hidden="true">
    <div class="main-nav__lines" aria-hidden="true">
      <!-- Decorative lines -->
    </div>
    
    <button class="main-nav__close" aria-label="Fermer le menu">
      <span aria-hidden="true">×</span>
    </button>

    <ul class="main-nav__list" role="menu">
      <li class="main-nav__item" role="none">
        <a href="#accueil" class="main-nav__link" role="menuitem">
          <span class="main-nav__text">ACCUEIL</span>
          <span class="main-nav__number" aria-hidden="true">01</span>
        </a>
      </li>
      <!-- ... autres items ... -->
    </ul>
  </nav>

  <!-- Radio Controller (Floating) -->
  <aside id="radio-controller" class="radio-controller" aria-label="Contrôles radio">
    <!-- ... -->
  </aside>

  <!-- Scroll Indicator -->
  <div id="scroll-arrow" class="scroll-indicator" aria-hidden="true">
    <span class="scroll-indicator__icon"></span>
  </div>

  <!-- Main Content -->
  <main id="main-content" class="main-content">
    
    <!-- Section: Accueil -->
    <section id="accueil" class="section section--accueil" aria-labelledby="title-accueil">
      <h1 id="title-accueil" class="section__title">GRANDE MAISON</h1>
      <video 
        id="background-video"
        class="section__background-video"
        autoplay 
        loop 
        muted 
        playsinline
        aria-hidden="true"
      >
        <source src="/vid/introboucle.mp4" type="video/mp4">
      </video>
    </section>

    <!-- Section: Radio -->
    <section id="radio" class="section section--radio" aria-labelledby="title-radio">
      <h2 id="title-radio" class="sr-only">Radio en direct</h2>
      
      <div class="radio-player">
        <div class="radio-player__vinyl">
          <!-- Vinyl disc -->
        </div>
        
        <div class="radio-player__info">
          <p class="radio-player__title" aria-live="polite">Titre</p>
          <p class="radio-player__artist">Artiste</p>
        </div>

        <div class="radio-player__controls">
          <button 
            id="play-radio" 
            class="radio-player__play"
            aria-label="Lecture/Pause"
          >
            <span class="radio-player__play-icon"></span>
          </button>
          
          <div class="radio-player__volume">
            <label for="volume-control" class="sr-only">Volume</label>
            <input 
              type="range" 
              id="volume-control"
              min="0" 
              max="100" 
              value="80"
              aria-label="Réglage du volume"
            >
          </div>
        </div>

        <canvas id="visualizer" class="radio-player__visualizer" aria-hidden="true"></canvas>
      </div>
    </section>

    <!-- Section: Artistes (Dynamic) -->
    <div id="artists-container" class="artists-container">
      <!-- Injected by JS -->
    </div>

    <!-- Section: Timeline -->
    <section id="timeline" class="section section--timeline" aria-labelledby="title-timeline">
      <h2 id="title-timeline" class="section__title">TIMELINE</h2>
      <div class="timeline">
        <div class="timeline__track">
          <!-- Posts injected by JS -->
        </div>
      </div>
    </section>

    <!-- Section: Contact -->
    <section id="contact" class="section section--contact" aria-labelledby="title-contact">
      <h2 id="title-contact" class="section__title">CONTACT</h2>
      <address class="contact-info">
        <a href="mailto:contact@grandemaison.com" class="contact-info__email">
          contact@grandemaison.com
        </a>
      </address>
    </section>

  </main>

  <!-- Audio Player (Hidden) -->
  <audio id="radio-player" preload="none">
    <source src="https://stream.grandemaison.com/radio" type="audio/mpeg">
  </audio>

  <!-- Scripts -->
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

### 3. Conventions de Nommage BEM

Adopter la convention BEM pour les classes :

```
.block
.block__element
.block--modifier
.block__element--modifier
```

Exemples :
```html
<!-- Avant -->
<div class="rc-container docked hidden">
  <div class="rc-handle">
    <div class="rc-toggle-btn">

<!-- Après (BEM) -->
<aside class="radio-controller radio-controller--docked radio-controller--hidden">
  <div class="radio-controller__handle">
    <button class="radio-controller__toggle">
```

### 4. Mapping des Classes à Renommer

| Ancien | Nouveau (BEM) |
|--------|---------------|
| `.rc-container` | `.radio-controller` |
| `.rc-handle` | `.radio-controller__handle` |
| `.rc-content` | `.radio-controller__content` |
| `.rc-btn-play` | `.radio-controller__play-btn` |
| `.menu-overlay` | `.main-nav` |
| `.menu-item` | `.main-nav__item` |
| `.menu-link` | `.main-nav__link` |
| `.artiste` | `.artist-section` |
| `.artiste-info` | `.artist-section__info` |
| `.artiste-image` | `.artist-section__image` |

### 5. Attributs d'Accessibilité à Ajouter

```html
<!-- Boutons interactifs -->
<button aria-label="Description de l'action">
<button aria-expanded="false" aria-controls="menu-id">

<!-- Sections -->
<section aria-labelledby="titre-id">
<h2 id="titre-id">Titre</h2>

<!-- Contenu dynamique -->
<div aria-live="polite"><!-- Contenu qui change --></div>

<!-- Images décoratives -->
<img alt="" aria-hidden="true">
<canvas aria-hidden="true">

<!-- Navigation -->
<nav aria-label="Navigation principale">
<ul role="menu">
<li role="none"><a role="menuitem">
```

### 6. Optimisations Performance

```html
<!-- Lazy loading images -->
<img loading="lazy" decoding="async" src="...">

<!-- Preload ressources critiques -->
<link rel="preload" href="font.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="critical.css" as="style">

<!-- Preconnect pour APIs externes -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="dns-prefetch" href="https://stream.example.com">

<!-- Defer scripts non-critiques -->
<script defer src="analytics.js"></script>
```

---

## ✅ Checklist par Fichier

### index.html
- [ ] Structure sémantique (`header`, `main`, `section`, `nav`)
- [ ] Titres hiérarchiques (`h1` → `h2` → `h3`)
- [ ] Classes BEM appliquées
- [ ] Attributs ARIA ajoutés
- [ ] `lang="fr"` sur `<html>`
- [ ] Meta description ajoutée
- [ ] Skip link ajouté
- [ ] Lazy loading sur images
- [ ] Preload des fonts

### admin.html
- [ ] Structure sémantique
- [ ] Classes BEM appliquées
- [ ] Labels sur tous les inputs
- [ ] `aria-label` sur les boutons icône
- [ ] Formulaires accessibles

### login.html
- [ ] Structure simple et claire
- [ ] Label associé au champ password
- [ ] `autocomplete` approprié
- [ ] Message d'erreur accessible

---

## ✅ Checklist de Complétion Finale

- [ ] index.html refactoré
- [ ] admin.html refactoré
- [ ] login.html refactoré
- [ ] Toutes les classes suivent BEM
- [ ] HTML validé (W3C Validator)
- [ ] Pas de balises dépréciées
- [ ] Test visuel OK
- [ ] Commit : "refactor(html): semantic structure and BEM classes"
