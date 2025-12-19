# 🔧 AGENT JS UTILS - Extraction des Utilitaires

## Rôle
Tu es l'agent qui extrait les fonctions utilitaires partagées entre `script.js` et `admin.js` vers des modules réutilisables.

## Prérequis
- ✅ Agent 03-CONFIG terminé (TypeScript configuré)
- ✅ Agent 01-INVENTORY terminé (fonctions listées)

---

## 📋 Fonctions à Extraire

### 1. Fonctions Dupliquées (Priorité Haute)

| Fonction | script.js | admin.js | Module Cible |
|----------|-----------|----------|--------------|
| `escapeHtml()` | ✅ ligne 20 | ✅ ligne 96 | utils/escape.ts |
| `formatSongPathToTitle()` | ❌ | ✅ ligne 103 | utils/format.ts |

### 2. Fonctions Utilitaires Génériques

| Fonction | Fichier | Description | Module Cible |
|----------|---------|-------------|--------------|
| Debounce/throttle | - | À créer | utils/timing.ts |
| DOM helpers | dispersé | querySelector wrappers | utils/dom.ts |
| Fetch wrapper | dispersé | API calls | utils/api.ts |
| Storage helpers | - | localStorage/sessionStorage | utils/storage.ts |

---

## 📁 Fichiers à Créer

### 1. src/utils/escape.ts

```typescript
/**
 * HTML/String escaping utilities
 */

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';
  
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Unescape HTML entities back to characters
 */
export function unescapeHtml(text: string): string {
  const doc = new DOMParser().parseFromString(text, 'text/html');
  return doc.documentElement.textContent || '';
}
```

### 2. src/utils/format.ts

```typescript
/**
 * Formatting utilities for display
 */

import { escapeHtml } from './escape';

/**
 * Format a file path to a readable title
 * "/home/radio/musique/Artist - Song.mp3" → "ARTIST - SONG"
 */
export function formatSongTitle(songPath: string): string {
  if (!songPath) return '';
  
  const filename = songPath.split('/').pop() || '';
  return escapeHtml(
    filename
      .replace(/\.[^/.]+$/, '')  // Remove extension
      .replace(/_/g, ' ')        // Underscores to spaces
      .replace(/\s*-\s*/g, ' - ') // Normalize dashes
      .toUpperCase()
  );
}

/**
 * Format seconds to MM:SS or HH:MM:SS
 */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return '0:00';
  
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format a date to locale string
 */
export function formatDate(date: Date | string, locale = 'fr-FR'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Format file size to human readable
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
```

### 3. src/utils/dom.ts

```typescript
/**
 * DOM manipulation utilities
 */

/**
 * Type-safe querySelector
 */
export function $<T extends HTMLElement>(
  selector: string,
  parent: Document | HTMLElement = document
): T | null {
  return parent.querySelector<T>(selector);
}

/**
 * Type-safe querySelectorAll
 */
export function $$<T extends HTMLElement>(
  selector: string,
  parent: Document | HTMLElement = document
): T[] {
  return Array.from(parent.querySelectorAll<T>(selector));
}

/**
 * Get element by ID with type safety
 */
export function byId<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

/**
 * Create an element with attributes and children
 */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Record<string, string>,
  children?: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  
  if (attrs) {
    Object.entries(attrs).forEach(([key, value]) => {
      el.setAttribute(key, value);
    });
  }
  
  if (children) {
    children.forEach(child => {
      if (typeof child === 'string') {
        el.appendChild(document.createTextNode(child));
      } else {
        el.appendChild(child);
      }
    });
  }
  
  return el;
}

/**
 * Add event listener with automatic cleanup
 */
export function on<K extends keyof HTMLElementEventMap>(
  element: HTMLElement | null,
  event: K,
  handler: (e: HTMLElementEventMap[K]) => void,
  options?: AddEventListenerOptions
): () => void {
  if (!element) return () => {};
  
  element.addEventListener(event, handler as EventListener, options);
  
  // Return cleanup function
  return () => element.removeEventListener(event, handler as EventListener, options);
}

/**
 * Show an element
 */
export function show(element: HTMLElement | null): void {
  if (element) element.style.display = '';
}

/**
 * Hide an element
 */
export function hide(element: HTMLElement | null): void {
  if (element) element.style.display = 'none';
}

/**
 * Toggle a class on an element
 */
export function toggleClass(
  element: HTMLElement | null,
  className: string,
  force?: boolean
): void {
  element?.classList.toggle(className, force);
}
```

