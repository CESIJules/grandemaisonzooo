# 📦 AGENT JS MODULES - Découpage en Modules ES

## Rôle
Tu es l'agent qui découpe les fichiers `script.js` et `admin.js` monolithiques en modules ES organisés par fonctionnalité.

## Prérequis
- ✅ Agent 08-JS-UTILS terminé (utilitaires disponibles)
- ✅ Agent 01-INVENTORY terminé (fonctions listées)

---

## 📊 Analyse du Code à Découper

### script.js (~3400 lignes) → Modules

| Bloc | Lignes (env.) | Module Cible | Priorité |
|------|---------------|--------------|----------|
| Variables globales | 1-20 | NavigationState | 🔴 |
| loadArtists() | 30-110 | modules/artists/ArtistLoader | 🟠 |
| setMainHeight() | 115-140 | modules/navigation/ViewportManager | 🟡 |
| smoothScrollTo() | 155-190 | modules/navigation/ScrollManager | 🟠 |
| Landing Video | 195-320 | modules/intro/VideoOverlay | 🟠 |
| Loading Screen | 255-310 | modules/intro/LoadingScreen | 🟠 |
| Burger Menu | 330-500 | modules/navigation/Menu | 🟠 |
| Radio Player | 530-900 | modules/radio/RadioPlayer | 🔴 |
| Visualizer | 570-750 | modules/radio/Visualizer | 🟠 |
| Radio Controller | 1200-1500 | modules/radio/RadioController | 🟠 |
| Timeline | 1600-2200 | modules/timeline/Timeline | 🟠 |
| Terminal Easter Egg | 2800-3200 | modules/terminal/Terminal | 🟢 |
| Glitch Effects | 3200-3400 | modules/effects/GlitchText | 🟢 |

### admin.js (~1300 lignes) → Modules

| Bloc | Lignes (env.) | Module Cible | Priorité |
|------|---------------|--------------|----------|
| Auth check | 1-20 | modules/admin/AuthCheck | 🔴 |
| Sidebar nav | 20-50 | modules/admin/Sidebar | 🟡 |
| Camelot Wheel data | 110-140 | data/camelotWheel | 🟡 |
| Metadata cache | 145-180 | modules/admin/MetadataCache | 🟠 |
| Suggestions | 185-380 | modules/admin/HarmonicSuggestions | 🟠 |
| Music list | 400-600 | modules/admin/MusicManager | 🔴 |
| Playlist editor | 600-900 | modules/admin/PlaylistEditor | 🔴 |
| Artist editor | 900-1100 | modules/admin/ArtistEditor | 🟠 |
| Timeline editor | 1100-1300 | modules/admin/TimelineEditor | 🟠 |

---

## 📋 Tâches

### Phase 1 : Types TypeScript

Créer d'abord les interfaces pour typer les données.

```typescript
// src/types/Artist.ts
export interface Artist {
  id: string;
  name: string;
  location: string;
  image: string;
  listenLink: string;
  watchLink: string;
  instagramLink: string;
  glitchName?: string;
}

// src/types/Track.ts
export interface Track {
  filename: string;
  path: string;
  bpm?: number;
  camelot?: string;
  energy?: number;
  danceability?: number;
  duration?: number;
}

export interface TrackMetadata {
  bpm: number;
  camelot: string;
  energy: number;
  danceability: number;
  source: string;
  error?: boolean;
  message?: string;
}

// src/types/Playlist.ts
export interface Playlist {
  name: string;
  songs: string[];
  dir: string;
}

export interface PlaylistData {
  active_playlist: string | null;
  playlists: Playlist[];
}

// src/types/Post.ts
export interface TimelinePost {
  id: string;
  artist: string;
  type: 'release' | 'event' | 'news';
  title: string;
  date: string;
  description?: string;
  image?: string;
  link?: string;
}

// src/types/index.ts
export * from './Artist';
export * from './Track';
export * from './Playlist';
export * from './Post';
```

### Phase 2 : Module Navigation (Exemple Complet)

