# 🏗️ AGENT ARCHITECTURE - Structure de Dossiers

## Rôle
Tu es l'agent qui crée la nouvelle structure de dossiers et déplace les fichiers de base.

## Prérequis
- ✅ Agent 01-INVENTORY terminé

---

## 📁 Nouvelle Structure Cible

```
/var/www/html/
├── index.html
├── admin.html
├── login.html
│
├── api/                          # Endpoints PHP (REST-like)
│   ├── auth/
│   │   ├── login.php
│   │   ├── logout.php
│   │   └── check.php
│   ├── music/
│   │   ├── list.php
│   │   ├── metadata.php
│   │   ├── download.php
│   │   ├── delete.php
│   │   ├── rename.php
│   │   └── skip.php
│   ├── playlists/
│   │   ├── list.php
│   │   ├── create.php
│   │   ├── update.php
│   │   ├── delete.php
│   │   └── set-active.php
│   ├── artists/
│   │   ├── list.php
│   │   ├── profiles.php
│   │   ├── save-profiles.php
│   │   └── upload-image.php
│   └── timeline/
│       ├── posts.php
│       ├── add.php
│       ├── update.php
│       └── delete.php
│
├── includes/                     # Classes PHP partagées
│   ├── PlaylistManager.php
│   ├── AuthMiddleware.php
│   ├── Response.php              # Helper pour JSON responses
│   └── Config.php                # Wrapper config
│
├── src/                          # Source TypeScript
│   ├── main.ts                   # Entry point site public
│   ├── admin.ts                  # Entry point admin
│   ├── modules/
│   │   ├── radio/
│   │   │   ├── RadioPlayer.ts
│   │   │   ├── Visualizer.ts
│   │   │   └── RadioController.ts
│   │   ├── navigation/
│   │   │   ├── Menu.ts
│   │   │   ├── ScrollManager.ts
│   │   │   └── Sections.ts
│   │   ├── artists/
│   │   │   └── ArtistLoader.ts
│   │   ├── timeline/
│   │   │   └── Timeline.ts
│   │   ├── intro/
│   │   │   ├── LoadingScreen.ts
│   │   │   └── VideoOverlay.ts
│   │   └── admin/
│   │       ├── MusicManager.ts
│   │       ├── PlaylistEditor.ts
│   │       ├── ArtistEditor.ts
│   │       └── TimelineEditor.ts
│   ├── utils/
│   │   ├── dom.ts
│   │   ├── api.ts
│   │   ├── escape.ts
│   │   └── format.ts
│   └── types/
│       ├── Artist.ts
│       ├── Track.ts
│       ├── Playlist.ts
│       └── Post.ts
│
├── dist/                         # Output bundler (gitignore)
│   ├── main.js
│   ├── admin.js
│   └── main.css
│
├── styles/                       # Source CSS
│   ├── base/
│   │   ├── reset.css
│   │   ├── variables.css
│   │   ├── typography.css
│   │   └── animations.css
│   ├── components/
│   │   ├── menu.css
│   │   ├── radio.css
│   │   ├── radio-controller.css
│   │   ├── timeline.css
│   │   ├── artists.css
│   │   ├── loading.css
│   │   ├── buttons.css
│   │   └── forms.css
│   ├── layout/
│   │   ├── sections.css
│   │   ├── grid.css
│   │   └── responsive.css
│   ├── pages/
│   │   ├── admin.css
│   │   └── login.css
│   └── main.css                  # @import all
│
├── assets/
│   ├── fonts/                    # Déplacer depuis /font
│   ├── images/                   # Déplacer depuis /images
│   └── ascii/                    # Déplacer depuis /ascii
│
├── legacy/                       # Ancien code (temporaire)
│   ├── script.js
│   ├── admin.js
│   └── style.css
│
└── config/
    ├── tsconfig.json
    ├── vite.config.ts
    └── .eslintrc.json
```

---

## 📋 Tâches

### 1. Créer les dossiers

```bash
mkdir -p /var/www/html/{api/{auth,music,playlists,artists,timeline},includes,src/{modules/{radio,navigation,artists,timeline,intro,admin},utils,types},styles/{base,components,layout,pages},assets/{fonts,images},legacy,config,dist}
```

### 2. Déplacer les assets

```bash
# Fonts
mv /var/www/html/font/* /var/www/html/assets/fonts/
rmdir /var/www/html/font

# Images
mv /var/www/html/images/* /var/www/html/assets/images/

# ASCII
mv /var/www/html/ascii/* /var/www/html/assets/ascii/
```

### 3. Copier le code legacy (NE PAS supprimer les originaux encore)

```bash
cp /var/www/html/script.js /var/www/html/legacy/
cp /var/www/html/admin.js /var/www/html/legacy/
cp /var/www/html/style.css /var/www/html/legacy/
```

### 4. Mettre à jour .gitignore

Ajouter :
```gitignore
# Build output
/var/www/html/dist/
/var/www/html/node_modules/

# Legacy (garder temporairement)
# /var/www/html/legacy/
```

---

## ✅ Checklist de Complétion

- [ ] Tous les dossiers créés
- [ ] Assets déplacés (fonts, images, ascii)
- [ ] Code legacy copié (backup)
- [ ] .gitignore mis à jour
- [ ] Structure vérifiée avec `tree` ou `ls -R`
- [ ] Commit : "refactor: create new directory structure"

---

## ⚠️ Points d'Attention

1. **NE PAS** supprimer les anciens fichiers tant que le nouveau code n'est pas fonctionnel
2. **Mettre à jour** les chemins dans le HTML après déplacement des fonts
3. **Vérifier** que le site fonctionne toujours après chaque étape
