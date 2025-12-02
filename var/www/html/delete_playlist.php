<?php
header('Content-Type: application/json');
require_once 'playlists.php';

$input = json_decode(file_get_contents('php://input'), true);
$name = $input['name'] ?? '';

if (empty($name)) {
    echo json_encode(['status' => 'error', 'message' => 'Le nom de la playlist ne peut pas être vide.']);
    exit();
}

$playlistManager = new PlaylistManager();
echo json_encode($playlistManager->deletePlaylist($name));
?>