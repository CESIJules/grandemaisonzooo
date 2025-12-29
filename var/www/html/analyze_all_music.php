<?php
/**
 * Batch analyze all music files
 * This will re-analyze all MP3 files and update the metadata cache
 */

require_once 'auth_check.php';
header('Content-Type: application/json');

// Configuration
$musicDir = '/home/radio/musique';
$metadataFile = __DIR__ . '/music_metadata.json';
$pythonExecutable = '/home/radio/venv/bin/python';
$scriptPath = '/home/radio/analyze_librosa.py';

// Check if this is a status check or start request
$action = $_GET['action'] ?? 'status';

// Load existing metadata
$metadata = [];
if (file_exists($metadataFile)) {
    $metadata = json_decode(file_get_contents($metadataFile), true) ?? [];
}

// Get all MP3 files
$files = glob($musicDir . '/*.mp3');
$totalFiles = count($files);

if ($action === 'status') {
    // Return current status
    $analyzedCount = 0;
    $withGenre = 0;
    
    foreach ($files as $file) {
        $filename = basename($file);
        if (isset($metadata[$filename]) && isset($metadata[$filename]['bpm']) && $metadata[$filename]['bpm'] > 0) {
            $analyzedCount++;
            if (!empty($metadata[$filename]['genre'])) {
                $withGenre++;
            }
        }
    }
    
    echo json_encode([
        'status' => 'ok',
        'total_files' => $totalFiles,
        'analyzed' => $analyzedCount,
        'with_genre' => $withGenre,
        'pending' => $totalFiles - $analyzedCount
    ]);
    exit;
}

if ($action === 'analyze_one') {
    // Analyze a single file that needs analysis
    $analyzed = false;
    
    foreach ($files as $file) {
        $filename = basename($file);
        
        // Skip if already analyzed with valid data
        if (isset($metadata[$filename]) && 
            isset($metadata[$filename]['bpm']) && 
            $metadata[$filename]['bpm'] > 0 &&
            isset($metadata[$filename]['version']) &&
            strpos($metadata[$filename]['version'], 'v4') !== false) {
            continue;
        }
        
        // Analyze this file
        $cmd = $pythonExecutable . " " . escapeshellarg($scriptPath) . " " . escapeshellarg($file);
        $output = shell_exec($cmd);
        $pyData = json_decode($output, true);
        
        if ($pyData && !isset($pyData['error'])) {
            // Convert key to Camelot
            $camelot = convertToCamelot($pyData['key_key'] ?? -1, $pyData['key_mode'] ?? 0);
            
            $metadata[$filename] = [
                'bpm' => round($pyData['bpm'] ?? 0),
                'key' => $pyData['key_key'] ?? -1,
                'camelot' => $camelot,
                'energy' => $pyData['energy'] ?? 0,
                'danceability' => $pyData['danceability'] ?? 0,
                'genre' => $pyData['genre'] ?? null,
                'id3_artist' => $pyData['id3_artist'] ?? null,
                'id3_title' => $pyData['id3_title'] ?? null,
                'id3_album' => $pyData['id3_album'] ?? null,
                'source' => 'librosa',
                'version' => $pyData['version'] ?? 'v4_batch'
            ];
            
            // Save immediately
            file_put_contents($metadataFile, json_encode($metadata, JSON_PRETTY_PRINT), LOCK_EX);
            
            echo json_encode([
                'status' => 'analyzed',
                'file' => $filename,
                'data' => $metadata[$filename]
            ]);
            $analyzed = true;
            break;
        } else {
            // Log error but continue
            echo json_encode([
                'status' => 'error',
                'file' => $filename,
                'error' => $pyData['error'] ?? 'Unknown error'
            ]);
            $analyzed = true;
            break;
        }
    }
    
    if (!$analyzed) {
        echo json_encode([
            'status' => 'complete',
            'message' => 'All files analyzed'
        ]);
    }
    exit;
}

if ($action === 'clear') {
    // Clear all metadata to force re-analysis
    file_put_contents($metadataFile, '{}', LOCK_EX);
    echo json_encode(['status' => 'cleared']);
    exit;
}

// Helper function
function convertToCamelot($key, $mode) {
    $camelotMajor = [
        0 => '8B', 1 => '3B', 2 => '10B', 3 => '5B', 4 => '12B', 5 => '7B',
        6 => '2B', 7 => '9B', 8 => '4B', 9 => '11B', 10 => '6B', 11 => '1B'
    ];
    $camelotMinor = [
        0 => '5A', 1 => '12A', 2 => '7A', 3 => '2A', 4 => '9A', 5 => '4A',
        6 => '11A', 7 => '6A', 8 => '1A', 9 => '8A', 10 => '3A', 11 => '10A'
    ];
    
    if ($key === -1) return 'Unknown';
    return $mode == 1 ? ($camelotMajor[$key] ?? 'Unknown') : ($camelotMinor[$key] ?? 'Unknown');
}

echo json_encode(['status' => 'error', 'message' => 'Unknown action']);
?>
