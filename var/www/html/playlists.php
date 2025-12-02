<?php

class PlaylistManager {
    private $playlistFile = '/var/www/html/playlist.json';
    private $activePlaylistFile = '/home/radio/current.playlist';
    private $musicDir = '/home/radio/musique';
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
            return $this->defaultContent;
        }
        $data = json_decode($content, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return $this->defaultContent;
        }
        return array_merge($this->defaultContent, $data);
    }

    private function savePlaylists($data) {
        $json = json_encode($data, JSON_PRETTY_PRINT);
        if ($json === false) {
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
        foreach ($data['playlists'] as $playlist) {
            if ($playlist['name'] === $name) {
                return ['status' => 'error', 'message' => 'Une playlist avec ce nom existe déjà.'];
            }
        }
        $newPlaylist = ['name' => $name, 'songs' => $songs];
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
        $data['playlists'] = array_values(array_filter($data['playlists'], function($playlist) use ($name) {
            return $playlist['name'] !== $name;
        }));
        if (count($data['playlists']) === $initialCount) {
            return ['status' => 'error', 'message' => 'Playlist introuvable.'];
        }
        if ($data['active_playlist'] === $name) {
            $data['active_playlist'] = null;
            // Also update the active playlist file to fallback mode
            $this->setActivePlaylist(null);
        }
        if ($this->savePlaylists($data)) {
            return ['status' => 'success', 'message' => 'Playlist supprimée avec succès.'];
        }
        return ['status' => 'error', 'message' => 'Erreur lors de la suppression de la playlist.'];
    }

    public function setActivePlaylist($name) {
        $data = $this->readPlaylists();
        $playlistExists = false;
        $songs_to_write = [];

        if ($name !== null) {
            foreach ($data['playlists'] as $playlist) {
                if ($playlist['name'] === $name) {
                    $playlistExists = true;
                    $songs_to_write = $playlist['songs'];
                    break;
                }
            }
        }

        if ($name !== null && !$playlistExists) {
            return ['status' => 'error', 'message' => 'Playlist à activer introuvable.'];
        }

        // If no playlist is to be activated OR the found playlist is empty, fallback to all music
        if (empty($songs_to_write)) {
            $all_music_files = glob($this->musicDir . '/*.{mp3,m4a,aac,ogg,flac}', GLOB_BRACE);
            $songs_to_write = $all_music_files ? $all_music_files : [];
        }

        // Write the songs to the file for Liquidsoap
        $file_content = implode("\n", $songs_to_write);
        if (@file_put_contents($this->activePlaylistFile, $file_content) === false) {
            // Attempt to create the file if it doesn't exist, and check permissions
            return ['status' => 'error', 'message' => 'Erreur critique: Impossible d\'écrire dans le fichier ' . $this->activePlaylistFile . '. Vérifiez que le serveur web (www-data) a les permissions d\'écriture sur le dossier /home/radio/.'];
        }

        // Update the active playlist in JSON for the UI
        $data['active_playlist'] = $name;
        if ($this->savePlaylists($data)) {
            return ['status' => 'success', 'message' => 'Playlist active définie avec succès.'];
        }
        return ['status' => 'error', 'message' => 'Erreur lors de la définition de la playlist active.'];
    }
}

?>