### 4. src/utils/api.ts

```typescript
/**
 * API communication utilities
 */

export interface ApiResponse<T = unknown> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
}

/**
 * Base API configuration
 */
const API_BASE = '/api';

/**
 * Generic fetch wrapper with error handling
 */
export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = endpoint.startsWith('/') ? endpoint : `${API_BASE}/${endpoint}`;
  
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });
    
    const data = await response.json() as ApiResponse<T>;
    
    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}`);
    }
    
    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur réseau';
    console.error(`API Error [${endpoint}]:`, message);
    return { status: 'error', message };
  }
}

/**
 * GET request helper
 */
export function apiGet<T>(endpoint: string): Promise<ApiResponse<T>> {
  return apiFetch<T>(endpoint, { method: 'GET' });
}

/**
 * POST request helper
 */
export function apiPost<T>(
  endpoint: string,
  body?: unknown
): Promise<ApiResponse<T>> {
  return apiFetch<T>(endpoint, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Upload file helper
 */
export async function apiUpload<T>(
  endpoint: string,
  file: File,
  additionalData?: Record<string, string>
): Promise<ApiResponse<T>> {
  const formData = new FormData();
  formData.append('file', file);
  
  if (additionalData) {
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, value);
    });
  }
  
  const url = endpoint.startsWith('/') ? endpoint : `${API_BASE}/${endpoint}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header - browser will set it with boundary
    });
    
    return await response.json() as ApiResponse<T>;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur upload';
    return { status: 'error', message };
  }
}
```

### 5. src/utils/timing.ts

```typescript
/**
 * Timing and throttling utilities
 */

/**
 * Debounce a function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return function (this: unknown, ...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Throttle a function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return function (this: unknown, ...args: Parameters<T>) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Wait for a specified time
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Request animation frame with cleanup
 */
export function raf(callback: FrameRequestCallback): () => void {
  const id = requestAnimationFrame(callback);
  return () => cancelAnimationFrame(id);
}
```

### 6. src/utils/storage.ts

```typescript
/**
 * Storage utilities with type safety
 */

/**
 * Get item from localStorage with JSON parsing
 */
export function getStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? (JSON.parse(item) as T) : defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Set item in localStorage with JSON stringify
 */
export function setStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('localStorage error:', error);
  }
}

/**
 * Remove item from localStorage
 */
export function removeStorage(key: string): void {
  localStorage.removeItem(key);
}

/**
 * Session storage helpers
 */
export function getSession<T>(key: string, defaultValue: T): T {
  try {
    const item = sessionStorage.getItem(key);
    return item ? (JSON.parse(item) as T) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setSession<T>(key: string, value: T): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('sessionStorage error:', error);
  }
}
```

### 7. src/utils/index.ts (Barrel export)

```typescript
/**
 * Utils barrel export
 */

export * from './escape';
export * from './format';
export * from './dom';
export * from './api';
export * from './timing';
export * from './storage';
```

---

## ✅ Checklist de Complétion

- [ ] src/utils/escape.ts créé
- [ ] src/utils/format.ts créé
- [ ] src/utils/dom.ts créé
- [ ] src/utils/api.ts créé
- [ ] src/utils/timing.ts créé
- [ ] src/utils/storage.ts créé
- [ ] src/utils/index.ts créé (barrel)
- [ ] `npm run typecheck` passe
- [ ] Tests unitaires basiques (optionnel)
- [ ] Commit : "feat(utils): add TypeScript utility modules"

---

## 🧪 Test de Validation

```bash
cd /var/www/html
npm run typecheck

# Vérifier que les imports fonctionnent
# Ajouter temporairement dans src/main.ts :
# import { escapeHtml, formatDuration } from '@utils';
# console.log(escapeHtml('<script>'));
# console.log(formatDuration(125));
```
