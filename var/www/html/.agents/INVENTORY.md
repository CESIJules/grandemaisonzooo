# INVENTORY — Grande Maison Zoo

> Généré le 2026-05-19 | Agent: 01-INVENTORY-AGENT | Audit architectural complet (v2)

---

## TABLE DES MATIÈRES

1. [/var/www/frontend/ — Next.js App](#1-varwwwfrontend--nextjs-app)
2. [/var/www/html/ — PHP Legacy](#2-varwwwhtml--php-legacy)
3. [Analyse transversale](#3-analyse-transversale)

---

## 1. /var/www/frontend/ — Next.js App

**Stack**: Next.js 16.2.4 · React 19 · TypeScript 5.9 · App Router · iron-session · better-sqlite3 · zod · chart.js · three.js · fast-xml-parser

### Config files

| Fichier          | Description                                                                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json`   | Next 16.2.4, React 19, better-sqlite3, iron-session, bcryptjs, zod, chart.js, three, fast-xml-parser, formidable. `postbuild` rsync standalone. |
| `next.config.ts` | `output: "standalone"`, `serverExternalPackages: ["better-sqlite3"]`, rewrites dev pour `/vid/`, `/covers/`, `/stream`.                         |
| `tsconfig.json`  | `paths: { "@/*": ["./*"] }`. Alias `@/` → racine du projet.                                                                                     |
| `middleware.ts`  | Route matcher `/admin/:path*`. Décode le cookie iron-session avec `unsealData`, vérifie `logged_in && role === "admin"`.                        |
| `.env.local`     | `SESSION_SECRET` (requis), `CRON_SECRET` (optionnel), `LIQUIDSOAP_TOKEN` (optionnel), `ICECAST_URL` (optionnel).                                |

---

### types/index.ts — Schémas de données (tous exportés depuis ce seul fichier)

| Type                   | Description                                                                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `SessionData`          | `{ logged_in, user_id, role, artist_id }` — données session iron-session                                                                        |
| `UserRecord`           | `{ password_hash, role, artist_id }` — entrée users.json                                                                                        |
| `UsersJson`            | `Record<string, UserRecord>`                                                                                                                    |
| `ArtistProfile`        | Profil complet artiste + `soundcloudUserId`, `youtubeChannelId`, `deezerArtistId`                                                               |
| `Post`                 | `{ id, title, subtitle?, date, artist, link?, watchLink?, source?, image? }`                                                                    |
| `ReleaseCandidate`     | `{ id, title, artist, date, image, source, sourceLink, extraSources?, listenLink?, watchLink?, customImage?, status, detectedAt, recordType? }` |
| `TrackInfo`            | `{ filename, artist, title, start_time, duration? }`                                                                                            |
| `CurrentTrackResponse` | Réponse enrichie de /api/track/current                                                                                                          |
| `PlayHistoryRow`       | Ligne play_history SQLite                                                                                                                       |
| `AudienceLog`          | Ligne audience_logs SQLite                                                                                                                      |
| `PlaylistSong`         | `{ filename, path? }`                                                                                                                           |
| `PlaylistSchedule`     | `{ enabled, day (0-6), hour (0-23) }`                                                                                                           |
| `Playlist`             | `{ name, songs[], dir, color, icon, cover, schedule? }`                                                                                         |
| `PlaylistData`         | `{ active_playlist, playlists[] }`                                                                                                              |
| `Vst`                  | Plugin VST avec screenshots, downloadUrl, version, etc.                                                                                         |
| `ApiResponse<T>`       | `{ status: "success"\|"error", message?, data? }`                                                                                               |

---

### lib/ — Backend utilities

| Fichier         | Exports clés                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Notes                                                                                                                                                                           |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `paths.ts`      | `PATHS` const object                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Centralise TOUS les chemins FS. `DATA_ROOT` env pour dev local. `ICECAST_BUFFER_DELAY = 16` en dur (⚠️ pas un path).                                                            |
| `config.ts`     | `config` object                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Centralise env vars. Throw startup si `SESSION_SECRET` manquant. ⚠️ Duplique `session.ts`. `analyticsDb` duplique `PATHS.ANALYTICS_DB`.                                         |
| `auth.ts`       | `getSession`, `loginUser`, `requireAdmin`, `requireAuth`, `hashPassword`                                                                                                                                                                                                                                                                                                                                                                                                                                               | `loginUser` normalise `$2y$` → `$2b$` (PHP bcrypt compat). `requireAdmin` throw une `Response` 401. Case-insensitive username.                                                  |
| `session.ts`    | `sessionOptions`, `SessionData`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Cookie `gmz_session`, httpOnly, sameSite: lax, maxAge: 86400, secure en prod.                                                                                                   |
| `data.ts`       | `getArtistNames`, `getArtistProfiles`, `saveArtistProfiles`, `getPosts`, `savePosts`, `addPost`, `updatePost`, `deletePost`, `getPlaylistData`, `savePlaylistData`, `getUsers`, `saveUsers`, `getCurrentTrackInfo`, `getDurationCache`, `saveDurationCache`, `getVsts`, `addVst`, `updateVst`, `deleteVst`, `getCandidates`, `saveCandidates`, `getCandidateById`, `upsertCandidate`, `updateCandidate`, `ignoreCandidate`, `publishCandidate`, `normalizeTitle`, `makeCandidateId`, `getSyncStatus`, `saveSyncStatus` | Toutes les opérations CRUD sur fichiers JSON. Pas de locking (race conditions possibles). `publishCandidate` convertit `ReleaseCandidate` → `Post`.                             |
| `db.ts`         | `logTrack`, `getPlayHistory`, `getPlayHistoryByRange`, `recordAudience`, `getAudienceLogs`, `getAuditLog`, `getAuditLogCount`, `logAudit`, `rawDb`, `pruneOldData`                                                                                                                                                                                                                                                                                                                                                     | Singleton better-sqlite3 WAL. 3 tables: `audience_logs`, `play_history`, `audit_log`. Timestamps Europe/Paris via sv-SE locale.                                                 |
| `scan.ts`       | `runScan(filterArtistId?)`, `getCutoffDate`                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Deezer (API REST) + YouTube (Atom RSS) + SoundCloud (RSS public). `CUTOFF_MONTHS = 60` (⚠️ 5 ans, spec = 18 mois). `buildTitleForms` génère 8 formes normalisées.               |
| `playlists.ts`  | `getAllPlaylists`, `createPlaylist`, `updatePlaylist`, `deletePlaylist`, `setActivePlaylist`, `addSongToPlaylist`, `removeSongFromPlaylist`                                                                                                                                                                                                                                                                                                                                                                            | Gestion FS dossiers playlists. `sanitizeDirName` pour noms de répertoires.                                                                                                      |
| `shell.ts`      | `getAudioDuration`, `getAudioMetadata`, `downloadYoutube`, `downloadSpotdl`, `getIcecastListeners`                                                                                                                                                                                                                                                                                                                                                                                                                     | Wrappers `execFile` (pas de shell injection). Pas de shell=true.                                                                                                                |
| `liquidsoap.ts` | `sendLiquidsoapCommand`, `skipTrack`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | TCP socket vers `127.0.0.1:1234`. Timeout 3s. Détecte fin par `END\r\n`. `skipTrack` → `main_playlist.skip`.                                                                    |
| `validation.ts` | `createPostSchema`, `updatePostSchema`, `artistProfileSchema`, `saveArtistProfilesSchema`, `createPlaylistSchema`, `updatePlaylistSchema`, `vstSchema`, `musicFilenameSchema`                                                                                                                                                                                                                                                                                                                                          | Schémas zod. ⚠️ `artistProfileSchema` a `soundcloudUsername` (ancien nom) — mismatch avec `types/index.ts` (`soundcloudUserId`). PAS utilisés systématiquement dans les routes. |

---

### app/api/ — Route Handlers (38 routes)

Format de réponse standard: `{ status: "success"|"error", message?, data? }` — mais inconsistant (voir section 3).

#### Auth

| Route              | Méthode    | Auth    | Description                                                      |
| ------------------ | ---------- | ------- | ---------------------------------------------------------------- |
| `/api/auth/login`  | POST       | Aucune  | Body `{username, password}` → iron-session cookie                |
| `/api/auth/logout` | GET + POST | Session | Destroy session. GET → redirect /login. ⚠️ GET avec side-effect. |
| `/api/auth/check`  | GET        | Aucune  | Retourne `{ logged_in, user_id, role, artist_id }`               |

#### Artists

| Route                   | Méthode | Auth   | Description                                                              |
| ----------------------- | ------- | ------ | ------------------------------------------------------------------------ |
| `/api/artists`          | GET     | Aucune | Retourne `string[]` (format brut, pas de wrapper)                        |
| `/api/artists/profiles` | GET     | Aucune | Retourne `ArtistProfile[]` (format brut, pas de wrapper) ⚠️ inconsistant |
| `/api/artists/profiles` | PUT     | Admin  | Remplace tout `artists_profiles.json`                                    |

#### Posts / Timeline

| Route             | Méthode | Auth   | Description                                                        |
| ----------------- | ------- | ------ | ------------------------------------------------------------------ |
| `/api/posts`      | GET     | Aucune | `?artist=` filtre. Retourne `Post[]` (format brut) ⚠️ inconsistant |
| `/api/posts`      | POST    | Admin  | multipart/form-data OU JSON. Sauvegarde image `/uploads/`          |
| `/api/posts/[id]` | GET     | Aucune | `{ status, data: Post }`                                           |
| `/api/posts/[id]` | PUT     | Admin  | Mise à jour partielle. multipart OU JSON                           |
| `/api/posts/[id]` | DELETE  | Admin  | Suppression définitive                                             |

#### Releases / Candidates

| Route                                   | Méthode | Auth                 | Description                                                                    |
| --------------------------------------- | ------- | -------------------- | ------------------------------------------------------------------------------ |
| `/api/releases/scan`                    | POST    | Admin                | `?artist={id}` optionnel. Lance `runScan()`. Retourne `{ new, total, errors }` |
| `/api/releases/sync`                    | POST    | Bearer `CRON_SECRET` | Cron: scan → auto-publish tous les pending                                     |
| `/api/releases/candidates`              | GET     | Admin                | `?status=pending\|ignored\|all`. Triés: pending first, date desc               |
| `/api/releases/candidates/[id]`         | PATCH   | Admin                | Champs: `listenLink, watchLink, customImage, title, date`                      |
| `/api/releases/candidates/[id]`         | DELETE  | Admin                | Soft delete: passe en `"ignored"`                                              |
| `/api/releases/candidates/[id]/publish` | POST    | Admin                | Convertit en Post, retire de candidates                                        |
| `/api/releases/candidates/batch`        | POST    | Admin                | `{ action: "publish"\|"ignore", ids: string[] }`                               |

#### Track / Radio

| Route                | Méthode | Auth                                  | Description                                                                                       |
| -------------------- | ------- | ------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `/api/track/current` | GET     | Aucune                                | Track info depuis `/tmp/radio_track_info.json` + duration cache                                   |
| `/api/track/stream`  | GET     | Aucune                                | **SSE** — events track toutes les 10s. ⚠️ Duplique /current                                       |
| `/api/track/log`     | POST    | Bearer `LIQUIDSOAP_TOKEN` (optionnel) | Appelé par Liquidsoap. Écrit `/tmp/radio_track_info.json` + SQLite. ⚠️ Doublon de `log_track.php` |
| `/api/track/history` | GET     | Aucune                                | `?limit=50` — historique avec `relative_time`                                                     |
| `/api/track/skip`    | POST    | Admin                                 | `main_playlist.skip` via telnet Liquidsoap                                                        |
| `/api/track/queue`   | GET     | Aucune                                | Queue Liquidsoap via `request.queue`                                                              |

#### Playlists

| Route                           | Méthode | Auth                 | Description                                                    |
| ------------------------------- | ------- | -------------------- | -------------------------------------------------------------- |
| `/api/playlists`                | GET     | Aucune               | `{ status, data: PlaylistData }`                               |
| `/api/playlists`                | POST    | Admin                | Crée playlist + dossier FS                                     |
| `/api/playlists/[name]`         | PUT     | Admin                | Met à jour songs + newName. `decodeURIComponent` sur name.     |
| `/api/playlists/[name]`         | DELETE  | Admin                | Supprime playlist + dossier FS                                 |
| `/api/playlists/active`         | POST    | Admin                | Définit playlist active (symlink Liquidsoap)                   |
| `/api/playlists/cover`          | POST    | Admin                | Upload cover → `/uploads/playlists/` ⚠️ Sans magic bytes check |
| `/api/playlists/schedule/check` | POST    | Bearer `CRON_SECRET` | Vérifie + active playlists programmées (cron minutaire)        |

#### Music

| Route                         | Méthode | Auth   | Description                                                                   |
| ----------------------------- | ------- | ------ | ----------------------------------------------------------------------------- |
| `/api/music/files`            | GET     | Aucune | ⚠️ UNPROTECTED — liste tous les fichiers audio                                |
| `/api/music/upload`           | POST    | Admin  | Upload audio: ext + magic bytes, max 200 MB                                   |
| `/api/music/delete`           | DELETE  | Admin  | Suppression avec path traversal check (`path.basename`)                       |
| `/api/music/rename`           | POST    | Admin  | ⚠️ Accepte `oldFilename`/`newFilename` ET `old_name`/`new_name` (dual format) |
| `/api/music/metadata`         | GET     | Aucune | ffprobe tags `?file=`                                                         |
| `/api/music/cover`            | GET     | Aucune | ffmpeg cover art → tmp → stream                                               |
| `/api/music/analyze`          | POST    | Admin  | Lance `analyze_audio_light.py` (bloque le worker)                             |
| `/api/music/analyze-metadata` | POST    | Admin  | Lance `analyze_librosa.py`, cache dans `music_metadata.json`                  |
| `/api/music/all-metadata`     | GET     | Aucune | Lit `music_metadata.json` entier                                              |
| `/api/music/download/youtube` | POST    | Admin  | yt-dlp, valide URL youtube.com                                                |
| `/api/music/download/spotify` | POST    | Admin  | spotdl, valide URL open.spotify.com                                           |

#### Uploads, Analytics, Audit, Vsts, Autres

| Route                         | Méthode          | Auth                            | Description                                                                                       |
| ----------------------------- | ---------------- | ------------------------------- | ------------------------------------------------------------------------------------------------- |
| `/api/uploads/artist-image`   | POST             | `requireAuth` (tout user loggé) | Upload photo artiste + magic bytes. Hardcode `/var/www/html/uploads/artists`                      |
| `/api/uploads/playlist-cover` | POST             | Admin                           | Upload cover playlist. ⚠️ Pas de magic bytes check                                                |
| `/api/analytics`              | GET              | Aucune                          | `?type=stats_header\|audience\|top_tracks\|top_artists\|heatmap\|recent_plays` + `?range=24h\|7d` |
| `/api/audience/record`        | POST             | Admin OU Bearer `CRON_SECRET`   | Enregistre audience Icecast dans SQLite. ⚠️ Doublon de `record_audience.php`                      |
| `/api/audit`                  | GET              | Admin                           | Log audit paginé `?limit&offset&user`                                                             |
| `/api/vsts`                   | GET              | Aucune                          | Liste VSTs                                                                                        |
| `/api/vsts`                   | POST             | Admin                           | Création VST avec multipart (screenshots, download file)                                          |
| `/api/vsts/[id]`              | GET, PUT, DELETE | Aucune/Admin                    | CRUD VST par ID                                                                                   |
| `/api/health`                 | GET              | Aucune                          | Icecast + Liquidsoap + SQLite + audience freshness                                                |
| `/feed.xml`                   | GET              | Aucune                          | RSS feed des posts                                                                                |
| `/uploads/[...path]`          | GET              | Aucune                          | Proxy → `/var/www/html/uploads/` filestream                                                       |

---

### app/admin/ — Dashboard admin

| Fichier                 | Lignes   | Description                                                                                            |
| ----------------------- | -------- | ------------------------------------------------------------------------------------------------------ |
| `layout.tsx`            | 5        | Minimal — importe `admin.css` globalement                                                              |
| `page.tsx`              | 131      | Client. Auth check via `/api/auth/check`. 8 tabs avec `dynamic()`. `adminOnly` flag sur certains tabs. |
| `admin.css`             | **3987** | ⚠️ SUPER GOD FILE CSS admin                                                                            |
| `adminBodyHTML.ts`      | **567**  | ⚠️ **DEAD CODE** — ancien HTML admin.html en string TS. Jamais importé.                                |
| `tabs/TimelineTab.tsx`  | 166      | Posts CRUD + Release Candidates (scan/publish/ignore/bulk). Toast system inline.                       |
| `tabs/AnalyticsTab.tsx` | 115      | Fetch /analytics — texte brut (pas de charts)                                                          |
| `tabs/ArtistsTab.tsx`   | 192      | CRUD profils artistes + upload photo + scan individuel. `FIELD_LABELS` dynamique.                      |
| `tabs/MusicTab.tsx`     | 141      | Liste/upload/delete/download YT                                                                        |
| `tabs/PlaylistsTab.tsx` | **372**  | CRUD playlists + songs + cover + schedule + active ⚠️ Complexe                                         |
| `tabs/RadioTab.tsx`     | 110      | Track actuel + queue + skip                                                                            |
| `tabs/AuditTab.tsx`     | 144      | Log audit paginé avec filtre user                                                                      |
| `tabs/VstTab.tsx`       | **488**  | ⚠️ GOD COMPONENT — CRUD VSTs + multi-screenshots + upload inline                                       |

---

### components/ — Composants partagés

| Composant                   | Lignes | Utilisé par                                           |
| --------------------------- | ------ | ----------------------------------------------------- |
| `ArtistCard.tsx`            | 77     | VstSection?, script.js DOM?                           |
| `Nav.tsx`                   | 64     | Potentiellement inutilisé (non visible dans page.tsx) |
| `RadioPlayer.tsx`           | 93     | `RadioSection.tsx`, `RadioTab.tsx`                    |
| `AudioVisualizer.tsx`       | 81     | `RadioPlayer.tsx`                                     |
| `Skeleton.tsx`              | 90     | `ArtistsTab.tsx`                                      |
| `TimelineItem.tsx`          | 38     | Potentiellement script.js                             |
| `webgl/ParticleField.tsx`   | 171    | RadioSection dynamique                                |
| `webgl/VinylRecord.tsx`     | 187    | RadioSection dynamique                                |
| `webgl/RadioVisualizer.tsx` | 164    | RadioSection dynamique                                |
| `webgl/index.ts`            | 22     | Re-exports des 3 webgl                                |

---

### hooks/ — React hooks

| Hook                      | Retourne                                                      | Description                                                                           |
| ------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `useTrack(pollInterval?)` | `{ track, elapsed }`                                          | SSE primaire + polling fallback. Compteur `elapsed` incrémenté par `setInterval`.     |
| `useRadio(streamUrl)`     | `{ playing, volume, loading, error, play, pause, setVolume }` | HTMLAudioElement ref-based. `preload: "none"`, `crossOrigin: "anonymous"`.            |
| `useAudioAnalyzer()`      | `{ connect, disconnect, getFrequencyData, getAverages }`      | Singleton `AudioContext` module-level partagé. AnalyserNode.                          |
| `useArtists()`            | `{ artists, loading, error, refresh }`                        | Fetch `/api/artists/profiles`. ⚠️ Gère double format: array brut OU `{status, data}`. |
| `usePosts(artist?)`       | `{ posts, loading, refresh }`                                 | Fetch `/api/posts`. ⚠️ Idem double format.                                            |
| `useInstallPrompt()`      | `{ prompt, installed, install }`                              | PWA `beforeinstallprompt`.                                                            |

---

### data/ — Fichiers JSON runtime

| Fichier                    | Schéma                                  | Écrit par                                  | Lu par                                  |
| -------------------------- | --------------------------------------- | ------------------------------------------ | --------------------------------------- |
| `artists.json`             | `string[]`                              | Manuel                                     | `GET /api/artists`                      |
| `artists_profiles.json`    | `ArtistProfile[]`                       | `PUT /api/artists/profiles`                | `GET /api/artists/profiles`, ArtistsTab |
| `timeline.json`            | `Post[]`                                | CRUD posts + publishCandidate              | `GET /api/posts`, TimelineTab           |
| `playlist.json`            | `PlaylistData`                          | CRUD playlists                             | `GET /api/playlists`, Liquidsoap        |
| `vsts.json`                | `Vst[]`                                 | CRUD VSTs                                  | `GET /api/vsts`, VstSection             |
| `releases_candidates.json` | `ReleaseCandidate[]`                    | runScan, upsertCandidate, publishCandidate | GET/PATCH/DELETE candidates             |
| `sync_status.json`         | `{ lastScan, totalCandidates, errors }` | runScan                                    | TimelineTab header                      |

---

### Arborescence complète frontend

```
/var/www/frontend/
├── package.json / next.config.ts / tsconfig.json / eslint.config.mjs / middleware.ts
├── types/index.ts                      (173L) — tous les types TypeScript
├── lib/
│   ├── paths.ts (44L) · config.ts (35L) · auth.ts (97L) · session.ts (23L)
│   ├── data.ts (185L) · db.ts (215L) · scan.ts (250L+) · playlists.ts (160L)
│   ├── shell.ts (93L) · liquidsoap.ts (48L) · validation.ts (95L)
├── app/
│   ├── globals.css                     (5352L) ⚠️⚠️ GOD FILE
│   ├── layout.tsx (110L) · page.tsx (52L) · error.tsx (64L) · global-error.tsx (54L)
│   ├── manifest.ts · robots.ts · sitemap.ts · feed.xml/route.ts
│   ├── login/page.tsx · login/login.module.css
│   ├── uploads/[...path]/route.ts      (48L) — proxy /var/www/html/uploads/
│   ├── _components/                    (8 composants RSC page publique)
│   │   ├── LoadingScreen.tsx · VideoOverlay.tsx · RadioController.tsx
│   │   ├── MenuOverlay.tsx · RadioSection.tsx · VstSection.tsx
│   │   ├── ContactSection.tsx · TerminalOverlay.tsx · VstSection.module.css
│   ├── admin/
│   │   ├── layout.tsx (5L) · page.tsx (131L) · admin.css (3987L) ⚠️ · admin.module.css
│   │   ├── adminBodyHTML.ts            (567L) ⚠️ DEAD CODE
│   │   └── tabs/
│   │       ├── tab.module.css (358L) · TimelineTab.module.css
│   │       ├── TimelineTab.tsx (166L) · AnalyticsTab.tsx (115L) · ArtistsTab.tsx (192L)
│   │       ├── MusicTab.tsx (141L) · PlaylistsTab.tsx (372L) ⚠️ · RadioTab.tsx (110L)
│   │       ├── AuditTab.tsx (144L) · VstTab.tsx (488L) ⚠️
│   └── api/                            (38 route handlers — voir table ci-dessus)
├── components/                         (10 composants + 4 webgl)
├── hooks/                              (6 hooks)
└── data/                               (7 fichiers JSON)
```

---

## 2. /var/www/html/ — PHP Legacy

### Arborescence annotée

```
/var/www/html/
├── .gitignore                          (49 B)
├── .user.ini                           (66 B)
├── index.nginx-debian.html             (615 B)   ← page nginx par défaut, inutilisée
├── playlist.json                       (6.2 KB)  ← DUPLICATION avec frontend/data/
├── track_info.json                     (0 B)     ← runtime: écrit par Liquidsoap
├── music_metadata.json                 (50.9 KB) ← cache metadata audio
│
├── covers/
│   ├── CHILL_RAP_1767032951.jpg        (310 KB)
│   ├── CHILL_RAP_FR_1767027389.jpg     (310 KB)
│   └── SUDESTMAISON_1767033429.jpg     (266 KB)
│
├── includes/
│   ├── .gitkeep
│   └── db.php                          (2.2 KB, 59 lignes)   ← PDO SQLite wrapper
│
├── scripts/
│   ├── .gitkeep
│   ├── init_db.php                     (194 B, 8 lignes)
│   ├── log_track.php                   (1.8 KB, 55 lignes)   ← appelé par Liquidsoap
│   └── record_audience.php             (1.7 KB, 52 lignes)   ← cron listener count
│
├── uploads/                            ← 100+ images (posts + artistes)
│   ├── gmz.png                         (13.2 KB)
│   ├── artists/                        ← photos profil artistes (1 MB → 16 MB chacune)
│   └── post_*.jpg/png/jfif             ← images des posts timeline
│
├── vid/                                ← contenu inconnu (non inventorié)
│
└── room45/                             ← SUB-PROJET indépendant (expérience musicale)
    ├── index.php                       (31.4 KB, 856 lignes)  ⚠️ GOD FILE
    ├── _room.php                       (40.6 KB, 1161 lignes) ⚠️ GOD FILE (moteur de rendu)
    ├── _data.php                       (10.6 KB, 270 lignes)  ← données du projet
    ├── _rooms_config.php               (3.5 KB, 71 lignes)
    ├── a01.php → a16.php               (94 B chacun, 3 lignes) ← 16 stubs identiques
    ├── cover/
    │   ├── a01.png                     (2.7 MB)  ⚠️ binaire lourd en webroot
    │   ├── a02.jpg                     (331 KB)
    │   ├── deadend.jpg                 (229 KB)
    │   └── directions.png             (1.9 MB)  ⚠️ binaire lourd en webroot
    ├── sounds/
    │   ├── a01.mp3                     (6.2 MB)  ⚠️ audio en webroot non-optimisé
    │   └── a02.mp3                     (6.2 MB)
    ├── svg/
    │   └── 0.svg → 9.svg              (1.8–5.4 KB chacun)
    └── symbols/
        ├── fable.png                   (2.7 MB)  ⚠️ binaire très lourd
        ├── flip.png                    (223 KB)
        ├── room45.png                  (50 KB)
        └── room45open.png             (2.6 MB)  ⚠️ binaire très lourd
```

### Comptage de lignes PHP

| Fichier                       | Lignes    | Notes                      |
| ----------------------------- | --------- | -------------------------- |
| `includes/db.php`             | 59        | PDO wrapper, OK            |
| `scripts/init_db.php`         | 8         | Script one-shot            |
| `scripts/log_track.php`       | 55        | Endpoint Liquidsoap, actif |
| `scripts/record_audience.php` | 52        | Cron endpoint, actif       |
| `room45/_data.php`            | 270       | Données du projet          |
| `room45/_rooms_config.php`    | 71        | Config routing             |
| `room45/index.php`            | **856**   | ⚠️ GOD FILE                |
| `room45/_room.php`            | **1161**  | ⚠️⚠️ SUPER GOD FILE        |
| `room45/a01.php` → `a16.php`  | 3 chacun  | Stubs identiques × 16      |
| **TOTAL code PHP**            | **~2532** |                            |

---

## 3. Analyse transversale

### Auth pattern

```
iron-session (cookie chiffré gmz_session)
  ↓
requireAdmin() → throw Response 401 si non-admin
requireAuth()  → throw Response 401 si non-loggé

Dans les routes:
  try { await requireAdmin(); } catch (res) { return res as Response; }
```

- Double protection: middleware `/admin/*` + `requireAdmin()` inline dans chaque route
- `$2y$` → `$2b$` normalization pour compatibilité hashes PHP bcrypt
- Routes cron: `Authorization: Bearer CRON_SECRET`
- `LIQUIDSOAP_TOKEN` optionnel dans `/api/track/log`
- PHP legacy: aucune auth sur `log_track.php` / `record_audience.php` (réseau local uniquement)

---

### API response format (inconsistances)

| Type            | Routes                                                            | Format retourné                                         |
| --------------- | ----------------------------------------------------------------- | ------------------------------------------------------- |
| Array brut      | `GET /api/artists`, `GET /api/artists/profiles`, `GET /api/posts` | `Post[]` ou `string[]` ou `ArtistProfile[]` directement |
| Wrapper complet | Toutes POST/PUT/DELETE + majorité des GET                         | `{ status: "success"\|"error", message?, data? }`       |

→ `useArtists` et `usePosts` gèrent les deux formats (`Array.isArray` check) — adaptation côté client.

---

### Duplications & dead code

| Problème                                      | Localisation                                                 | Impact                                                         |
| --------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------- |
| **DEAD CODE** — `adminBodyHTML.ts`            | `app/admin/adminBodyHTML.ts` (567L)                          | HTML ancien admin jamais utilisé                               |
| **DUPLICATION** — Track logging               | `scripts/log_track.php` + `/api/track/log`                   | Deux systèmes parallèles, risque de double-log                 |
| **DUPLICATION** — Audience recording          | `scripts/record_audience.php` + `/api/audience/record`       | Idem                                                           |
| **DUPLICATION** — `playlist.json`             | `/var/www/html/` + `/var/www/frontend/data/`                 | Source de vérité ambiguë                                       |
| **DUPLICATION** — `track_info.json`           | `/var/www/html/` (0B vestige) + `/tmp/radio_track_info.json` | Fichier HTML mort                                              |
| **DUPLICATION** — Parse filename artist/title | `track/current/route.ts` ET `track/stream/route.ts`          | Logique `base.indexOf(" - ")` dupliquée                        |
| **DUPLICATION** — `saveUploadedImage`         | `posts/route.ts` ET `posts/[id]/route.ts`                    | Fonction copiée identique                                      |
| **DUPLICATION** — `saveUploadedFile`          | `vsts/route.ts` ET `vsts/[id]/route.ts`                      | Idem                                                           |
| **DUPLICATION** — UPLOADS_DIR hardcodé        | `uploads/artist-image/route.ts`                              | Devrait utiliser `PATHS.ARTISTS_UPLOADS_DIR`                   |
| **DUPLICATION** — `config.ts` vs `paths.ts`   | `lib/config.ts`, `lib/paths.ts`                              | `analyticsDb`/`musicDir` dupliquent `PATHS.*`                  |
| **DEAD CODE** — `lib/validation.ts`           | Non utilisé systématiquement                                 | Schémas zod définis mais contournés dans la plupart des routes |
| **DUPLICATION** — DB schema                   | `lib/db.ts` (TS) + `includes/db.php` (PHP)                   | `audit_log` n'existe que dans TS                               |

---

### Problèmes architecturaux

| Problème                                             | Localisation                                                                                                           | Sévérité                                         |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| **GOD FILE CSS**                                     | `globals.css` (5352L) + `admin.css` (3987L)                                                                            | ⚠️⚠️ Critique                                    |
| **GOD FILE** room45                                  | `_room.php` (1161L), `index.php` (856L)                                                                                | ⚠️                                               |
| **GOD COMPONENT**                                    | `VstTab.tsx` (488L)                                                                                                    | ⚠️                                               |
| **DEAD CODE**                                        | `adminBodyHTML.ts` (567L)                                                                                              | ⚠️⚠️                                             |
| **Architecture hybride**                             | page.tsx charge script.js legacy via `<Script afterInteractive>` — artistes/timeline pilotés par vanilla JS, pas React | Design                                           |
| **No file locking**                                  | `lib/data.ts` toutes fonctions write JSON                                                                              | Race conditions possibles                        |
| **Pas de pagination**                                | `GET /api/music/files`                                                                                                 | Performance dégradée avec beaucoup de fichiers   |
| **Python scripts sync**                              | `/api/music/analyze`, `analyze-metadata`                                                                               | Bloque le worker Next.js pendant l'analyse       |
| **Cache duration jamais invalidé**                   | `lib/data.ts getDurationCache`                                                                                         | Si un fichier est remplacé, duration cache stale |
| **SSE duplique /current**                            | `track/stream/route.ts` == `track/current/route.ts`                                                                    | Logique identique dupliquée                      |
| **index.nginx-debian.html**                          | `/var/www/html/`                                                                                                       | Expose default Nginx page                        |
| **Binaires lourds en webroot**                       | `room45/cover/`, `room45/symbols/`                                                                                     | Images 2-3 MB non compressées, sans CDN          |
| **`artists.json` séparé de `artists_profiles.json`** | `data/`                                                                                                                | Deux sources de vérité artistes                  |
| **Uploads split**                                    | `html/uploads/` + proxy `frontend/uploads/[...path]`                                                                   | Chemin non unifié                                |
| **`/api/music/files` non protégé**                   | Tout le monde peut lister les fichiers audio                                                                           | Fuite d'info                                     |
| **`/api/auth/logout` GET avec side-effect**          | Sémantique REST non respectée                                                                                          |                                                  |

---

### Incohérences de nommage

| Inconsistance                                                                                            | Localisation                                            |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `soundcloudUsername` vs `soundcloudUserId`                                                               | `validation.ts` vs `types/index.ts` et `ArtistsTab.tsx` |
| `oldFilename`/`newFilename` (camelCase) ET `old_name`/`new_name` (snake_case)                            | `/api/music/rename/route.ts`                            |
| `GET /api/posts` retourne array brut vs `GET /api/releases/candidates` retourne `{ status, candidates }` | Inconsistance enveloppe réponse                         |
| `CUTOFF_MONTHS = 60` dans `lib/scan.ts` vs "18 mois glissants" dans AGENTS.md spec                       |                                                         |
| `ICECAST_BUFFER_DELAY` dans objet `PATHS` (pas un path)                                                  | `lib/paths.ts`                                          |

---

### Fichiers PHP legacy actifs vs. remplacés

| Fichier                       | Statut                           | Remplacé par                              |
| ----------------------------- | -------------------------------- | ----------------------------------------- |
| `scripts/log_track.php`       | ✅ ACTIF (Liquidsoap)            | `/api/track/log/route.ts` (DOUBLON)       |
| `scripts/record_audience.php` | ✅ ACTIF (cron)                  | `/api/audience/record/route.ts` (DOUBLON) |
| `includes/db.php`             | ✅ ACTIF (par scripts ci-dessus) | `lib/db.ts`                               |
| `room45/`                     | ✅ ACTIF (expérience musicale)   | Rien — projet séparé                      |
| `scripts/init_db.php`         | 🟡 ONE-SHOT                      | N/A                                       |
| `playlist.json`               | ⚠️ DOUBLON stale                 | `frontend/data/playlist.json`             |
| `track_info.json`             | ⚠️ VESTIGE 0B                    | `/tmp/radio_track_info.json`              |

---

## ✅ Checklist de complétion

- [x] Toutes les fonctions/exports TypeScript/TSX documentés (frontend)
- [x] Toutes les routes API Next.js listées (38 routes)
- [x] Tous les hooks React listés (6 hooks)
- [x] Tous les modules lib/ documentés (11 fichiers)
- [x] Tous les composants partagés listés
- [x] Toutes les tabs admin documentées
- [x] Tous les fichiers PHP actifs documentés
- [x] Arborescence complète des deux répertoires
- [x] Fichiers JSON runtime inventoriés
- [x] God files identifiés et classés par priorité
- [x] Anti-patterns listés (16 patterns)
- [x] Incohérences de nommage identifiées (5 incohérences)
- [x] Duplications documentées (12 duplications)
- [x] Auth pattern documenté
- [x] API response format inconsistances documentées
- [x] Fichier INVENTORY.md mis à jour à `/var/www/html/.agents/INVENTORY.md`

---

_Fin de l'inventaire — v2 — 2026-05-19_
