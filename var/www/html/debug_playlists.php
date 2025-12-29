<?php
require_once 'auth_check.php';
header('Content-Type: application/json');

$playlistFile = '/var/www/html/playlist.json';

$result = [
    'file_exists' => file_exists($playlistFile),
    'file_readable' => is_readable($playlistFile),
    'file_writable' => is_writable($playlistFile),
];

if (file_exists($playlistFile)) {
    $content = file_get_contents($playlistFile);
    $result['raw_content'] = $content;
    $result['raw_length'] = strlen($content);
    
    $decoded = json_decode($content, true);
    $result['json_error'] = json_last_error_msg();
    $result['decoded_data'] = $decoded;
    
    if (isset($decoded['playlists'])) {
        $result['playlist_names'] = array_map(function($p) {
            return $p['name'] ?? 'NO_NAME';
        }, $decoded['playlists']);
        $result['playlist_count'] = count($decoded['playlists']);
    }
} else {
    $result['message'] = 'File does not exist';
}

echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
?>
