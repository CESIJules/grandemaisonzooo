# Copilot Instructions for grandemaisonzooo

These instructions guide AI coding agents to be productive quickly in this repo. Focus on the actual patterns and workflows used here.

## Big Picture

- **Purpose:** Host a web admin + public site for a web radio, stream via **Liquidsoap → Icecast**, and serve through **Nginx** with HTTPS. Admin UI manages timeline posts and music files.
- **Components:**
  - `home/radio/*.liq`: Liquidsoap scripts define the audio pipeline and Icecast output.
  - `etc/icecast2/icecast.xml`: Icecast server config (mounts, auth, ports).
  - `etc/nginx/**`: Nginx reverse proxy + PHP-FPM for site and HTTPS proxy to Icecast (`/stream`, `/status-json.xsl`).
  - `var/www/html/**`: Public/admin web app: HTML/CSS/JS and PHP endpoints for posts and music file management.
  - `etc/systemd/system/liquidsoap.service`: Service definition to run Liquidsoap on the host.

## Data & Flow

- **Audio chain:** `home/radio/radio.liq` reads files from `/home/radio/musique`, maps metadata (title from filename), falls back to `blank()`, and outputs MP3 to Icecast at `127.0.0.1:8000` on mount `/stream`.
- **HTTP chain:** Nginx serves `var/www/html` and proxies `/stream` and `/status-json.xsl` to Icecast (adds CORS + no-cache).
- **Admin UI:** `admin.html` + `admin.js` call PHP endpoints to CRUD timeline posts and manage music files. Current playing track is inferred via proxied Icecast status JSON.

## Conventions & Patterns

- **Filenames → Titles:** Frontend formats song titles by stripping extension, replacing `_` with spaces, normalizing `-`, and uppercasing. Liquidsoap also sets `title` from filename when metadata is missing.
- **PHP endpoints return JSON:** e.g., `add_post.php`, `update_post.php`, `delete_post.php`, `get_posts.php`, `get_music_files.php`, `rename_music.php`, `get_artists.php`, `get_duration.php`. Expect `{ status: 'success'|'error', ... }` and handle errors explicitly on the frontend.
- **Static root:** Nginx `root /var/www/html` with `index index.php index.html`; `location / { try_files $uri $uri/ =404; }`. PHP uses `fastcgi_pass unix:/var/run/php/php-fpm.sock` and `SCRIPT_FILENAME $document_root$fastcgi_script_name`.
- **CORS for stream/status:** `/stream` and `/status-json.xsl` locations add `Access-Control-Allow-Origin: *` and `Cache-Control: no-cache`.
- **Mount:** Icecast mount path is `/stream`. Frontend assumes it in `admin.js`.

## Key Files

- Liquidsoap: `home/radio/radio.liq`, `home/radio/metadata.liq`, `home/radio/playlist.m3u`.
- Icecast: `etc/icecast2/icecast.xml`.
- Nginx: `etc/nginx/nginx.conf`, `etc/nginx/sites-available/radio.conf`, `etc/nginx/sites-enabled/radio.conf`.
- Web app: `var/www/html/index.html`, `admin.html`, `admin.js`, `login.html`, `login.js`, `script.js`, `style.css`, PHP endpoints under `var/www/html/*.php`, assets in `uploads/`, data like `artists.json`.
- Service: `etc/systemd/system/liquidsoap.service`.

## Dev & Ops Workflows

- **Liquidsoap service (on server):**
  - Edit `home/radio/radio.liq` and restart service.
  - Systemd service path: `etc/systemd/system/liquidsoap.service` (ensure installed under `/etc/systemd/system/`).
  - Typical commands (Linux server):
    - `sudo systemctl daemon-reload`
    - `sudo systemctl restart liquidsoap`
    - `sudo systemctl status liquidsoap`
- **Icecast & Nginx:**
  - Icecast config in `etc/icecast2/icecast.xml` (ensure `/etc/icecast2/icecast.xml` on host).
  - Nginx site at `etc/nginx/sites-available/radio.conf` and symlink in `etc/nginx/sites-enabled/radio.conf`.
  - Commands:
    - `sudo nginx -t`
    - `sudo systemctl reload nginx`
    - `sudo systemctl restart icecast2`
- **Web app updates:** Modify `var/www/html/**` and deploy/sync to `/var/www/html` on the server. Frontend fetches proxied endpoints relative to site root (no hardcoded localhost).
- **Testing PHP syntax:** `tests/php_syntax.sh` likely checks `*.php` syntax via `php -l`. Run on server:
  - `bash tests/php_syntax.sh`

## Integration Details & Gotchas

- **Icecast credentials:** Liquidsoap `output.icecast` uses `password = "hacklaradio"`. Keep in sync with Icecast `source` password in `icecast.xml`.
- **Status JSON:** Admin UI calls `https://grandemaisonzoo.com/status-json.xsl` which Nginx proxies to local Icecast; ensure Nginx SSL certs exist (`/etc/letsencrypt/live/grandemaisonzoo.com/...`).
- **File locations:** Music folder is `/home/radio/musique`. PHP endpoints for music management must operate on that directory; confirm permissions.
- **PHP-FPM socket:** `fastcgi_pass unix:/var/run/php/php-fpm.sock` assumes default pool/socket; adjust per server.
- **Cache control:** Stream/status endpoints disable caching; frontend uses `{ cache: 'no-store' }` to avoid stale data.

## Example Changes

- Add a new metadata rule: edit `home/radio/metadata.liq` to transform `artist` based on folder name; wrap with `map_metadata` in `radio.liq`.
- Add a new admin operation: create `var/www/html/pause_stream.php` returning JSON; update `admin.js` to call it and handle success/error messages consistently.
- Update Nginx for a new endpoint: add a `location /api/` block that proxies to a local PHP app or upstream.

## Agent Tips

- Keep changes surgical; follow existing patterns (JSON responses, proxied status, mount `/stream`).
- Reference the files above when proposing changes; avoid introducing new frameworks.
- Validate syntax: Liquidsoap (`liquidsoap --check-file`), Nginx (`nginx -t`), PHP (`php -l`).
- When unsure about server paths vs. repo paths, prefer mirroring: `etc/...` maps to `/etc/...`; `var/www/html` maps to `/var/www/html`.

---

If any workflows (deploy, auth, server paths) are unclear, tell us which parts need details (e.g., exact PHP endpoints behavior, Icecast XML values), and we’ll add them.
