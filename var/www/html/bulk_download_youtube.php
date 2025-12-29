<?php
require_once 'auth_check.php';
header('Content-Type: application/json');

// --- Configuration ---
$outputDir = '/home/radio/musique/';
$postData = json_decode(file_get_contents('php://input'), true);
$urls = $postData['urls'] ?? [];

// --- Validation ---
if (empty($urls) || !is_array($urls)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Aucune URL fournie.']);
    exit;
}

// Filter and validate URLs
$validUrls = [];
foreach ($urls as $url) {
    $url = trim($url);
    if (!empty($url) && filter_var($url, FILTER_VALIDATE_URL) && preg_match('/(youtube\.com|youtu\.be)/', $url)) {
        $validUrls[] = $url;
    }
}

if (empty($validUrls)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Aucune URL YouTube valide trouvée.']);
    exit;
}

// Limit to prevent abuse
$maxUrls = 20;
if (count($validUrls) > $maxUrls) {
    $validUrls = array_slice($validUrls, 0, $maxUrls);
}

// --- Process each URL ---
$results = [];
$successCount = 0;
$errorCount = 0;

foreach ($validUrls as $index => $youtubeUrl) {
    $sanitizedUrl = escapeshellarg($youtubeUrl);
    $outputTemplate = escapeshellarg($outputDir . '%(title)s.%(ext)s');
    
    // Build the yt-dlp command
    $command = "yt-dlp -x --audio-format mp3 --audio-quality 0 --ppa \"ffmpeg:-af loudnorm\" -o $outputTemplate --no-playlist $sanitizedUrl";
    
    $output = [];
    $return_var = 0;
    exec($command . ' 2>&1', $output, $return_var);
    
    // Parse result
    $filename = 'Unknown';
    foreach ($output as $line) {
        if (preg_match('/\[ExtractAudio\] Destination: (.*)/', $line, $matches)) {
            $filename = basename($matches[1]);
            break;
        }
        // Also check for "has already been downloaded"
        if (preg_match('/\[download\] (.+) has already been downloaded/', $line, $matches)) {
            $filename = basename($matches[1]);
            break;
        }
    }
    
    if ($return_var === 0) {
        $successCount++;
        $results[] = [
            'url' => $youtubeUrl,
            'status' => 'success',
            'filename' => $filename
        ];
    } else {
        $errorCount++;
        $errorMsg = implode(' ', array_slice($output, -3)); // Last 3 lines of error
        $results[] = [
            'url' => $youtubeUrl,
            'status' => 'error',
            'message' => $errorMsg
        ];
    }
}

// --- Sync fallback directory ---
if ($successCount > 0) {
    require_once 'playlists.php';
    $pm = new PlaylistManager();
    $pm->syncFallbackDirectory();
}

// --- Response ---
echo json_encode([
    'status' => $errorCount === 0 ? 'success' : ($successCount > 0 ? 'partial' : 'error'),
    'message' => "$successCount téléchargé(s), $errorCount erreur(s)",
    'total' => count($validUrls),
    'success_count' => $successCount,
    'error_count' => $errorCount,
    'results' => $results
]);
?>
