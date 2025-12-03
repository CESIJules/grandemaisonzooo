<?php
// Disable display_errors to prevent HTML error output from breaking JSON
ini_set('display_errors', 0);
error_reporting(E_ALL);

header('Content-Type: application/json');

// Check for cURL extension
if (!extension_loaded('curl')) {
    echo json_encode(['status' => 'error', 'message' => 'PHP cURL extension is not installed. Please install it (apt install php-curl).']);
    exit;
}

// --- CONFIGURATION SPOTIFY ---
// REMPLACE CES VALEURS PAR LES TIENNES
$clientId = 'b4852c105cd94d43a40128a8a8acb894';
$clientSecret = '92f8fcf08a424af1b0759fadb7567b04';
// -----------------------------

$input = json_decode(file_get_contents('php://input'), true);
$filename = $input['filename'] ?? null;

if (!$filename) {
    echo json_encode(['status' => 'error', 'message' => 'No filename provided']);
    exit;
}

$metadataFile = __DIR__ . '/music_metadata.json';

// 1. CHECK CACHE
$metadata = [];
if (file_exists($metadataFile)) {
    $metadata = json_decode(file_get_contents($metadataFile), true) ?? [];
}

if (isset($metadata[$filename])) {
    // Return cached data
    echo json_encode(['status' => 'success', 'data' => $metadata[$filename]]);
    exit;
}

// 2. SPOTIFY AUTHENTICATION
function getSpotifyToken($clientId, $clientSecret) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, 'https://accounts.spotify.com/api/token');
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, 'grant_type=client_credentials');
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Basic ' . base64_encode($clientId . ':' . $clientSecret)
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $response = curl_exec($ch);
    curl_close($ch);
    
    $data = json_decode($response, true);
    return $data['access_token'] ?? null;
}

// 3. SEARCH TRACK
function searchTrack($query, $token) {
    $query = urlencode($query);
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "https://api.spotify.com/v1/search?q=$query&type=track&limit=1");
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Authorization: Bearer $token"
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $response = curl_exec($ch);
    curl_close($ch);
    
    $data = json_decode($response, true);
    if (isset($data['tracks']['items'][0])) {
        $item = $data['tracks']['items'][0];
        return [
            'id' => $item['id'],
            'name' => $item['name'],
            'artist' => $item['artists'][0]['name']
        ];
    }
    return null;
}

// 4. GET AUDIO FEATURES
function getAudioFeatures($trackId, $token) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "https://api.spotify.com/v1/audio-features/$trackId");
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Authorization: Bearer $token"
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $response = curl_exec($ch);
    curl_close($ch);
    
    return json_decode($response, true);
}

// 5. CONVERT TO CAMELOT
function convertToCamelot($key, $mode) {
    // Spotify: key 0=C, 1=C#, etc. | mode 1=Major, 0=Minor
    // Camelot Wheel Mapping
    $majorMap = [
        0 => '8B', 1 => '3B', 2 => '10B', 3 => '5B', 4 => '12B', 5 => '7B', 
        6 => '2B', 7 => '9B', 8 => '4B', 9 => '11B', 10 => '6B', 11 => '1B'
    ];
    $minorMap = [
        0 => '5A', 1 => '12A', 2 => '7A', 3 => '2A', 4 => '9A', 5 => '4A', 
        6 => '11A', 7 => '6A', 8 => '1A', 9 => '8A', 10 => '3A', 11 => '10A'
    ];
    
    if ($key === -1) return null; // No key detected
    
    return ($mode == 1) ? ($majorMap[$key] ?? null) : ($minorMap[$key] ?? null);
}

// --- MAIN LOGIC ---

// Clean filename for search
$searchQuery = pathinfo($filename, PATHINFO_FILENAME);
// Replace underscores and dashes with spaces
$searchQuery = preg_replace('/[_\-]/', ' ', $searchQuery);
// Remove multiple spaces
$searchQuery = preg_replace('/\s+/', ' ', $searchQuery);
$searchQuery = trim($searchQuery);

$token = getSpotifyToken($clientId, $clientSecret);

if (!$token) {
    echo json_encode(['status' => 'error', 'message' => 'Spotify Auth Failed. Check API Keys.']);
    exit;
}

$trackInfo = searchTrack($searchQuery, $token);

if ($trackInfo) {
    $features = getAudioFeatures($trackInfo['id'], $token);
    
    if ($features && isset($features['tempo'], $features['key'], $features['mode'])) {
        $bpm = round($features['tempo']);
        $camelot = convertToCamelot($features['key'], $features['mode']);
        
        $result = [
            'bpm' => $bpm,
            'key' => $features['key'],
            'camelot' => $camelot,
            'source' => 'spotify',
            'matched_track' => $trackInfo['name'] . ' - ' . $trackInfo['artist']
        ];
        
        // Save to cache
        $metadata[$filename] = $result;
        file_put_contents($metadataFile, json_encode($metadata, JSON_PRETTY_PRINT));
        
        echo json_encode(['status' => 'success', 'data' => $result]);
    } else {
        // Check if features contains an error
        $errorMsg = isset($features['error']) ? $features['error']['message'] : 'Audio features missing';
        echo json_encode([
            'status' => 'error', 
            'message' => "Found '{$trackInfo['name']}' by '{$trackInfo['artist']}' but no audio features. ($errorMsg)"
        ]);
    }
} else {
    echo json_encode(['status' => 'error', 'message' => "Track not found on Spotify for query: '$searchQuery'"]);
}
?>
