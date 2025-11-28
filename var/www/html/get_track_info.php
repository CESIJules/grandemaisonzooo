<?php
header('Content-Type: application/json');
header('Cache-Control: no-cache, must-revalidate');

$filePath = __DIR__ . '/track_info.json';

if (file_exists($filePath)) {
    // Read and output the file content
    readfile($filePath);
} else {
    // Output a default JSON object if the file doesn't exist
    echo json_encode([
        'title' => 'Infos indisponibles',
        'duration' => 0,
        'started_at' => 0
    ]);
}
?>
