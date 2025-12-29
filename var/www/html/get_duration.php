<?php
// get_duration.php

header('Content-Type: application/json');

// --- Configuration ---
$musicDirectory = '/home/radio/musique/';
// Fichier temporaire pour suivre l'heure de début de la piste actuelle.
$track_info_file = '/tmp/radio_track_info.json';

// --- Validation et Sécurité (Logique originale) ---
if (!isset($_GET['file']) || empty($_GET['file'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Filename parameter is missing.']);
    exit;
}

$fileName = $_GET['file'];
$sanitizedFileName = basename($fileName);

// Ajouter .mp3 si pas d'extension (Icecast envoie le titre sans extension)
if (!preg_match('/\.\w{2,4}$/', $sanitizedFileName)) {
    $sanitizedFileName .= '.mp3';
}

$fullPath = $musicDirectory . $sanitizedFileName;

if (realpath($fullPath) === false || strpos(realpath($fullPath), $musicDirectory) !== 0) {
    http_response_code(404);
    echo json_encode(['error' => 'File not found or access denied.']);
    exit;
}


// --- NOUVELLE LOGIQUE : Suivi de la synchronisation ---
$start_time = time(); // On initialise avec l'heure actuelle par défaut
$track_info = [];

// On lit le fichier de suivi s'il existe
if (file_exists($track_info_file)) {
    $track_info = json_decode(file_get_contents($track_info_file), true);
}

// On vérifie si la chanson demandée est différente de celle en mémoire
if (!isset($track_info['filename']) || $track_info['filename'] !== $sanitizedFileName) {
    // C'est une nouvelle chanson. On met à jour le fichier avec le nom et l'heure de début actuels.
    $track_info = [
        'filename' => $sanitizedFileName,
        'start_time' => time(),
    ];
    file_put_contents($track_info_file, json_encode($track_info));
    $start_time = $track_info['start_time'];
} else {
    // C'est la même chanson, on utilise simplement l'heure de début déjà enregistrée.
    $start_time = $track_info['start_time'];
}


// --- Extraction de la durée avec ffprobe (Logique originale) ---
$command = sprintf(
    'ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 %s',
    escapeshellarg($fullPath)
);
$duration = shell_exec($command);


// --- Réponse (Logique originale enrichie) ---
if ($duration === null || !is_numeric(trim($duration))) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to extract duration from file.', 'details' => 'Command output: ' . $duration]);
    exit;
}

// Succès : on renvoie la durée (comme avant) ET les informations de synchronisation
echo json_encode([
    'duration' => floatval(trim($duration)),
    'start_time' => $start_time,
    'server_now' => time()
]);

?>