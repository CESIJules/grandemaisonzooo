<?php
header('Content-Type: application/json');

if (!isset($_FILES['image'])) {
    echo json_encode(['status' => 'error', 'message' => 'No image uploaded']);
    exit;
}

$target_dir = __DIR__ . "/images/";
if (!file_exists($target_dir)) {
    if (!mkdir($target_dir, 0777, true)) {
        echo json_encode(['status' => 'error', 'message' => 'Failed to create images directory']);
        exit;
    }
}

// Ensure writable
if (!is_writable($target_dir)) {
    @chmod($target_dir, 0777);
    if (!is_writable($target_dir)) {
        echo json_encode(['status' => 'error', 'message' => 'Images directory is not writable. Check permissions for: ' . $target_dir]);
        exit;
    }
}

$file_extension = strtolower(pathinfo($_FILES["image"]["name"], PATHINFO_EXTENSION));
$new_filename = uniqid('artist_') . '.' . $file_extension;
$target_file = $target_dir . $new_filename;
$relative_path = "images/" . $new_filename;

$allowed_types = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
if (!in_array($file_extension, $allowed_types)) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid file type']);
    exit;
}

if (move_uploaded_file($_FILES["image"]["tmp_name"], $target_file)) {
    echo json_encode(['status' => 'success', 'filepath' => $relative_path]);
} else {
    $error = error_get_last();
    echo json_encode(['status' => 'error', 'message' => 'Failed to move uploaded file: ' . ($error['message'] ?? 'Unknown error')]);
}
?>