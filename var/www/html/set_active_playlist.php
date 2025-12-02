<?php
header('Content-Type: application/json');
require_once 'playlists.php';

$input = json_decode(file_get_contents('php://input'), true);
$name = $input['name'] ?? null; // Can be null to deactivate

$playlistManager = new PlaylistManager();
echo json_encode($playlistManager->setActivePlaylist($name));
?>