<?php
// Disable display_errors to prevent HTML error output from breaking JSON
ini_set('display_errors', 0);
error_reporting(E_ALL);

header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true);
$filename = $input['filename'] ?? null;

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

if (isset($metadata[$filename])) {
    // Return cached data
    echo json_encode(['status' => 'success', 'data' => $metadata[$filename]]);
    exit;
}

// 2. LOCAL ANALYSIS
if (!file_exists($filePath)) {
    echo json_encode(['status' => 'error', 'message' => 'File not found on server']);
    exit;
}

// CONFIGURATION PYTHON
// Remplacez ce chemin par celui de votre environnement virtuel si nécessaire
// Ex: '/home/radio/venv/bin/python' ou '/var/www/html/venv/bin/python'
$pythonExecutable = '/home/radio/venv/bin/python'; 
// Si ça ne marche pas, essayez simplement 'python3' si les libs sont installées en global
// $pythonExecutable = 'python3';

// Call Python script
$cmd = $pythonExecutable . " /home/radio/analyze_audio_light.py " . escapeshellarg($filePath) . " 2>&1";
$output = shell_exec($cmd);
$analysis = json_decode($output, true);

if (!$analysis || isset($analysis['error'])) {
    $errorMsg = $analysis['error'] ?? 'Analysis failed';
    if (!$analysis) {
        // Debug: Show why it failed (e.g. "command not found" or python traceback)
        $errorMsg .= " (Raw output: " . trim($output) . ")";
    }
    echo json_encode(['status' => 'error', 'message' => $errorMsg]);
    exit;
}

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

    if ($mode == 1) {
        return $camelotMajor[$key] ?? 'Unknown';
    } else {
        return $camelotMinor[$key] ?? 'Unknown';
    }
}

$camelot = convertToCamelot($analysis['key_key'], $analysis['key_mode']);

// 4. PREPARE RESULT
$result = [
    'bpm' => $analysis['bpm'],
    'key' => $analysis['key_key'],
    'camelot' => $camelot,
    'energy' => $analysis['energy'],
    'danceability' => $analysis['danceability'],
    'valence' => $analysis['valence'], // Placeholder
    'acousticness' => $analysis['acousticness'], // Placeholder
    'source' => 'local_analysis'
];

// 5. SAVE TO CACHE
$metadata[$filename] = $result;
file_put_contents($metadataFile, json_encode($metadata, JSON_PRETTY_PRINT));

echo json_encode(['status' => 'success', 'data' => $result]);
?>
