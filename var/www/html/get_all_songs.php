<?php
header('Content-Type: application/json');
header('Cache-Control: no-cache');

$musicDir = '/home/radio/musique';
$response = [];

if (is_dir($musicDir)) {
    $files = scandir($musicDir);
    $musicFiles = [];
    foreach ($files as $file) {
        if ($file !== '.' && $file !== '..') {
            $musicFiles[] = $musicDir . '/' . $file; // Return full path
        }
    }
    
    if (empty($musicFiles)) {
        $response['status'] = 'success';
        $response['files'] = [];
        $response['message'] = 'Le dossier de musique est vide.';
    } else {
        $response['status'] = 'success';
        $response['files'] = array_values($musicFiles);
    }
} else {
    $response['status'] = 'error';
    $response['message'] = 'Le dossier de musique est introuvable sur le serveur.';
}

echo json_encode($response);
?>