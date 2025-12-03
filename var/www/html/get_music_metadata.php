<?php
// Disable display_errors to prevent HTML error output from breaking JSON
ini_set('display_errors', 0);
error_reporting(E_ALL);

header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true);
$filename = $input['filename'] ?? null;
$force = $input['force'] ?? false;

if (!$filename) {
    echo json_encode(['status' => 'error', 'message' => 'No filename provided']);
    exit;
}

$metadataFile = __DIR__ . '/music_metadata.json';
$musicDir = '/home/radio/musique';
$filePath = $musicDir . '/' . $filename;

// 1. CHECK CACHE
$metadata = [];
if (file_exists($metadataFile)) {
    $metadata = json_decode(file_get_contents($metadataFile), true) ?? [];
}

if (!$force && isset($metadata[$filename])) {
    // Return cached data
    echo json_encode(['status' => 'success', 'data' => $metadata[$filename]]);
    exit;
}

// 2. LOCAL ANALYSIS
if (!file_exists($filePath)) {
    echo json_encode(['status' => 'error', 'message' => 'File not found on server']);
    exit;
}

// --- USE LIBROSA (Python) ---
// We use a dedicated script that loads only 60s of audio to save RAM.
$pythonExecutable = '/home/radio/venv/bin/python'; 
if (!file_exists($pythonExecutable)) {
    // Fallback if venv not found (though it should be there)
    $pythonExecutable = 'python3';
}

$scriptPath = '/home/radio/analyze_librosa.py';
// Remove 2>&1 to keep stderr out of stdout (shell_exec returns stdout)
$cmd = $pythonExecutable . " " . escapeshellarg($scriptPath) . " " . escapeshellarg($filePath);
$output = shell_exec($cmd);
$pyData = json_decode($output, true);

$bpm = 0;
$energy = 0;
$danceability = 0;
$key_key = -1;
$key_mode = 0;
$source = 'librosa';
$librosa_error = null;

if (!$pyData || isset($pyData['error'])) {
    // LIBROSA FAILED
    // User requested ONLY librosa. No fallbacks.
    $source = 'librosa_failed';
    $librosa_error = $pyData['error'] ?? 'JSON Decode Error (Crash?)';
    
    // Return 0 or error state
    $bpm = 0;
    $energy = 0;
    $danceability = 0;
    $key_key = -1;
    $key_mode = 0;

} else {
    $bpm = $pyData['bpm'];
    $energy = $pyData['energy'];
    $danceability = $pyData['danceability'];
    $key_key = $pyData['key_key'];
    $key_mode = $pyData['key_mode'];
}

// --- FINAL CORRECTIONS (Double Time / Half Time) ---
// Librosa is usually good, but can sometimes halve the tempo for D&B.
if ($bpm > 0 && $bpm < 100) {
    // If energy is high (> 0.6), it's likely a faster song detected at half speed.
    if ($energy > 0.6) {
        $bpm *= 2;
    }
}

$bpm = round($bpm);

// 3. CONVERT TO CAMELOT
function convertToCamelot($key, $mode) {
    // key: 0=C, 1=C#, ... 11=B
    // mode: 1=Major, 0=Minor
    
    $camelotMajor = [
        0 => '8B',  // C
        1 => '3B',  // Db/C#
        2 => '10B', // D
        3 => '5B',  // Eb/D#
        4 => '12B', // E
        5 => '7B',  // F
        6 => '2B',  // Gb/F#
        7 => '9B',  // G
        8 => '4B',  // Ab/G#
        9 => '11B', // A
        10 => '6B', // Bb/A#
        11 => '1B'  // B
    ];

    $camelotMinor = [
        0 => '5A',  // C
        1 => '12A', // Db/C#
        2 => '7A',  // D
        3 => '2A',  // Eb/D#
        4 => '9A',  // E
        5 => '4A',  // F
        6 => '11A', // Gb/F#
        7 => '6A',  // G
        8 => '1A',  // Ab/G#
        9 => '8A',  // A
        10 => '3A', // Bb/A#
        11 => '10A' // B
    ];

    if ($key === -1) return 'Unknown';

    if ($mode == 1) {
        return $camelotMajor[$key] ?? 'Unknown';
    } else {
        return $camelotMinor[$key] ?? 'Unknown';
    }
}

$camelot = convertToCamelot($key_key, $key_mode);

// 4. PREPARE RESULT
$result = [
    'bpm' => $bpm,
    'key' => $key_key,
    'camelot' => $camelot,
    'energy' => $energy,
    'danceability' => $danceability,
    'valence' => 0.5, // Placeholder
    'acousticness' => 0.0, // Placeholder
    'source' => $source,
    'librosa_error' => $librosa_error
];

// 5. SAVE TO CACHE
$metadata[$filename] = $result;
file_put_contents($metadataFile, json_encode($metadata, JSON_PRETTY_PRINT));

echo json_encode(['status' => 'success', 'data' => $result]);
?>
