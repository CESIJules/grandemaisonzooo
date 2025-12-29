<?php
require_once 'auth_check.php';
header('Content-Type: application/json');
require_once 'playlists.php';

$input = json_decode(file_get_contents('php://input'), true);
$name = $input['name'] ?? '';
$songs = $input['songs'] ?? [];
$color = $input['color'] ?? '#6366f1';
$icon = $input['icon'] ?? '🎵';

if (empty($name)) {
    echo json_encode(['status' => 'error', 'message' => 'Le nom de la playlist ne peut pas être vide.']);
    exit();
}

$playlistManager = new PlaylistManager();
echo json_encode($playlistManager->createPlaylist($name, $songs, $color, $icon));
?>