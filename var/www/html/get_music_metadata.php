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

// --- A. BPM via BPM-TOOLS (Primary) ---
// Requires: apt-get install bpm-tools
$bpm = 0;
$bpmPath = trim(shell_exec("which bpm"));
if ($bpmPath) {
    // Analyze 2 minutes from 30s mark
    $cmd = "ffmpeg -i " . escapeshellarg($filePath) . " -ss 30 -t 120 -f s16le -ac 1 -ar 44100 - -v quiet | " . $bpmPath;
    $output = shell_exec($cmd);
    if (is_numeric(trim($output))) {
        $val = floatval($output);
        if ($val > 50 && $val < 220) {
            $bpm = $val;
        }
    }
}

// --- B. FALLBACK: FFMPEG (Secondary) ---
if ($bpm == 0) {
    $ffmpegBpmCmd = "ffmpeg -i " . escapeshellarg($filePath) . " -ss 30 -t 30 -af \"bpm\" -f null /dev/null 2>&1";
    $ffmpegOutput = shell_exec($ffmpegBpmCmd);
    if (preg_match('/BPM: ([0-9\.]+)/', $ffmpegOutput, $matches)) {
        $val = floatval($matches[1]);
        if ($val > 50 && $val < 220) {
            $bpm = $val;
        }
    }
}

// --- C. FALLBACK: AUBIO (Tertiary - Last Resort) ---
// If both above failed, use Aubio which almost always returns something.
if ($bpm == 0) {
    $aubioCmd = "aubio tempo " . escapeshellarg($filePath) . " 2>&1";
    $aubioOutput = shell_exec($aubioCmd);
    if ($aubioOutput) {
        $lines = explode("\n", trim($aubioOutput));
        $bpms = [];
        foreach ($lines as $line) {
            $val = floatval($line);
            if ($val > 50 && $val < 220) $bpms[] = $val;
        }
        if (count($bpms) > 0) {
            // Median
            sort($bpms);
            $count = count($bpms);
            $middle = floor(($count - 1) / 2);
            if ($count % 2) {
                $bpm = $bpms[$middle];
            } else {
                $bpm = ($bpms[$middle] + $bpms[$middle + 1]) / 2.0;
            }
        }
    }
}

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
