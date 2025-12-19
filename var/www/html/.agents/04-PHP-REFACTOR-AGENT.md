# 🐘 AGENT PHP REFACTOR - Backend & Gestion d'Erreurs

## Rôle
Tu es l'agent spécialisé dans le refactoring du code PHP : réorganisation, gestion d'erreurs standardisée, sécurité.

## Prérequis
- ✅ Agent 02-ARCHITECTURE terminé (dossiers api/ et includes/ créés)

---

## 📋 Mapping des Fichiers

### Fichiers à déplacer/renommer

| Ancien | Nouveau | Notes |
|--------|---------|-------|
| auth.php | api/auth/login.php | POST login |
| check_auth.php | api/auth/check.php | GET auth status |
| logout.php | api/auth/logout.php | POST logout |
| get_music_files.php | api/music/list.php | GET |
| get_music_metadata.php | api/music/metadata.php | POST |
| get_all_metadata.php | api/music/all-metadata.php | GET |
| get_all_songs.php | api/music/songs.php | GET |
| download_youtube.php | api/music/download.php | POST |
| delete_music.php | api/music/delete.php | POST |
| rename_music.php | api/music/rename.php | POST |
| skip_song.php | api/music/skip.php | POST |
| get_duration.php | api/music/duration.php | POST |
| get_playlists.php | api/playlists/list.php | GET |
| create_playlist.php | api/playlists/create.php | POST |
| update_playlist.php | api/playlists/update.php | POST |
| delete_playlist.php | api/playlists/delete.php | POST |
| set_active_playlist.php | api/playlists/set-active.php | POST |
| get_artists.php | api/artists/list.php | GET |
| get_artist_profiles.php | api/artists/profiles.php | GET |
| save_artist_profiles.php | api/artists/save-profiles.php | POST |
| upload_artist_image.php | api/artists/upload-image.php | POST |
| get_posts.php | api/timeline/posts.php | GET |
| add_post.php | api/timeline/add.php | POST |
| update_post.php | api/timeline/update.php | POST |
| delete_post.php | api/timeline/delete.php | POST |
| playlists.php | includes/PlaylistManager.php | Classe |

---

## 📋 Tâches

### 1. Créer la classe Response Helper

```php
// /var/www/html/includes/Response.php
<?php

class Response {
    /**
     * Send a JSON success response
     */
    public static function success(mixed $data = null, string $message = ''): never {
        self::send([
            'status' => 'success',
            'message' => $message,
            'data' => $data
        ]);
    }

    /**
     * Send a JSON error response
     */
    public static function error(string $message, int $httpCode = 400, ?array $debug = null): never {
        http_response_code($httpCode);
        $response = [
            'status' => 'error',
            'message' => $message
        ];
        
        // Include debug info only in development
        if ($debug !== null && self::isDev()) {
            $response['debug'] = $debug;
        }
        
        self::send($response);
    }

    /**
     * Send 401 Unauthorized
     */
    public static function unauthorized(string $message = 'Accès non autorisé'): never {
        self::error($message, 401);
    }

    /**
     * Send 404 Not Found
     */
    public static function notFound(string $message = 'Ressource introuvable'): never {
        self::error($message, 404);
    }

    /**
     * Send 500 Internal Server Error
     */
    public static function serverError(string $message = 'Erreur serveur', ?\Throwable $e = null): never {
        $debug = null;
        if ($e !== null && self::isDev()) {
            $debug = [
                'exception' => get_class($e),
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ];
        }
        self::error($message, 500, $debug);
    }

    private static function send(array $data): never {
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-cache, no-store, must-revalidate');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit;
    }

    private static function isDev(): bool {
        return ($_ENV['APP_ENV'] ?? 'production') === 'development';
    }
}
```

### 2. Créer le middleware d'authentification

```php
// /var/www/html/includes/AuthMiddleware.php
<?php

require_once __DIR__ . '/Response.php';

class AuthMiddleware {
    /**
     * Require authentication for this endpoint
     */
    public static function require(): void {
        session_start();
        
        if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
            Response::unauthorized('Vous devez être connecté pour accéder à cette ressource.');
        }
    }

    /**
     * Check if user is authenticated (without blocking)
     */
    public static function check(): bool {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        return isset($_SESSION['logged_in']) && $_SESSION['logged_in'] === true;
    }
}
```

### 3. Refactorer un endpoint exemple

**Avant** (`get_music_files.php`) :
```php
<?php
header('Content-Type: application/json');
// ... code sans gestion d'erreurs propre
```

