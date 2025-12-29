<?php
require_once 'auth_check.php';
header('Content-Type: application/json');
require_once 'playlists.php';

$input = json_decode(file_get_contents('php://input'), true);
$name = $input['name'] ?? '';
$cover = $input['cover'] ?? '';

if (empty($name)) {
    echo json_encode(['status' => 'error', 'message' => 'Nom de playlist requis']);
    exit();
}

if (empty($cover) || strpos($cover, 'data:image') !== 0) {
    echo json_encode(['status' => 'error', 'message' => 'Image invalide']);
    exit();
}

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
if (!file_put_contents($coverFullPath, $coverData)) {
    echo json_encode(['status' => 'error', 'message' => 'Erreur lors de la sauvegarde de l\'image']);
    exit();
}

$coverPath = 'covers/' . $coverFilename;

// Update playlist with new cover
$playlistManager = new PlaylistManager();
$result = $playlistManager->updatePlaylistCover($name, $coverPath);

if ($result['status'] === 'success') {
    $result['coverPath'] = $coverPath;
}

echo json_encode($result);
?>
