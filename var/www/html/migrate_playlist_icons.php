<?php
require_once 'auth_check.php';
header('Content-Type: application/json');

$playlistFile = '/var/www/html/playlist.json';

// Icon mapping from emoji to Font Awesome names
$iconMap = [
    '🎵' => 'music',
    '🎧' => 'headphones',
    '🔥' => 'fire',
    '🌙' => 'moon',
    '☀️' => 'sun',
    '⚡' => 'bolt',
    '❤️' => 'heart',
    '⭐' => 'star',
];

if (!file_exists($playlistFile)) {
    echo json_encode(['status' => 'error', 'message' => 'File not found']);
    exit;
}

$content = file_get_contents($playlistFile);
$data = json_decode($content, true);

if (!$data || !isset($data['playlists'])) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid JSON']);
    exit;
}

$changes = [];

foreach ($data['playlists'] as &$playlist) {
    $oldIcon = $playlist['icon'] ?? null;
    
    // If icon is an emoji, convert to FA name
    if ($oldIcon && isset($iconMap[$oldIcon])) {
        $playlist['icon'] = $iconMap[$oldIcon];
        $changes[] = "Converted '{$playlist['name']}' icon from {$oldIcon} to {$playlist['icon']}";
    }
    // If icon is not set or is already a FA name, use default
    elseif (!$oldIcon || !preg_match('/^[a-z\-]+$/', $oldIcon)) {
        $playlist['icon'] = 'music';
        $changes[] = "Set '{$playlist['name']}' icon to default 'music'";
    }
}

// Save the file
file_put_contents($playlistFile, json_encode($data, JSON_PRETTY_PRINT));

echo json_encode([
    'status' => 'success',
    'message' => 'Migration complete',
    'changes' => $changes,
    'data' => $data
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
?>