```typescript
// src/modules/navigation/Menu.ts
/**
 * Menu Navigation Module
 * Handles burger menu open/close and animations
 */

import { $, $$, byId, on, toggleClass } from '@utils/dom';

interface MenuElements {
  burger: HTMLButtonElement | null;
  menu: HTMLElement | null;
  closeBtn: HTMLButtonElement | null;
  items: HTMLElement[];
  links: HTMLAnchorElement[];
  lines: {
    h1: HTMLElement | null;
    h2: HTMLElement | null;
    v4: HTMLElement | null;
    v5: HTMLElement | null;
    all: HTMLElement[];
  };
}

interface LinePositions {
  H1_PERCENT: number;
  H2_PERCENT: number;
  V4_PERCENT: number;
  V5_PERCENT: number;
  HORIZONTAL_OFFSET: number;
  V4_OFFSET: number;
  V5_OFFSET: number;
}

const LINE_POSITIONS: LinePositions = {
  H1_PERCENT: 0.30,
  H2_PERCENT: 0.70,
  V4_PERCENT: 0.596,
  V5_PERCENT: 0.788,
  HORIZONTAL_OFFSET: 10,
  V4_OFFSET: 30,
  V5_OFFSET: 0
};

class MenuManager {
  private elements: MenuElements;
  private isOpen = false;
  private resetTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.elements = {
      burger: byId<HTMLButtonElement>('burgerBtn'),
      menu: byId('menu'),
      closeBtn: byId<HTMLButtonElement>('menuCloseBtn'),
      items: $$('.menu-item'),
      links: $$<HTMLAnchorElement>('.menu-link'),
      lines: {
        h1: $('.line-h1'),
        h2: $('.line-h2'),
        v4: $('.line-v4'),
        v5: $('.line-v5'),
        all: $$('.line-v, .line-h')
      }
    };

    this.bindEvents();
  }

  private bindEvents(): void {
    const { burger, closeBtn, links, items, menu } = this.elements;

    on(burger, 'click', () => this.toggle());
    on(closeBtn, 'click', () => this.close());

    // Close on link click
    links.forEach(link => {
      on(link, 'click', () => this.close());
    });

    // Escape key
    on(document.body, 'keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });

    // Line animations on hover
    items.forEach(item => {
      on(item, 'mouseenter', () => {
        if (this.resetTimeout) {
          clearTimeout(this.resetTimeout);
          this.resetTimeout = null;
        }
        this.animateLinesForItem(item);
      });

      on(item, 'mouseleave', () => {
        this.resetTimeout = setTimeout(() => this.resetLines(), 200);
      });
    });
  }

  public open(): void {
    const { menu, burger } = this.elements;
    if (!menu) return;

    menu.classList.add('open');
    menu.setAttribute('aria-hidden', 'false');
    document.body.classList.add('menu-open');
    if (burger) burger.style.display = 'none';
    this.isOpen = true;
  }

  public close(): void {
    const { menu, burger } = this.elements;
    if (!menu) return;

    menu.classList.remove('open');
    menu.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('menu-open');
    if (burger) burger.style.display = 'flex';
    this.resetLines();
    this.isOpen = false;
  }

  public toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  private resetLines(): void {
    this.elements.lines.all.forEach(line => {
      line.style.transform = '';
      line.classList.remove('active');
    });
  }

  private animateLinesForItem(item: HTMLElement): void {
    const { lines } = this.elements;
    const rect = item.getBoundingClientRect();
    const link = item.querySelector('.menu-link');
    const number = item.querySelector('.menu-number');

    const linkRect = link?.getBoundingClientRect() ?? rect;
    const numberRect = number?.getBoundingClientRect() ?? rect;

    const vh = window.innerHeight;
    const vw = window.innerWidth;

    // H1 and H2 translations
    const h1Original = vh * LINE_POSITIONS.H1_PERCENT;
    const h2Original = vh * LINE_POSITIONS.H2_PERCENT;
    const h1Target = linkRect.top - LINE_POSITIONS.HORIZONTAL_OFFSET;
    const h2Target = linkRect.bottom + LINE_POSITIONS.HORIZONTAL_OFFSET;

    if (lines.h1) {
      lines.h1.style.transform = `translateY(${h1Target - h1Original}px)`;
      lines.h1.classList.add('active');
    }
    if (lines.h2) {
      lines.h2.style.transform = `translateY(${h2Target - h2Original}px)`;
      lines.h2.classList.add('active');
    }

    // V4 translation
    if (lines.v4) {
      const v4Original = vw * LINE_POSITIONS.V4_PERCENT;
      const v4Target = linkRect.left - LINE_POSITIONS.V4_OFFSET;
      lines.v4.style.transform = `translateX(${v4Target - v4Original}px)`;
      lines.v4.classList.add('active');
    }

    // V5 translation
    if (lines.v5) {
      const v5Original = vw * LINE_POSITIONS.V5_PERCENT;
      const v5Target = numberRect.left + (numberRect.width / 2) + LINE_POSITIONS.V5_OFFSET;
      lines.v5.style.transform = `translateX(${v5Target - v5Original}px)`;
      lines.v5.classList.add('active');
    }
  }
}

// Export singleton instance
let menuInstance: MenuManager | null = null;

export function initMenu(): MenuManager {
  if (!menuInstance) {
    menuInstance = new MenuManager();
  }
  return menuInstance;
}

export function getMenu(): MenuManager | null {
  return menuInstance;
}
```

