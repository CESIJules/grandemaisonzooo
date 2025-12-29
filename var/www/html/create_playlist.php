<?php
require_once 'auth_check.php';
header('Content-Type: application/json');
require_once 'playlists.php';

$input = json_decode(file_get_contents('php://input'), true);
$name = $input['name'] ?? '';
$songs = $input['songs'] ?? [];
$color = $input['color'] ?? '#6366f1';
$icon = $input['icon'] ?? 'music';
$cover = $input['cover'] ?? '';

if (empty($name)) {
    echo json_encode(['status' => 'error', 'message' => 'Le nom de la playlist ne peut pas être vide.']);
    exit();
}

// Handle cover upload if provided
$coverPath = '';
if (!empty($cover) && strpos($cover, 'data:image') === 0) {
    // Create covers directory if it doesn't exist
    $coversDir = __DIR__ . '/covers';
    if (!is_dir($coversDir)) {
        mkdir($coversDir, 0755, true);
    }
    
    // Extract base64 data
    $coverData = preg_replace('/^data:image\/\w+;base64,/', '', $cover);
    $coverData = base64_decode($coverData);
    
    // Generate unique filename
    $safeName = preg_replace('/[^a-z0-9]/i', '_', $name);
    $coverFilename = $safeName . '_' . time() . '.jpg';
    $coverFullPath = $coversDir . '/' . $coverFilename;
    
    // Save the image
    if (file_put_contents($coverFullPath, $coverData)) {
        $coverPath = 'covers/' . $coverFilename;
    }
}

$playlistManager = new PlaylistManager();
echo json_encode($playlistManager->createPlaylist($name, $songs, $color, $icon, $coverPath));
?>