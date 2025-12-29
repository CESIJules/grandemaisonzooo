<?php
// get_current_track.php
// Retourne les informations du morceau actuellement en cours de lecture
// Utilise le fichier écrit par log_track.php (appelé par Liquidsoap)

header('Content-Type: application/json');
header('Cache-Control: no-cache, no-store, must-revalidate');

$track_info_file = '/tmp/radio_track_info.json';
$musicDirectory = '/home/radio/musique/';

// IMPORTANT: Délai de buffer Icecast (burst-size / bitrate)
// burst-size = 262144 bytes, bitrate ~128kbps = 16000 bytes/sec
// Donc le buffer = ~16 secondes. On ajoute ce délai au start_time
// pour que le timestamp côté client corresponde à l'audio réellement entendu
$ICECAST_BUFFER_DELAY = 16; // secondes (ajuster si nécessaire)

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
// IMPORTANT: Ajouter le délai de buffer Icecast au start_time
// L'audio atteint réellement l'auditeur X secondes après que Liquidsoap l'a envoyé
$server_now = time();
$adjusted_start_time = $start_time + $ICECAST_BUFFER_DELAY;
$elapsed = $server_now - $adjusted_start_time;

// S'assurer que elapsed n'est pas négatif (si le morceau vient de commencer)
if ($elapsed < 0) $elapsed = 0;

// Formater le titre pour l'affichage (comme le fait le frontend)
$displayTitle = pathinfo($filename, PATHINFO_FILENAME);
$displayTitle = str_replace('_', ' ', $displayTitle);
$displayTitle = preg_replace('/\s*-\s*/', ' - ', $displayTitle);
$displayTitle = strtoupper($displayTitle);

echo json_encode([
    'filename' => $filename,
    'display_title' => $displayTitle,
    'start_time' => $adjusted_start_time, // Temps ajusté avec le buffer
    'duration' => $duration,
    'elapsed' => $elapsed,
    'remaining' => max(0, $duration - $elapsed),
    'server_now' => $server_now,
    'buffer_delay' => $ICECAST_BUFFER_DELAY // Pour debug
]);
?>
