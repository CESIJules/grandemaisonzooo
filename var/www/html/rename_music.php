<?php
require_once 'auth_check.php';
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
    // 10. Update the analytics database with the new filename
    $dbUpdated = false;
    $dbPath = '/var/www/data/analytics.db';
    
    if (file_exists($dbPath)) {
        try {
            $db = new SQLite3($dbPath);
            
            // Parse old and new filenames to extract artist and title
            // Format: "artist-title.mp3"
            $oldBasename = pathinfo($oldFilename, PATHINFO_FILENAME);
            $newBasename = pathinfo($newFilename, PATHINFO_FILENAME);
            
            // Extract artist and title from old filename
            $oldParts = explode('-', $oldBasename, 2);
            $oldArtist = trim($oldParts[0] ?? '');
            $oldTitle = trim($oldParts[1] ?? $oldBasename);
            
            // Extract artist and title from new filename
            $newParts = explode('-', $newBasename, 2);
            $newArtist = trim($newParts[0] ?? '');
            $newTitle = trim($newParts[1] ?? $newBasename);
            
            // Update play_history table
            $stmt = $db->prepare('UPDATE play_history SET artist = :new_artist, title = :new_title WHERE artist = :old_artist AND title = :old_title');
            $stmt->bindValue(':new_artist', $newArtist, SQLITE3_TEXT);
            $stmt->bindValue(':new_title', $newTitle, SQLITE3_TEXT);
            $stmt->bindValue(':old_artist', $oldArtist, SQLITE3_TEXT);
            $stmt->bindValue(':old_title', $oldTitle, SQLITE3_TEXT);
            $stmt->execute();
            
            $dbUpdated = $db->changes() > 0;
            $db->close();
        } catch (Exception $e) {
            // Log error but don't fail the rename operation
            error_log("Failed to update analytics DB after rename: " . $e->getMessage());
        }
    }
    
    $message = 'Le fichier a été renommé avec succès.';
    if ($dbUpdated) {
        $message .= ' L\'historique de lecture a été mis à jour.';
    }
    
    echo json_encode(['status' => 'success', 'message' => $message]);
} else {
    http_response_code(500); // Internal Server Error
    echo json_encode(['status' => 'error', 'message' => 'Une erreur est survenue lors du renommage du fichier.']);
}

?>