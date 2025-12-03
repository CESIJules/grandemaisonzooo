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
// Use 'aubio tempo' instead of 'aubio beat' for better BPM estimation
$aubioCmd = "aubio tempo " . escapeshellarg($filePath) . " 2>&1";
$aubioOutput = shell_exec($aubioCmd);

$bpm = 0;
if ($aubioOutput) {
    // aubio tempo returns a list of BPM estimates per frame.
    // We take the median or mode.
    $lines = explode("\n", trim($aubioOutput));
    $values = [];
    foreach ($lines as $line) {
        if (is_numeric(trim($line))) {
            $val = floatval($line);
            if ($val > 40 && $val < 250) { // Filter unreasonable values
                $values[] = $val;
            }
        }
    }
    
    if (count($values) > 0) {
        // Calculate median
        sort($values);
        $count = count($values);
        $middle = floor(($count - 1) / 2);
        if ($count % 2) {
            $bpm = $values[$middle];
        } else {
            $bpm = ($values[$middle] + $values[$middle + 1]) / 2.0;
        }
        $bpm = round($bpm);
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
    $pyBpm = 0;
    $errorMsg = $pyData['error'] ?? "Python analysis failed";
} else {
    $energy = $pyData['energy'];
    $danceability = $pyData['danceability'];
    $key_key = $pyData['key_key'];
    $key_mode = $pyData['key_mode'];
    $pyBpm = $pyData['bpm'] ?? 0;
}

// If aubio failed or returned 0, try to use Python BPM
if ($bpm == 0 && $pyBpm > 0) {
    $bpm = $pyBpm;
}

// Conflict Resolution:
// If Aubio and Python disagree significantly (> 10 BPM)
if (abs($bpm - $pyBpm) > 10 && $pyBpm > 0 && $bpm > 0) {
    // Case 1: 3:2 Polyrhythm (e.g. 110 vs 165)
    // If Python is approx 1.5x Aubio, prefer Python (likely faster tempo detected)
    $ratio = $pyBpm / $bpm;
    if ($ratio > 1.4 && $ratio < 1.6) {
        $bpm = $pyBpm;
    }
    // Case 2: Double Time (e.g. 70 vs 140)
    // If Python is approx 2x Aubio, prefer Python
    else if ($ratio > 1.9 && $ratio < 2.1) {
        $bpm = $pyBpm;
    }
    // Case 3: Aubio is unreasonably slow (< 80) and Python is normal (> 80)
    else if ($bpm < 80 && $pyBpm > 80) {
        $bpm = $pyBpm;
    }
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
