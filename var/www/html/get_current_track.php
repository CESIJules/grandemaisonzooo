<?php
// get_current_track.php
// Retourne les informations du morceau actuellement en cours de lecture
// Utilise le fichier écrit par log_track.php (appelé par Liquidsoap)

header('Content-Type: application/json');
header('Cache-Control: no-cache, no-store, must-revalidate');

$track_info_file = '/tmp/radio_track_info.json';
$musicDirectory = '/home/radio/musique/';

// Vérifier si le fichier de suivi existe
if (!file_exists($track_info_file)) {
    echo json_encode([
        'error' => 'No track info available',
        'server_now' => time()
    ]);
    exit;
}

$track_info = json_decode(file_get_contents($track_info_file), true);

if (!isset($track_info['filename']) || !isset($track_info['start_time'])) {
    echo json_encode([
        'error' => 'Invalid track info',
        'server_now' => time()
    ]);
    exit;
}

$filename = $track_info['filename'];
$start_time = $track_info['start_time'];
$duration = 0;

// Essayer de récupérer la durée du fichier
$fullPath = $musicDirectory . $filename;
if (file_exists($fullPath)) {
    $command = sprintf(
        'ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 %s',
        escapeshellarg($fullPath)
    );
    $durationOutput = shell_exec($command);
    if ($durationOutput !== null && is_numeric(trim($durationOutput))) {
        $duration = floatval(trim($durationOutput));
    }
}

// Calculer le temps écoulé depuis le début
$server_now = time();
$elapsed = $server_now - $start_time;

// Formater le titre pour l'affichage (comme le fait le frontend)
$displayTitle = pathinfo($filename, PATHINFO_FILENAME);
$displayTitle = str_replace('_', ' ', $displayTitle);
$displayTitle = preg_replace('/\s*-\s*/', ' - ', $displayTitle);
$displayTitle = strtoupper($displayTitle);

echo json_encode([
    'filename' => $filename,
    'display_title' => $displayTitle,
    'start_time' => $start_time,
    'duration' => $duration,
    'elapsed' => $elapsed,
    'remaining' => max(0, $duration - $elapsed),
    'server_now' => $server_now
]);
?>
