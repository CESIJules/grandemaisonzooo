<?php
header('Content-Type: application/json');
require_once 'playlists.php';

$playlistManager = new PlaylistManager();
echo json_encode($playlistManager->getAllPlaylists());
?>