<?php
header('Content-Type: application/json');

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
    return $data['tracks']['items'][0]['id'] ?? null;
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

// Clean filename for search (remove extension, underscores, etc)
$searchQuery = pathinfo($filename, PATHINFO_FILENAME);
$searchQuery = str_replace(['_', '-'], ' ', $searchQuery);
// Remove common junk like (Official Video), [Lyrics], etc if you want, but usually Spotify search is smart.

$token = getSpotifyToken($clientId, $clientSecret);

if (!$token) {
    echo json_encode(['status' => 'error', 'message' => 'Spotify Auth Failed. Check API Keys.']);
    exit;
}

$trackId = searchTrack($searchQuery, $token);

if ($trackId) {
    $features = getAudioFeatures($trackId, $token);
    
    if ($features && isset($features['tempo'], $features['key'], $features['mode'])) {
        $bpm = round($features['tempo']);
        $camelot = convertToCamelot($features['key'], $features['mode']);
        
        $result = [
            'bpm' => $bpm,
            'key' => $features['key'], // Raw key if needed
            'camelot' => $camelot,
            'source' => 'spotify'
        ];
        
        // Save to cache
        $metadata[$filename] = $result;
        file_put_contents($metadataFile, json_encode($metadata, JSON_PRETTY_PRINT));
        
        echo json_encode(['status' => 'success', 'data' => $result]);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Audio features not found on Spotify']);
    }
} else {
    // Track not found
    echo json_encode(['status' => 'error', 'message' => 'Track not found on Spotify']);
}
?>
