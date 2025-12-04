<?php
header('Content-Type: application/json');

if (!isset($_FILES['image'])) {
    echo json_encode(['status' => 'error', 'message' => 'No image uploaded']);
    exit;
}

$target_dir = "images/";
if (!file_exists($target_dir)) {
    mkdir($target_dir, 0777, true);
}

$file_extension = strtolower(pathinfo($_FILES["image"]["name"], PATHINFO_EXTENSION));
$new_filename = uniqid('artist_') . '.' . $file_extension;
$target_file = $target_dir . $new_filename;

$allowed_types = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
if (!in_array($file_extension, $allowed_types)) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid file type']);
    exit;
}

if (move_uploaded_file($_FILES["image"]["tmp_name"], $target_file)) {
    echo json_encode(['status' => 'success', 'filepath' => $target_file]);
} else {
    echo json_encode(['status' => 'error', 'message' => 'Failed to move uploaded file']);
}
?>