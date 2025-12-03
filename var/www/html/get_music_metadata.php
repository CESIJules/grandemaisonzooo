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

// --- A. BPM via AUBIO ---
// Check if aubio is installed
$aubioCmd = "aubio beat " . escapeshellarg($filePath) . " 2>&1";
$aubioOutput = shell_exec($aubioCmd);

$bpm = 0;
if ($aubioOutput) {
    // aubio beat returns a list of timestamps. We calculate BPM from intervals.
    $lines = explode("\n", trim($aubioOutput));
    $beats = array_filter($lines, function($line) { return is_numeric($line); });
    $beats = array_values($beats);
    
    if (count($beats) > 1) {
        $intervals = [];
        for ($i = 0; $i < count($beats) - 1; $i++) {
            $intervals[] = $beats[$i+1] - $beats[$i];
        }
        if (count($intervals) > 0) {
            $avgInterval = array_sum($intervals) / count($intervals);
            if ($avgInterval > 0) {
                $bpm = round(60 / $avgInterval);
            }
        }
    }
}

// --- B. KEY & ENERGY via FFMPEG + PYTHON (NUMPY) ---
// We pipe 30 seconds of raw audio to the python script to avoid loading the whole file
// ffmpeg -i input.mp3 -ss 30 -t 30 -f s16le -ac 1 -ar 22050 -
// This requires ffmpeg to be installed.

// Use the venv python if available, otherwise system python
$pythonExecutable = '/home/radio/venv/bin/python'; 
if (!file_exists($pythonExecutable)) {
    $pythonExecutable = 'python3';
}

$ffmpegCmd = "ffmpeg -i " . escapeshellarg($filePath) . " -ss 30 -t 30 -f s16le -ac 1 -ar 22050 - -v quiet";
$pythonCmd = "$ffmpegCmd | $pythonExecutable /home/radio/analyze_numpy.py";

$pythonOutput = shell_exec($pythonCmd);
$pyData = json_decode($pythonOutput, true);

if (!$pyData || isset($pyData['error'])) {
    // Fallback if python fails
    $energy = 0;
    $danceability = 0;
    $key_key = -1;
    $key_mode = 0;
    $errorMsg = $pyData['error'] ?? "Python analysis failed";
} else {
    $energy = $pyData['energy'];
    $danceability = $pyData['danceability'];
    $key_key = $pyData['key_key'];
    $key_mode = $pyData['key_mode'];
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
    'source' => 'local_aubio_numpy'
];

// 5. SAVE TO CACHE
$metadata[$filename] = $result;
file_put_contents($metadataFile, json_encode($metadata, JSON_PRETTY_PRINT));

echo json_encode(['status' => 'success', 'data' => $result]);
?>
