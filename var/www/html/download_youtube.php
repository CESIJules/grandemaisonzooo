<?php
header('Content-Type: application/json');

// NOTE: The current login system is client-side only (sessionStorage).
// For this server-side check to be effective, the login process would need to be
// updated to create a PHP session (e.g., by setting $_SESSION['loggedIn'] = true).
// This is included as a security best practice recommendation.
/*
session_start();
if (!isset($_SESSION['loggedIn']) || $_SESSION['loggedIn'] !== true) {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'Accès non autorisé.']);
    exit;
}
*/

// --- Configuration ---
$outputDir = '/home/radio/musique/';
$postData = json_decode(file_get_contents('php://input'), true);
$youtubeUrl = $postData['url'] ?? '';

// --- Validation ---
if (empty($youtubeUrl) || !filter_var($youtubeUrl, FILTER_VALIDATE_URL) || !preg_match('/(youtube\.com|youtu\.be)/', $youtubeUrl)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'URL YouTube invalide ou manquante.']);
    exit;
}

// --- Command Execution ---
// Sanitize the URL for shell usage to prevent command injection
$sanitizedUrl = escapeshellarg($youtubeUrl);

// Define the output filename template for yt-dlp.
// %(title)s is the video title, and %(ext)s is the extension (mp3).
$outputTemplate = escapeshellarg($outputDir . '%(title)s.%(ext)s');

// Build the yt-dlp command.
// -x: Extract audio.
// --audio-format mp3: Set the audio format.
// --audio-quality 0: Best available variable bitrate (recommended by yt-dlp for quality).
// --ppa "ffmpeg:-af loudnorm": Use ffmpeg's "loudnorm" filter for audio normalization.
// -o: Specify the output path and filename template.
// --no-playlist: If a playlist URL is given, only download the single video specified.
$command = "yt-dlp -x --audio-format mp3 --audio-quality 0 --ppa \"ffmpeg:-af loudnorm\" -o $outputTemplate --no-playlist $sanitizedUrl";

// To see the exact command being run for debugging, you could log it.
// error_log("Executing command: " . $command);

$output = [];
$return_var = 0;
// Execute the command and redirect stderr to stdout to capture all output.
exec($command . ' 2>&1', $output, $return_var);

// --- Response ---
if ($return_var === 0) {
    // Try to find the final filename from yt-dlp's output
    $filename = 'Fichier audio'; // Default name in case parsing fails
    foreach ($output as $line) {
        // The line indicating the final MP3 file looks like this:
        // [ExtractAudio] Destination: /path/to/music/Video Title.mp3
        if (preg_match('/[ExtractAudio] Destination: (.*)/', $line, $matches)) {
            $filename = basename($matches[1]);
            break;
        }
    }

    // --- SYNC FALLBACK ---
    // Automatically add the new song to the fallback folder
    require_once 'playlists.php';
    $pm = new PlaylistManager();
    $pm->syncFallbackDirectory();

    echo json_encode(['status' => 'success', 'message' => "$filename a été téléchargé, converti et ajouté."]);
} else {
    http_response_code(500);
    // Create a detailed error message for the admin to help with diagnostics.
    $errorMessage = "Erreur lors du traitement de la vidéo. ";
    $errorMessage .= "Vérifiez que yt-dlp et ffmpeg sont installés et accessibles par le serveur web. ";
    $errorMessage .= "Détails de l'erreur: " . implode(" ", $output);
    echo json_encode(['status' => 'error', 'message' => $errorMessage]);
}
?>