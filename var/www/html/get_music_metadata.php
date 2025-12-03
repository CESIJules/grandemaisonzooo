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

// --- A. GATHER CANDIDATES (The "Wisdom of Crowds" Approach) ---
// Instead of a waterfall, we run ALL tools and vote.

// 1. BPM-TOOLS (Specialized Tool)
$bpm_tools = 0;
$bpmPath = trim(shell_exec("which bpm"));
if ($bpmPath) {
    $cmd = "ffmpeg -i " . escapeshellarg($filePath) . " -ss 30 -t 120 -f s16le -ac 1 -ar 44100 - -v quiet | " . $bpmPath;
    $output = shell_exec($cmd);
    if (is_numeric(trim($output))) {
        $val = floatval($output);
        if ($val > 50 && $val < 220) $bpm_tools = $val;
    }
}

// 2. FFMPEG (Filter)
$bpm_ffmpeg = 0;
$ffmpegBpmCmd = "ffmpeg -i " . escapeshellarg($filePath) . " -ss 30 -t 30 -af \"bpm\" -f null /dev/null 2>&1";
$ffmpegOutput = shell_exec($ffmpegBpmCmd);
if (preg_match_all('/BPM: ([0-9\.]+)/', $ffmpegOutput, $matches)) {
    $vals = array_map('floatval', $matches[1]);
    $vals = array_filter($vals, function($v) { return $v > 50 && $v < 220; });
    if (count($vals) > 0) {
        sort($vals);
        $bpm_ffmpeg = $vals[floor((count($vals)-1)/2)]; // Median
    }
}

// 3. AUBIO (Tempo Tracking)
$bpm_aubio = 0;
$aubioCmd = "aubio tempo " . escapeshellarg($filePath) . " 2>&1";
$aubioOutput = shell_exec($aubioCmd);
if ($aubioOutput) {
    $lines = explode("\n", trim($aubioOutput));
    $vals = [];
    foreach ($lines as $line) {
        $v = floatval($line);
        if ($v > 50 && $v < 220) $vals[] = $v;
    }
    if (count($vals) > 0) {
        sort($vals);
        $bpm_aubio = $vals[floor((count($vals)-1)/2)]; // Median
    }
}

// --- B. CONSENSUS LOGIC ---
$candidates = array_filter([
    'bpm-tools' => $bpm_tools,
    'ffmpeg' => $bpm_ffmpeg,
    'aubio' => $bpm_aubio
]);

$finalBpm = 0;

// Helper: Check if values are close (within 3 BPM)
function areClose($a, $b) { return abs($a - $b) <= 3; }

// 1. Check for Consensus (2+ tools agree)
// We prioritize pairs involving bpm-tools as it's usually the most accurate anchor.

if ($bpm_tools && $bpm_ffmpeg && areClose($bpm_tools, $bpm_ffmpeg)) {
    $finalBpm = ($bpm_tools + $bpm_ffmpeg) / 2;
} elseif ($bpm_tools && $bpm_aubio && areClose($bpm_tools, $bpm_aubio)) {
    $finalBpm = ($bpm_tools + $bpm_aubio) / 2;
} elseif ($bpm_ffmpeg && $bpm_aubio && areClose($bpm_ffmpeg, $bpm_aubio)) {
    $finalBpm = ($bpm_ffmpeg + $bpm_aubio) / 2;
} else {
    // 2. No Consensus?
    // Check for Double/Half time relationships (e.g. 70 vs 140)
    // If bpm-tools says 70 and aubio says 140, we might trust aubio if energy is high.
    
    $values = array_values($candidates);
    $bestVal = $bpm_tools ?: ($bpm_ffmpeg ?: $bpm_aubio); // Default to bpm-tools
    
    // If we have Python Energy data, use it to disambiguate
    if (isset($energy) && $energy > 0.6) {
        // High energy: prefer higher BPMs among candidates
        $maxBpm = 0;
        foreach ($candidates as $c) {
            if ($c > $maxBpm) $maxBpm = $c;
        }
        // If the max is roughly double the default, take the max
        if ($bestVal > 0 && $maxBpm > 0) {
            $ratio = $maxBpm / $bestVal;
            if ($ratio > 1.8 && $ratio < 2.2) {
                $bestVal = $maxBpm;
            }
        }
    }
    
    $finalBpm = $bestVal;
}

// --- C. FINAL SANITY CHECK ---
// If we still have 0 (impossible?), force something
if ($finalBpm == 0) $finalBpm = 120;

$bpm = round($finalBpm);

// --- C. KEY & ENERGY via FFMPEG + PYTHON (NUMPY) ---
// We pipe 30 seconds of raw audio to the python script to avoid loading the whole file
// We NO LONGER use Python for BPM.

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

// --- D. FINAL CORRECTIONS (Double Time / Half Time) ---
// bpm-tools is great but often detects Drum & Bass (174) as 87.
// We use a simple heuristic: if Energy is high and Danceability is high, it's likely fast.

$finalBpm = $bpm;

if ($finalBpm > 0 && $finalBpm < 100) {
    // Check for potential double time (e.g. 70 -> 140, 87 -> 174)
    // If energy is high (> 0.6), it's likely a faster song detected at half speed.
    if ($energy > 0.6) {
        $finalBpm *= 2;
    }
} elseif ($finalBpm > 160) {
    // Check for potential half time (rare, but possible)
    // If energy is very low, maybe it's not that fast? 
    // (Actually, usually better to keep high BPM for mixing safety)
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
