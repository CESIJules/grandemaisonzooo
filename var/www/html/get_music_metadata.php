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

// --- A. BPM via AUBIO ---
// We use 'aubio tempo' to get BPM estimates across the file and take the median.
// This is generally more stable than calculating intervals from 'aubio beat'.
$aubioCmd = "aubio tempo " . escapeshellarg($filePath) . " 2>&1";
$aubioOutput = shell_exec($aubioCmd);

$bpm = 0;
if ($aubioOutput) {
    $lines = explode("\n", trim($aubioOutput));
    $bpms = [];
    foreach ($lines as $line) {
        // aubio tempo outputs lines like "120.000000"
        $val = floatval($line);
        if ($val > 40 && $val < 250) { // Sanity check range
            $bpms[] = $val;
        }
    }

    if (count($bpms) > 0) {
        sort($bpms);
        $count = count($bpms);
        $middle = floor(($count - 1) / 2);
        if ($count % 2) {
            $bpm = $bpms[$middle];
        } else {
            $bpm = ($bpms[$middle] + $bpms[$middle + 1]) / 2.0;
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
    $errorMsg = $pyData['error'] ?? "Python analysis failed";
} else {
    $energy = $pyData['energy'];
    $danceability = $pyData['danceability'];
    $key_key = $pyData['key_key'];
    $key_mode = $pyData['key_mode'];
    $pyBpm = $pyData['bpm'] ?? 0;
}

// --- C. BPM via FFMPEG (Third Opinion) ---
// ffmpeg -i input.mp3 -ss 30 -t 30 -af "bpm" -f null /dev/null
// Output is in stderr: "[Parsed_bpm_0 @ ...] BPM: 123.456"
$ffmpegBpmCmd = "ffmpeg -i " . escapeshellarg($filePath) . " -ss 30 -t 30 -af \"bpm\" -f null /dev/null 2>&1";
$ffmpegOutput = shell_exec($ffmpegBpmCmd);
$ffmpegBpm = 0;
if (preg_match('/BPM: ([0-9\.]+)/', $ffmpegOutput, $matches)) {
    $ffmpegBpm = floatval($matches[1]);
}

// --- D. CONSENSUS LOGIC ---
// We have $bpm (Aubio), $pyBpm (Python), $ffmpegBpm (FFmpeg)
$candidates = [];
if ($bpm > 0) $candidates['aubio'] = $bpm;
if ($pyBpm > 0) $candidates['python'] = $pyBpm;
if ($ffmpegBpm > 0) $candidates['ffmpeg'] = $ffmpegBpm;

// Function to check if two BPMs are "close" (within 5%)
function isClose($a, $b) {
    return abs($a - $b) < ($a * 0.05);
}

$finalBpm = 0;

// 1. Check for agreement between any two sources
if (isset($candidates['aubio']) && isset($candidates['python']) && isClose($candidates['aubio'], $candidates['python'])) {
    $finalBpm = ($candidates['aubio'] + $candidates['python']) / 2;
} elseif (isset($candidates['aubio']) && isset($candidates['ffmpeg']) && isClose($candidates['aubio'], $candidates['ffmpeg'])) {
    $finalBpm = ($candidates['aubio'] + $candidates['ffmpeg']) / 2;
} elseif (isset($candidates['python']) && isset($candidates['ffmpeg']) && isClose($candidates['python'], $candidates['ffmpeg'])) {
    $finalBpm = ($candidates['python'] + $candidates['ffmpeg']) / 2;
} else {
    // 2. No agreement? Fallback logic.
    // Prefer FFmpeg as it's a standard filter, then Aubio, then Python.
    // But check for "sane" ranges (70-180)
    
    $validCandidates = array_filter($candidates, function($v) { return $v >= 70 && $v <= 180; });
    
    if (!empty($validCandidates)) {
        // If we have valid candidates, pick the one from the most trusted source available
        if (isset($validCandidates['ffmpeg'])) $finalBpm = $validCandidates['ffmpeg'];
        elseif (isset($validCandidates['aubio'])) $finalBpm = $validCandidates['aubio'];
        else $finalBpm = reset($validCandidates);
    } else {
        // If all are outside range (e.g. DnB at 175+ or Dubstep at 140/70), just take FFmpeg or Aubio
        $finalBpm = $ffmpegBpm ?: ($bpm ?: $pyBpm);
    }
}

// 3. Polyrhythm / Double Time Correction (The "Tunebat" issue)
// If the result is low (< 100) and we had a candidate that was ~1.5x or ~2x, consider it.
// Example: Result 111, but Python said 165 (1.5x). 165 is a common tempo.
if ($finalBpm > 0) {
    foreach ($candidates as $source => $val) {
        if ($val > $finalBpm) {
            $ratio = $val / $finalBpm;
            // Check for 1.5x (e.g. 110 vs 165)
            if ($ratio > 1.4 && $ratio < 1.6 && $val < 185) {
                $finalBpm = $val; // Upgrade to the faster tempo
                break;
            }
            // Check for 2x (e.g. 70 vs 140)
            if ($ratio > 1.9 && $ratio < 2.1 && $val < 185) {
                $finalBpm = $val;
                break;
            }
        }
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