### Phase 3 : Structure de chaque Module

Chaque module doit suivre ce pattern :

```typescript
// src/modules/[category]/[ModuleName].ts

/**
 * [Description du module]
 */

// 1. Imports
import { ... } from '@utils';
import type { ... } from '@types';

// 2. Types locaux (si nécessaire)
interface ModuleState { ... }
interface ModuleConfig { ... }

// 3. Constantes
const DEFAULT_CONFIG: ModuleConfig = { ... };

// 4. Classe principale
class ModuleName {
  private state: ModuleState;
  
  constructor(config?: Partial<ModuleConfig>) { ... }
  
  // Méthodes publiques
  public init(): void { ... }
  public destroy(): void { ... }
  
  // Méthodes privées
  private setup(): void { ... }
}

// 5. Factory function + singleton si nécessaire
let instance: ModuleName | null = null;

export function initModuleName(config?: Partial<ModuleConfig>): ModuleName {
  if (!instance) {
    instance = new ModuleName(config);
  }
  return instance;
}

export function getModuleName(): ModuleName | null {
  return instance;
}

// 6. Export du type si nécessaire
export type { ModuleConfig };
```

---

## 📁 Structure Finale des Modules

```
src/modules/
├── navigation/
│   ├── Menu.ts
│   ├── ScrollManager.ts
│   ├── ViewportManager.ts
│   └── index.ts
├── radio/
│   ├── RadioPlayer.ts
│   ├── Visualizer.ts
│   ├── RadioController.ts
│   └── index.ts
├── artists/
│   ├── ArtistLoader.ts
│   └── index.ts
├── timeline/
│   ├── Timeline.ts
│   └── index.ts
├── intro/
│   ├── LoadingScreen.ts
│   ├── VideoOverlay.ts
│   └── index.ts
├── effects/
│   ├── GlitchText.ts
│   └── index.ts
├── terminal/
│   ├── Terminal.ts
│   └── index.ts
└── admin/
    ├── AuthCheck.ts
    ├── Sidebar.ts
    ├── MusicManager.ts
    ├── PlaylistEditor.ts
    ├── HarmonicSuggestions.ts
    ├── ArtistEditor.ts
    ├── TimelineEditor.ts
    └── index.ts
```

---

## ✅ Checklist de Complétion

### Types
- [ ] src/types/Artist.ts
- [ ] src/types/Track.ts
- [ ] src/types/Playlist.ts
- [ ] src/types/Post.ts
- [ ] src/types/index.ts

### Modules Site Public
- [ ] modules/navigation/Menu.ts
- [ ] modules/navigation/ScrollManager.ts
- [ ] modules/navigation/ViewportManager.ts
- [ ] modules/radio/RadioPlayer.ts
- [ ] modules/radio/Visualizer.ts
- [ ] modules/radio/RadioController.ts
- [ ] modules/artists/ArtistLoader.ts
- [ ] modules/timeline/Timeline.ts
- [ ] modules/intro/LoadingScreen.ts
- [ ] modules/intro/VideoOverlay.ts
- [ ] modules/effects/GlitchText.ts
- [ ] modules/terminal/Terminal.ts

### Modules Admin
- [ ] modules/admin/AuthCheck.ts
- [ ] modules/admin/Sidebar.ts
- [ ] modules/admin/MusicManager.ts
- [ ] modules/admin/PlaylistEditor.ts
- [ ] modules/admin/HarmonicSuggestions.ts
- [ ] modules/admin/ArtistEditor.ts
- [ ] modules/admin/TimelineEditor.ts

### Entry Points
- [ ] src/main.ts utilise les modules
- [ ] src/admin.ts utilise les modules
- [ ] `npm run typecheck` passe
- [ ] Commit par groupe de modules

---

## ⚠️ Points d'Attention

1. **Garder l'ancien code fonctionnel** pendant la migration
2. **Migrer module par module**, pas tout d'un coup
3. **Tester après chaque module** migré
4. **Les dépendances circulaires** sont à éviter absolument
