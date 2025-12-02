<?php

class PlaylistManager {
    private $playlistFile = '/var/www/html/grandemaisonzooo/playlist.json';
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
        $content = file_get_contents($this->playlistFile);
        if ($content === false) {
            // Error reading file, return default
            return $this->defaultContent;
        }
        $data = json_decode($content, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            // JSON decode error, return default
            return $this->defaultContent;
        }
        // Ensure structure is always correct
        return array_merge($this->defaultContent, $data);
    }

    private function savePlaylists($data) {
        $json = json_encode($data, JSON_PRETTY_PRINT);
        if ($json === false) {
            // JSON encode error
            return false;
        }
        return file_put_contents($this->playlistFile, $json) !== false;
    }

    public function getAllPlaylists() {
        $data = $this->readPlaylists();
        return ['status' => 'success', 'data' => $data];
    }

    public function createPlaylist($name, $songs = []) {
        $data = $this->readPlaylists();
        
        // Check if playlist name already exists
        foreach ($data['playlists'] as $playlist) {
            if ($playlist['name'] === $name) {
                return ['status' => 'error', 'message' => 'Une playlist avec ce nom existe déjà.'];
            }
        }

        $newPlaylist = [
            'name' => $name,
            'songs' => $songs
        ];
        $data['playlists'][] = $newPlaylist;
        if ($this->savePlaylists($data)) {
            return ['status' => 'success', 'message' => 'Playlist créée avec succès.'];
        }
        return ['status' => 'error', 'message' => 'Erreur lors de la création de la playlist.'];
    }

    public function updatePlaylist($name, $newSongs) {
        $data = $this->readPlaylists();
        foreach ($data['playlists'] as &$playlist) {
            if ($playlist['name'] === $name) {
                $playlist['songs'] = $newSongs;
                if ($this->savePlaylists($data)) {
                    return ['status' => 'success', 'message' => 'Playlist mise à jour avec succès.'];
                }
                return ['status' => 'error', 'message' => 'Erreur lors de la mise à jour de la playlist.'];
            }
        }
        return ['status' => 'error', 'message' => 'Playlist introuvable.'];
    }

    public function deletePlaylist($name) {
        $data = $this->readPlaylists();
        $initialCount = count($data['playlists']);
        $data['playlists'] = array_filter($data['playlists'], function($playlist) use ($name) {
            return $playlist['name'] !== $name;
        });

        if (count($data['playlists']) === $initialCount) {
            return ['status' => 'error', 'message' => 'Playlist introuvable.'];
        }

        // If the deleted playlist was the active one, clear active_playlist
        if ($data['active_playlist'] === $name) {
            $data['active_playlist'] = null;
        }

        if ($this->savePlaylists($data)) {
            return ['status' => 'success', 'message' => 'Playlist supprimée avec succès.'];
        }
        return ['status' => 'error', 'message' => 'Erreur lors de la suppression de la playlist.'];
    }

    public function setActivePlaylist($name) {
        $data = $this->readPlaylists();
        
        // Check if the playlist exists
        $playlistExists = false;
        foreach ($data['playlists'] as $playlist) {
            if ($playlist['name'] === $name) {
                $playlistExists = true;
                break;
            }
        }

        if (!$playlistExists && $name !== null) { // Allow setting to null to "deactivate"
            return ['status' => 'error', 'message' => 'Playlist à activer introuvable.'];
        }

        $data['active_playlist'] = $name;
        if ($this->savePlaylists($data)) {
            return ['status' => 'success', 'message' => 'Playlist active définie avec succès.'];
        }
        return ['status' => 'error', 'message' => 'Erreur lors de la définition de la playlist active.'];
    }
}

?>