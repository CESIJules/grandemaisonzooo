<?php
header('Content-Type: application/json');

// 1. Check for POST request
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); // Method Not Allowed
    echo json_encode(['status' => 'error', 'message' => 'La méthode de requête n\'est pas autorisée.']);
    exit;
}

// 2. Get and decode the JSON input
$data = json_decode(file_get_contents('php://input'), true);

// 3. Validate input
if (!isset($data['old_name']) || !isset($data['new_name']) || empty(trim($data['old_name'])) || empty(trim($data['new_name']))) {
    http_response_code(400); // Bad Request
    echo json_encode(['status' => 'error', 'message' => 'Les noms de fichier ancien et nouveau sont requis.']);
    exit;
}

// 4. Define music directory
$musicDir = '/home/radio/musique';

// 5. Sanitize filenames to prevent directory traversal
$oldFilename = basename($data['old_name']);
$newFilename = basename($data['new_name']);

// Ensure the sanitized names are still what was intended (basename can strip paths)
if ($oldFilename !== $data['old_name'] || $newFilename !== $data['new_name']) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Les noms de fichiers ne doivent pas contenir de chemins.']);
    exit;
}

// 6. Check for file extension consistency
$oldExtension = pathinfo($oldFilename, PATHINFO_EXTENSION);
$newExtension = pathinfo($newFilename, PATHINFO_EXTENSION);

if (strtolower($oldExtension) !== strtolower($newExtension)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Le changement d\'extension de fichier n\'est pas autorisé.']);
    exit;
}

// 7. Construct full paths
$oldPath = $musicDir . '/' . $oldFilename;
$newPath = $musicDir . '/' . $newFilename;

// 8. Perform checks
if (!file_exists($oldPath) || !is_file($oldPath)) {
    http_response_code(404); // Not Found
    echo json_encode(['status' => 'error', 'message' => 'Le fichier original n\'existe pas.']);
    exit;
}

if (file_exists($newPath)) {
    http_response_code(409); // Conflict
    echo json_encode(['status' => 'error', 'message' => 'Un fichier avec le nouveau nom existe déjà.']);
    exit;
}

// 9. Rename the file
if (rename($oldPath, $newPath)) {
    echo json_encode(['status' => 'success', 'message' => 'Le fichier a été renommé avec succès.']);
} else {
    http_response_code(500); // Internal Server Error
    echo json_encode(['status' => 'error', 'message' => 'Une erreur est survenue lors du renommage du fichier.']);
}

?>