<?php
header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true);
$filename = $input['filename'] ?? null;

if (!$filename) {
    echo json_encode(['status' => 'error', 'message' => 'No filename provided']);
    exit;
}

$musicDir = '/home/radio/musique';
$filePath = $musicDir . '/' . $filename;
$metadataFile = __DIR__ . '/music_metadata.json';
$pythonScript = '/home/radio/analyze_audio.py';
// Use the python executable from the virtual environment
$pythonExecutable = '/home/radio/venv/bin/python';

if (!file_exists($filePath)) {
    echo json_encode(['status' => 'error', 'message' => 'File not found']);
    exit;
}

// Load existing metadata
$metadata = [];
if (file_exists($metadataFile)) {
    $metadata = json_decode(file_get_contents($metadataFile), true) ?? [];
}

// Check if we already have data for this file
if (isset($metadata[$filename])) {
    echo json_encode(['status' => 'success', 'data' => $metadata[$filename]]);
    exit;
}

// If not, analyze it
// Note: This might take a few seconds.
// Ensure www-data has permission to execute python and read the file.
// We use 2>&1 to capture stderr as well for debugging
// Force UTF-8 encoding for Python IO
// Disable Numba JIT to prevent memory spikes and segfaults on low-resource servers
$command = "export PYTHONIOENCODING=utf-8; export NUMBA_DISABLE_JIT=1; " . $pythonExecutable . " " . escapeshellarg($pythonScript) . " " . escapeshellarg($filePath) . " 2>&1";
$output = shell_exec($command);
$result = json_decode($output, true);

if ($result && isset($result['status']) && $result['status'] === 'success') {
    // Save to cache
    $metadata[$filename] = $result;
    file_put_contents($metadataFile, json_encode($metadata, JSON_PRETTY_PRINT));
    echo json_encode(['status' => 'success', 'data' => $result]);
} else {
    // Fallback error handling if JSON decode fails
    $msg = $result['message'] ?? 'Analysis failed or returned invalid JSON';
    echo json_encode(['status' => 'error', 'message' => $msg, 'debug' => $output]);
}
?>