**Après** (`api/music/list.php`) :
```php
<?php
/**
 * GET /api/music/list.php
 * Returns list of music files in the music directory
 */

require_once __DIR__ . '/../../includes/Response.php';

const MUSIC_DIR = '/home/radio/musique';

try {
    if (!is_dir(MUSIC_DIR)) {
        Response::error('Le dossier de musique est introuvable.', 404);
    }

    $files = scandir(MUSIC_DIR);
    if ($files === false) {
        Response::serverError('Impossible de lire le dossier de musique.');
    }

    // Filter out . and .. and non-audio files
    $musicFiles = array_values(array_filter($files, function($file) {
        if ($file === '.' || $file === '..') return false;
        $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        return in_array($ext, ['mp3', 'wav', 'flac', 'ogg', 'm4a']);
    }));

    Response::success($musicFiles);

} catch (\Throwable $e) {
    Response::serverError('Une erreur inattendue s\'est produite.', $e);
}
```

### 4. Template pour endpoints protégés

```php
<?php
/**
 * POST /api/music/delete.php
 * Delete a music file (requires auth)
 */

require_once __DIR__ . '/../../includes/Response.php';
require_once __DIR__ . '/../../includes/AuthMiddleware.php';

// Require authentication
AuthMiddleware::require();

// Only accept POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Méthode non autorisée.', 405);
}

try {
    // Get JSON body
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        Response::error('JSON invalide.');
    }

    $filename = $input['filename'] ?? null;
    
    if (empty($filename)) {
        Response::error('Le nom du fichier est requis.');
    }

    // Sanitize filename to prevent path traversal
    $filename = basename($filename);
    $filepath = '/home/radio/musique/' . $filename;

    if (!file_exists($filepath)) {
        Response::notFound('Fichier introuvable.');
    }

    if (!unlink($filepath)) {
        Response::serverError('Impossible de supprimer le fichier.');
    }

    Response::success(null, 'Fichier supprimé avec succès.');

} catch (\Throwable $e) {
    Response::serverError('Une erreur inattendue s\'est produite.', $e);
}
```

---

## 📋 Checklist par Fichier

### Auth
- [ ] api/auth/login.php - Refactoré avec Response class
- [ ] api/auth/check.php - Refactoré
- [ ] api/auth/logout.php - Refactoré

### Music
- [ ] api/music/list.php - Refactoré
- [ ] api/music/metadata.php - Refactoré
- [ ] api/music/all-metadata.php - Refactoré
- [ ] api/music/download.php - Refactoré + AuthMiddleware
- [ ] api/music/delete.php - Refactoré + AuthMiddleware
- [ ] api/music/rename.php - Refactoré + AuthMiddleware
- [ ] api/music/skip.php - Refactoré + AuthMiddleware

### Playlists
- [ ] api/playlists/list.php - Refactoré
- [ ] api/playlists/create.php - Refactoré + AuthMiddleware
- [ ] api/playlists/update.php - Refactoré + AuthMiddleware
- [ ] api/playlists/delete.php - Refactoré + AuthMiddleware
- [ ] api/playlists/set-active.php - Refactoré + AuthMiddleware

### Artists
- [ ] api/artists/list.php - Refactoré
- [ ] api/artists/profiles.php - Refactoré
- [ ] api/artists/save-profiles.php - Refactoré + AuthMiddleware
- [ ] api/artists/upload-image.php - Refactoré + AuthMiddleware

### Timeline
- [ ] api/timeline/posts.php - Refactoré
- [ ] api/timeline/add.php - Refactoré + AuthMiddleware
- [ ] api/timeline/update.php - Refactoré + AuthMiddleware
- [ ] api/timeline/delete.php - Refactoré + AuthMiddleware

### Classes
- [ ] includes/PlaylistManager.php - Migré et nettoyé

---

## ✅ Checklist de Complétion

- [ ] includes/Response.php créé
- [ ] includes/AuthMiddleware.php créé
- [ ] Tous les endpoints migrés vers /api/
- [ ] Tous les endpoints utilisent Response class
- [ ] Endpoints protégés utilisent AuthMiddleware
- [ ] Anciens fichiers gardés (pour compatibilité temporaire)
- [ ] Tests manuels des endpoints critiques
- [ ] Commit : "refactor(php): reorganize API endpoints with proper error handling"

---

## 🧪 Tests de Validation

```bash
# Test endpoint public
curl http://localhost/api/music/list.php

# Test endpoint protégé sans auth (doit retourner 401)
curl -X POST http://localhost/api/music/delete.php

# Test avec auth (après login)
curl -X POST http://localhost/api/music/delete.php \
  -H "Cookie: PHPSESSID=xxx" \
  -H "Content-Type: application/json" \
  -d '{"filename": "test.mp3"}'
```
