<?php

class PlaylistManager {
    private $playlistFile = '/var/www/html/playlist.json';
    private $playlistsDir = '/home/radio/playlists';
    private $musicDir = '/home/radio/musique';
    private $livePlaylistLink = '/home/radio/live-playlist';
    private $fallbackDir = '/home/radio/fallback';
    private $defaultContent = [
        "active_playlist" => null,
        "playlists" => []
    ];

    public function __construct() {
        if (!file_exists($this->playlistFile)) {
            $this->savePlaylists($this->defaultContent);
        }
    }

    private function readPlaylists() {
        $content = @file_get_contents($this->playlistFile);
        if ($content === false) return $this->defaultContent;
        $data = json_decode($content, true);
        return json_last_error() === JSON_ERROR_NONE ? array_merge($this->defaultContent, $data) : $this->defaultContent;
    }

    private function savePlaylists($data) {
        return file_put_contents($this->playlistFile, json_encode($data, JSON_PRETTY_PRINT)) !== false;
    }

    private function sanitizeDirName($name) {
        // Basic sanitization for directory names
        return preg_replace('/[^A-Za-z0-9_\-]/', '_', $name);
    }

    private function rrmdir($dir) {
        if (is_dir($dir)) {
            $objects = scandir($dir);
            foreach ($objects as $object) {
                if ($object != "." && $object != "..") {
                    if (is_dir($dir . "/" . $object) && !is_link($dir . "/" . $object))
                        $this->rrmdir($dir . "/" . $object);
                    else
                        unlink($dir . "/" . $object);
                }
            }
            rmdir($dir);
        }
    }

    public function getAllPlaylists() {
        $data = $this->readPlaylists();
        return ['status' => 'success', 'data' => $data];
    }

    public function createPlaylist($name, $songs = []) {
        $data = $this->readPlaylists();
        foreach ($data['playlists'] as $playlist) {
            if ($playlist['name'] === $name) {
                return ['status' => 'error', 'message' => 'Une playlist avec ce nom existe déjà.'];
            }
        }

        $dirName = $this->sanitizeDirName($name);
        $playlistPath = $this->playlistsDir . '/' . $dirName;
        if (!is_dir($playlistPath)) {
            mkdir($playlistPath, 0775, true);
        }

        $newPlaylist = ['name' => $name, 'songs' => $songs, 'dir' => $dirName];
        $data['playlists'][] = $newPlaylist;

        if ($this->savePlaylists($data)) {
            return ['status' => 'success', 'message' => 'Playlist créée avec succès.'];
        }
        return ['status' => 'error', 'message' => 'Erreur lors de la sauvegarde de la playlist.'];
    }

    public function updatePlaylist($name, $newSongs) {
        $data = $this->readPlaylists();
        $playlistPath = null;
        $found = false;

        foreach ($data['playlists'] as &$playlist) {
            if ($playlist['name'] === $name) {
                $playlist['songs'] = $newSongs;
                $playlistPath = $this->playlistsDir . '/' . $playlist['dir'];
                $found = true;
                break;
            }
        }

        if (!$found) {
            return ['status' => 'error', 'message' => 'Playlist introuvable.'];
        }

        // Synchronize symlinks
        if ($playlistPath && is_dir($playlistPath)) {
            // Clear existing symlinks
            $existing_files = glob($playlistPath . '/*');
            foreach($existing_files as $file){
                if(is_link($file)) {
                    unlink($file);
                }
            }
            // Create new symlinks
            foreach ($newSongs as $songPath) {
                if (file_exists($songPath)) {
                    $linkName = $playlistPath . '/' . basename($songPath);
                    symlink($songPath, $linkName);
                }
            }
        }

        if ($this->savePlaylists($data)) {
            return ['status' => 'success', 'message' => 'Playlist mise à jour avec succès.'];
        }
        return ['status' => 'error', 'message' => 'Erreur lors de la mise à jour de la playlist.'];
    }

    public function deletePlaylist($name) {
        $data = $this->readPlaylists();
        $initialCount = count($data['playlists']);
        $dirToDelete = null;

        $data['playlists'] = array_values(array_filter($data['playlists'], function($playlist) use ($name, &$dirToDelete) {
            if ($playlist['name'] === $name) {
                $dirToDelete = $playlist['dir'];
                return false;
            }
            return true;
        }));

        if (count($data['playlists']) === $initialCount) {
            return ['status' => 'error', 'message' => 'Playlist introuvable.'];
        }

        // If the deleted playlist was the active one, switch to fallback
        if ($data['active_playlist'] === $name) {
            $this->setActivePlaylist(null);
            $data['active_playlist'] = null;
        }

        // Delete the directory
        if ($dirToDelete) {
            $this->rrmdir($this->playlistsDir . '/' . $dirToDelete);
        }

        if ($this->savePlaylists($data)) {
            return ['status' => 'success', 'message' => 'Playlist supprimée avec succès.'];
        }
        return ['status' => 'error', 'message' => 'Erreur lors de la suppression de la playlist.'];
    }

    public function setActivePlaylist($name) {
        $data = $this->readPlaylists();
        $targetDir = $this->fallbackDir; // Default to fallback

        if ($name !== null) {
            $found = false;
            foreach ($data['playlists'] as $playlist) {
                if ($playlist['name'] === $name) {
                    $targetDir = $this->playlistsDir . '/' . $playlist['dir'];
                    $found = true;
                    break;
                }
            }
            if (!$found) {
                return ['status' => 'error', 'message' => 'Playlist à activer introuvable.'];
            }
        }

        // Atomically update the symlink
        $tempLink = $this->livePlaylistLink . '_temp';
        if (file_exists($tempLink)) unlink($tempLink);
        symlink($targetDir, $tempLink);
        rename($tempLink, $this->livePlaylistLink);

        $data['active_playlist'] = $name;
        if ($this->savePlaylists($data)) {
            return ['status' => 'success', 'message' => 'Playlist active définie avec succès.'];
        }
        return ['status' => 'error', 'message' => 'Erreur lors de la sauvegarde de la playlist active.'];
    }
}

?>