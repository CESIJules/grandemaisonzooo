<?php
require_once 'auth_check.php';
header('Content-Type: application/json');

// --- Configuration ---
$outputDir = '/home/radio/musique/';
$spotdlPath = '/opt/spotdl-venv/bin/spotdl';
$postData = json_decode(file_get_contents('php://input'), true);
$spotifyUrl = $postData['url'] ?? '';

// --- Validation ---
if (empty($spotifyUrl) || !preg_match('/(open\.spotify\.com|spotify:)/', $spotifyUrl)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'URL Spotify invalide ou manquante.']);
    exit;
}

// Check if spotdl exists
if (!file_exists($spotdlPath)) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'spotdl non trouvé. Installez-le avec: pipx install spotdl']);
    exit;
}

// --- Command Execution ---
// Sanitize the URL for shell usage to prevent command injection
$sanitizedUrl = escapeshellarg($spotifyUrl);
$escapedOutputDir = escapeshellarg($outputDir);

// Build the spotdl command with full path
// --output: Specify the output directory and format
// --format mp3: Output as MP3
// --bitrate 320k: Best quality
// --output format: {artist} - {title}.{output-ext}
$command = "cd $escapedOutputDir && $spotdlPath download $sanitizedUrl --output \"{artist} - {title}.{output-ext}\" --format mp3 --bitrate 320k";

$output = [];
$return_var = 0;
// Execute the command and redirect stderr to stdout to capture all output
exec($command . ' 2>&1', $output, $return_var);

// --- Response ---
if ($return_var === 0) {
    // Try to find downloaded tracks from output
    $downloadedTracks = [];
    foreach ($output as $line) {
        // spotdl outputs lines like: Downloaded "Artist - Title"
        if (preg_match('/Downloaded\s+"(.+)"/', $line, $matches)) {
            $downloadedTracks[] = $matches[1];
        }
        // Also check for "Skipping" (already exists)
        if (preg_match('/Skipping\s+"(.+)"/', $line, $matches)) {
            $downloadedTracks[] = $matches[1] . ' (déjà existant)';
        }
    }

    // --- SYNC FALLBACK ---
    // Automatically add new songs to the fallback folder
    require_once 'playlists.php';
    $pm = new PlaylistManager();
    $pm->syncFallbackDirectory();

    $count = count($downloadedTracks);
    if ($count > 0) {
        $message = $count === 1 
            ? "Téléchargé: " . $downloadedTracks[0]
            : "$count piste(s) téléchargée(s)";
        echo json_encode([
            'status' => 'success', 
            'message' => $message,
            'tracks' => $downloadedTracks
        ]);
    } else {
        // Command succeeded but no tracks found in output
        echo json_encode([
            'status' => 'success', 
            'message' => 'Téléchargement terminé.',
            'details' => implode("\n", $output)
        ]);
    }
} else {
    http_response_code(500);
    $errorMessage = "Erreur lors du téléchargement Spotify. ";
    $errorMessage .= "Vérifiez que spotdl est installé (pip install spotdl). ";
    $errorMessage .= "Détails: " . implode(" ", array_slice($output, -5));
    echo json_encode(['status' => 'error', 'message' => $errorMessage]);
}
?>
