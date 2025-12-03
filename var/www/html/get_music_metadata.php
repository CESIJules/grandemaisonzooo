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

// --- A. BPM via AUBIO (Multi-Strategy) ---
// We run aubio with different onset detection functions to find a consensus.
// This is much more robust for saturated/bass-heavy tracks than relying on a single algorithm.

function getAubioBpm($filePath, $method = '') {
    $methodFlag = $method ? "-O $method" : "";
    // Use 'aubio tempo' which gives a list of beats/bpm estimates
    $cmd = "aubio tempo $methodFlag " . escapeshellarg($filePath) . " 2>&1";
    $output = shell_exec($cmd);
    
    $bpms = [];
    if ($output) {
        $lines = explode("\n", trim($output));
        foreach ($lines as $line) {
            $val = floatval($line);
            // Sanity check range (Extended for DnB/Dubstep)
            if ($val > 50 && $val < 220) {
                $bpms[] = $val;
            }
        }
    }
    
    if (empty($bpms)) return 0;
    
    // Return MEDIAN of this run to ignore outliers
    sort($bpms);
    $count = count($bpms);
    $middle = floor(($count - 1) / 2);
    if ($count % 2) {
        return $bpms[$middle];
    } else {
        return ($bpms[$middle] + $bpms[$middle + 1]) / 2.0;
    }
}

// 1. Default (Complex Domain) - Good balance
$bpmComplex = getAubioBpm($filePath, 'complex');

// 2. Spectral Difference - Better for saturated/noisy mixes
$bpmSpecDiff = getAubioBpm($filePath, 'specdiff');

// 3. Phase - Sometimes better for soft onsets, provides a 3rd opinion
$bpmPhase = getAubioBpm($filePath, 'phase');

// --- B. KEY & ENERGY via FFMPEG + PYTHON (NUMPY) ---
// We pipe 30 seconds of raw audio to the python script
// We NO LONGER use Python for BPM as it was unreliable for this use case.

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
    $energy = 0;
    $danceability = 0;
    $key_key = -1;
    $key_mode = 0;
} else {
    $energy = $pyData['energy'];
    $danceability = $pyData['danceability'];
    $key_key = $pyData['key_key'];
    $key_mode = $pyData['key_mode'];
}

// --- C. CONSENSUS LOGIC (Aubio Internal Vote) ---
$candidates = [];
if ($bpmComplex > 0) $candidates['complex'] = $bpmComplex;
if ($bpmSpecDiff > 0) $candidates['specdiff'] = $bpmSpecDiff;
if ($bpmPhase > 0) $candidates['phase'] = $bpmPhase;

$finalBpm = 0;

// Helper to check closeness
function isClose($a, $b) { return abs($a - $b) <= 4; }

// 1. Look for agreement between strategies
if (isset($candidates['complex']) && isset($candidates['specdiff']) && isClose($candidates['complex'], $candidates['specdiff'])) {
    // If Complex and SpecDiff agree, that's a very strong signal.
    // SpecDiff is often better for saturation, so we lean slightly towards it or average.
    $finalBpm = ($candidates['complex'] + $candidates['specdiff']) / 2;
} 
elseif (isset($candidates['specdiff']) && isset($candidates['phase']) && isClose($candidates['specdiff'], $candidates['phase'])) {
    $finalBpm = ($candidates['specdiff'] + $candidates['phase']) / 2;
}
elseif (isset($candidates['complex']) && isset($candidates['phase']) && isClose($candidates['complex'], $candidates['phase'])) {
    $finalBpm = ($candidates['complex'] + $candidates['phase']) / 2;
}
else {
    // 2. No agreement? 
    // For saturated/bass-heavy music, 'specdiff' is theoretically the most robust.
    // If 'specdiff' failed (0), fallback to 'complex'.
    if (isset($candidates['specdiff'])) {
        $finalBpm = $candidates['specdiff'];
    } elseif (isset($candidates['complex'])) {
        $finalBpm = $candidates['complex'];
    } else {
        $finalBpm = reset($candidates); // Whatever we have
    }
}

$bpm = round($finalBpm);

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
