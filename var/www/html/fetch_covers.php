<?php
// fetch_covers.php
header('Content-Type: application/json');
// Increase time limit for processing many files
set_time_limit(300); 

$musicDir = '/home/radio/musique';
$coversDir = __DIR__ . '/covers'; // /var/www/html/covers

if (!file_exists($coversDir)) {
    if (!mkdir($coversDir, 0777, true)) {
        echo json_encode(['status' => 'error', 'message' => 'Impossible de créer le dossier covers.']);
        exit;
    }
}

if (!is_dir($musicDir)) {
    echo json_encode(['status' => 'error', 'message' => 'Dossier musique introuvable.']);
    exit;
}

$files = scandir($musicDir);
$processed = 0;
$downloaded = 0;
$errors = [];

foreach ($files as $file) {
    if ($file === '.' || $file === '..') continue;
    
    $pathInfo = pathinfo($file);
    if (!isset($pathInfo['extension']) || !in_array(strtolower($pathInfo['extension']), ['mp3', 'm4a', 'wav', 'flac'])) {
        continue;
    }

    $filename = $pathInfo['filename']; // Artist - Title (usually)
    
    // Check if cover exists
    // We'll use the same filename but with .jpg
    $coverPathJpg = $coversDir . '/' . $filename . '.jpg';
    
    if (file_exists($coverPathJpg)) {
        continue; // Already exists
    }

    // Parse Artist and Title
    // Assuming "Artist - Title" format
    $parts = explode(' - ', $filename);
    if (count($parts) >= 2) {
        $artist = trim($parts[0]);
        $title = trim($parts[1]);
        $searchTerm = $artist . ' ' . $title;
    } else {
        // Fallback: search the whole filename
        $searchTerm = str_replace('_', ' ', $filename);
    }

    // Call iTunes API
    $url = 'https://itunes.apple.com/search?term=' . urlencode($searchTerm) . '&entity=song&limit=1';
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
    // Set User-Agent to avoid being blocked
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($response && $httpCode == 200) {
        $data = json_decode($response, true);
        if (isset($data['results']) && count($data['results']) > 0) {
            $artworkUrl = $data['results'][0]['artworkUrl100'];
            // Get higher res (600x600)
            $artworkUrl = str_replace('100x100bb', '600x600bb', $artworkUrl);
            
            $imageContent = @file_get_contents($artworkUrl);
            if ($imageContent) {
                file_put_contents($coverPathJpg, $imageContent);
                $downloaded++;
            } else {
                $errors[] = "Impossible de télécharger l'image pour : $filename";
            }
        } else {
             $errors[] = "Aucun résultat iTunes pour : $filename";
        }
    } else {
        $errors[] = "Erreur API iTunes pour : $filename";
    }
    
    $processed++;
    // Be nice to the API
    usleep(200000); // 200ms
}

echo json_encode([
    'status' => 'success', 
    'message' => "Traitement terminé. $downloaded covers téléchargées.",
    'details' => $errors
]);
?>