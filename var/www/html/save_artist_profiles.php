<?php
header('Content-Type: application/json');
$data = json_decode(file_get_contents('php://input'), true);

if ($data === null) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid JSON']);
    exit;
}

$file_path = __DIR__ . '/artists_profiles.json';
if (!file_exists($file_path)) {
    file_put_contents($file_path, '[]');
    @chmod($file_path, 0666);
}

if (!is_writable($file_path)) {
    @chmod($file_path, 0666);
    if (!is_writable($file_path)) {
        echo json_encode(['status' => 'error', 'message' => 'JSON file is not writable. Check permissions for: ' . $file_path]);
        exit;
    }
}

if (file_put_contents($file_path, json_encode($data, JSON_PRETTY_PRINT))) {
    echo json_encode(['status' => 'success']);
} else {
    $error = error_get_last();
    echo json_encode(['status' => 'error', 'message' => 'Failed to save file: ' . ($error['message'] ?? 'Unknown error')]);
}
?>