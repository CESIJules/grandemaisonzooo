<?php
require_once 'auth_check.php';
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
    // --- Update analytics database ---
    $dbPath = '/var/www/data/analytics.db';
    $dbDeleted = 0;
    
    if (file_exists($dbPath)) {
        try {
            $db = new SQLite3($dbPath);
            
            // Parse filename to extract artist and title
            // Format: "artist-title.mp3"
            $basename = pathinfo($safeFilename, PATHINFO_FILENAME);
            $parts = explode('-', $basename, 2);
            $artist = trim($parts[0] ?? '');
            $title = trim($parts[1] ?? $basename);
            
            // Delete from play_history table
            $stmt = $db->prepare('DELETE FROM play_history WHERE artist = :artist AND title = :title');
            $stmt->bindValue(':artist', $artist, SQLITE3_TEXT);
            $stmt->bindValue(':title', $title, SQLITE3_TEXT);
            $stmt->execute();
            
            $dbDeleted = $db->changes();
            $db->close();
        } catch (Exception $e) {
            // Log error but don't fail the delete operation
            error_log("Failed to update analytics DB after delete: " . $e->getMessage());
        }
    }
    
    $message = "Le fichier '$safeFilename' a été supprimé.";
    if ($dbDeleted > 0) {
        $message .= " $dbDeleted entrée(s) supprimée(s) de l'historique.";
    }
    
    echo json_encode(['status' => 'success', 'message' => $message]);
} else {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => "Erreur du serveur : impossible de supprimer le fichier. Vérifiez les permissions."]);
}
?>