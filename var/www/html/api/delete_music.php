<?php
header('Content-Type: application/json');

// --- Configuration ---
$musicDir = '/home/radio/musique/';
$postData = json_decode(file_get_contents('php://input'), true);
$filename = $postData['filename'] ?? '';

// --- Validation & Security ---
// 1. Check if a filename was provided.
if (empty($filename)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Aucun nom de fichier fourni.']);
    exit;
}

// 2. CRITICAL: Prevent path traversal attacks.
// basename() strips all directory information, ensuring we only have a filename.
// For example, if $filename is "../../../etc/passwd", basename() will return "passwd".
$safeFilename = basename($filename);
if ($safeFilename !== $filename) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Tentative de parcours de répertoire détectée.']);
    exit;
}

// 3. Construct the full path and check if the file exists.
$fullPath = $musicDir . $safeFilename;
if (!file_exists($fullPath)) {
    http_response_code(404);
    echo json_encode(['status' => 'error', 'message' => 'Le fichier n\'existe pas ou a déjà été supprimé.']);
    exit;
}

// --- Deletion ---
// Use unlink() to delete the file.
if (unlink($fullPath)) {
    echo json_encode(['status' => 'success', 'message' => "Le fichier '$safeFilename' a été supprimé."]);
} else {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => "Erreur du serveur : impossible de supprimer le fichier. Vérifiez les permissions."]);
}
?>