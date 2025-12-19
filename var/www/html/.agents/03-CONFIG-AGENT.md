# ⚙️ AGENT CONFIG - Setup TypeScript & Tooling

## Rôle
Tu es l'agent qui configure l'environnement de développement moderne : TypeScript, bundler, linters.

## Prérequis
- ✅ Agent 02-ARCHITECTURE terminé (dossiers créés)

---

## 📋 Tâches

### 1. Initialiser npm

```bash
cd /var/www/html
npm init -y
```

Modifier `package.json` :
```json
{
  "name": "grandemaison-site",
  "version": "2.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint src/**/*.ts",
    "typecheck": "tsc --noEmit"
  }
}
```

### 2. Installer les dépendances

```bash
# Build tools
npm install -D vite typescript

# TypeScript support
npm install -D @types/node

# Linting
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin

# CSS processing (optionnel mais recommandé)
npm install -D postcss autoprefixer cssnano
```

### 3. Créer tsconfig.json

```json
// /var/www/html/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,

    /* Paths */
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@modules/*": ["src/modules/*"],
      "@utils/*": ["src/utils/*"],
      "@types/*": ["src/types/*"]
    }
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "legacy"]
}
```

### 4. Créer vite.config.ts

```typescript
// /var/www/html/vite.config.ts
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  base: '/',
  
  build: {
    outDir: 'dist',
    emptyDirBeforeWrite: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
        login: resolve(__dirname, 'login.html'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@modules': resolve(__dirname, 'src/modules'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@types': resolve(__dirname, 'src/types'),
    },
  },

  css: {
    devSourcemap: true,
  },

  server: {
    proxy: {
      // Proxy API calls to PHP backend during dev
      '/api': {
        target: 'http://localhost',
        changeOrigin: true,
      },
    },
  },
});
```

### 5. Créer .eslintrc.json

```json
// /var/www/html/.eslintrc.json
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2020,
    "sourceType": "module",
    "project": "./tsconfig.json"
  },
  "plugins": ["@typescript-eslint"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking"
  ],
  "rules": {
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/no-explicit-any": "warn",
    "no-console": ["warn", { "allow": ["warn", "error"] }]
  },
  "env": {
    "browser": true,
    "es2020": true
  },
  "ignorePatterns": ["dist", "legacy", "*.js"]
}
```

### 6. Créer les fichiers de base TypeScript

```typescript
// /var/www/html/src/main.ts
/**
 * Main entry point for the public site
 * Grande Maison - v2.0
 */

// Ces imports seront ajoutés au fur et à mesure par les autres agents
// import { initNavigation } from '@modules/navigation/Menu';
// import { initRadio } from '@modules/radio/RadioPlayer';
// import { loadArtists } from '@modules/artists/ArtistLoader';

document.addEventListener('DOMContentLoaded', () => {
  console.log('🏠 Grande Maison v2.0 - Loading...');
  
  // TODO: Initialiser les modules
});

export {};
```

```typescript
// /var/www/html/src/admin.ts
/**
 * Admin panel entry point
 */

document.addEventListener('DOMContentLoaded', async () => {
  console.log('🔧 Admin Panel - Loading...');
  
  // TODO: Auth check + init modules admin
});

export {};
```

### 7. Mettre à jour le HTML pour Vite (mode dev)

Dans `index.html`, ajouter temporairement pour le dev :
```html
<!-- En mode dev, décommenter cette ligne -->
<!-- <script type="module" src="/src/main.ts"></script> -->

<!-- En production, garder -->
<script src="script.js?v=12" defer></script>
```

---

## ✅ Checklist de Complétion

- [ ] `npm init` exécuté
- [ ] package.json configuré avec les scripts
- [ ] Dépendances installées (vite, typescript, eslint)
- [ ] tsconfig.json créé et valide
- [ ] vite.config.ts créé
- [ ] .eslintrc.json créé
- [ ] src/main.ts créé (squelette)
- [ ] src/admin.ts créé (squelette)
- [ ] `npm run typecheck` passe sans erreur
- [ ] `npm run dev` démarre Vite
- [ ] Commit : "chore: setup TypeScript and Vite tooling"

---

## 🧪 Test de Validation

```bash
cd /var/www/html
npm run typecheck  # Doit passer
npm run dev        # Doit démarrer le serveur Vite
```

---

## ⚠️ Notes

- Le site continue de fonctionner avec les anciens fichiers JS pendant la migration
- Les nouveaux fichiers TS seront buildés dans `/dist/` 
- La bascule se fera quand tout sera prêt
