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
    $newFiles = [];
    foreach ($output as $line) {
        // spotdl outputs lines like: Downloaded "Artist - Title"
        if (preg_match('/Downloaded\s+"(.+)"/', $line, $matches)) {
            $downloadedTracks[] = $matches[1];
            // The filename format is "{artist} - {title}.mp3"
            $newFiles[] = $matches[1] . '.mp3';
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

    // --- AUTO-ANALYZE NEW FILES (BACKGROUND) ---
    // Launch analysis in background to not block the response
    $pythonPath = '/home/radio/venv/bin/python';
    $analyzeScript = '/home/radio/analyze_and_save.py';
    
    $filesToAnalyze = 0;
    foreach ($newFiles as $filename) {
        $filepath = $outputDir . $filename;
        if (file_exists($filepath)) {
            // Launch analysis in background (nohup + & to detach)
            $cmd = sprintf(
                'nohup %s %s %s > /dev/null 2>&1 &',
                escapeshellcmd($pythonPath),
                escapeshellarg($analyzeScript),
                escapeshellarg($filepath)
            );
            exec($cmd);
            $filesToAnalyze++;
        }
    }

    $count = count($downloadedTracks);
    if ($count > 0) {
        $message = $count === 1 
            ? "Téléchargé: " . $downloadedTracks[0]
            : "$count piste(s) téléchargée(s)";
        if ($filesToAnalyze > 0) {
            $message .= " (analyse en cours...)";
        }
        echo json_encode([
            'status' => 'success', 
            'message' => $message,
            'tracks' => $downloadedTracks,
            'analyzing' => $filesToAnalyze
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
