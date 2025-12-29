<?php
// get_duration.php

header('Content-Type: application/json');

// --- Configuration ---
$musicDirectory = '/home/radio/musique/';
// Fichier temporaire écrit par log_track.php (appelé par Liquidsoap) pour suivre le morceau actuel
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


// --- LOGIQUE DE SYNCHRONISATION ---
// On lit le fichier de suivi écrit par log_track.php (appelé par Liquidsoap)
// IMPORTANT: Ne pas modifier ce fichier ici! Seul log_track.php doit l'écrire.
$start_time = time(); // Fallback si pas d'info

if (file_exists($track_info_file)) {
    $track_info = json_decode(file_get_contents($track_info_file), true);
    if (isset($track_info['start_time'])) {
        $start_time = $track_info['start_time'];
    }
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

// Succès : on renvoie la durée ET les informations de synchronisation
echo json_encode([
    'duration' => floatval(trim($duration)),
    'start_time' => $start_time,
    'server_now' => time()
]);

?>