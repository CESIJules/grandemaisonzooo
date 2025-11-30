<?php
// fetch_covers.php

// Enable error reporting for debugging (will be captured by shutdown function if fatal)
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json');

// Catch fatal errors
register_shutdown_function(function() {
    $error = error_get_last();
    if ($error !== NULL && ($error['type'] === E_ERROR || $error['type'] === E_PARSE || $error['type'] === E_CORE_ERROR || $error['type'] === E_COMPILE_ERROR)) {
        // Clear any previous output
        if (ob_get_length()) ob_clean();
        echo json_encode(['status' => 'error', 'message' => 'Fatal Error: ' . $error['message'] . ' on line ' . $error['line']]);
    }
});

// Start output buffering to prevent unwanted output
ob_start();

// Increase time limit for processing many files
set_time_limit(300); 

$musicDir = '/home/radio/musique';
$coversDir = __DIR__ . '/covers'; // /var/www/html/covers

// Check extensions
if (!extension_loaded('curl') && !ini_get('allow_url_fopen')) {
    ob_clean();
    echo json_encode(['status' => 'error', 'message' => 'Extension PHP CURL manquante et allow_url_fopen désactivé. Impossible de faire des requêtes HTTP.']);
    exit;
}

if (!file_exists($coversDir)) {
    if (!mkdir($coversDir, 0777, true)) {
        ob_clean();
        echo json_encode(['status' => 'error', 'message' => 'Impossible de créer le dossier covers. Vérifiez les permissions.']);
        exit;
    }
}

if (!is_dir($musicDir)) {
    ob_clean();
    echo json_encode(['status' => 'error', 'message' => 'Dossier musique introuvable: ' . $musicDir]);
    exit;
}

$files = scandir($musicDir);
if ($files === false) {
    ob_clean();
    echo json_encode(['status' => 'error', 'message' => 'Impossible de lire le dossier musique.']);
    exit;
}

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
    
    $response = fetchUrl($url);

    if ($response) {
        $data = json_decode($response, true);
        if (isset($data['results']) && count($data['results']) > 0) {
            $artworkUrl = $data['results'][0]['artworkUrl100'];
            // Get higher res (600x600)
            $artworkUrl = str_replace('100x100bb', '600x600bb', $artworkUrl);
            
            $imageContent = fetchUrl($artworkUrl);
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
        $errors[] = "Erreur API iTunes (ou réseau) pour : $filename";
    }
    
    $processed++;
    // Be nice to the API
    usleep(200000); // 200ms
}

function fetchUrl($url) {
    if (extension_loaded('curl')) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        return ($httpCode == 200) ? $response : false;
    } elseif (ini_get('allow_url_fopen')) {
        $options = [
            'http' => [
                'method' => 'GET',
                'header' => "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36\r\n"
            ]
        ];
        $context = stream_context_create($options);
        return @file_get_contents($url, false, $context);
    }
    return false;
}

// Ensure UTF-8 for JSON
function utf8ize($d) {
    if (is_array($d)) {
        foreach ($d as $k => $v) {
            $d[$k] = utf8ize($v);
        }
    } else if (is_string($d)) {
        if (function_exists('mb_convert_encoding')) {
            return mb_convert_encoding($d, 'UTF-8', 'UTF-8');
        } else if (function_exists('iconv')) {
            return iconv('ISO-8859-1', 'UTF-8', $d);
        } else {
            return $d; // Hope for the best
        }
    }
    return $d;
}

$response = [
    'status' => 'success', 
    'message' => "Traitement terminé. $downloaded covers téléchargées.",
    'details' => $errors
];

$json = json_encode(utf8ize($response));

// Clear buffer and output
ob_end_clean();

if ($json === false) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Erreur JSON encoding: ' . json_last_error_msg()
    ]);
} else {
    echo $json;
}
?>