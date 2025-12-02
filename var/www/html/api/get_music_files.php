<?php
header('Content-Type: application/json');
header('Cache-Control: no-cache');

$musicDir = '/home/radio/musique';
$response = [];

if (is_dir($musicDir)) {
    $files = scandir($musicDir);
    // Filter out '.' and '..'
    $musicFiles = array_diff($files, ['.', '..']);
    
    if (empty($musicFiles)) {
        $response['status'] = 'success';
        $response['files'] = [];
        $response['message'] = 'Le dossier de musique est vide.';
    } else {
        $response['status'] = 'success';
        // Re-index the array to ensure it's a proper JSON array
        $response['files'] = array_values($musicFiles);
    }
} else {
    $response['status'] = 'error';
    $response['message'] = 'Le dossier de musique est introuvable sur le serveur.';
    // To provide more context for debugging, you might want to log the error
    // error_log("Music directory not found: " . $musicDir);
}

echo json_encode($response);
?>