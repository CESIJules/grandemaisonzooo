<?php
require_once 'auth_check.php';
header('Content-Type: application/json');
$data = json_decode(file_get_contents('php://input'), true);

if ($data === null) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid JSON']);
    exit;
}

$file_path = __DIR__ . '/artists_profiles.json';

// Si le fichier n'existe pas, on tente de le créer
if (!file_exists($file_path)) {
    if (@file_put_contents($file_path, '[]') === false) {
        echo json_encode(['status' => 'error', 'message' => 'Cannot create file. Check directory permissions.']);
        exit;
    }
    @chmod($file_path, 0666);
}

// Si le fichier existe mais n'est pas inscriptible
if (!is_writable($file_path)) {
    // Tentative de chmod (ne marche que si propriétaire)
    @chmod($file_path, 0666);
    
    if (!is_writable($file_path)) {
        // Plan B : Si le dossier est inscriptible, on supprime et on recrée le fichier
        // Cela permet de récupérer la propriété du fichier pour www-data
        if (is_writable(__DIR__)) {
            if (@unlink($file_path)) {
                // Succès de la suppression, on continue vers l'écriture
            } else {
                echo json_encode(['status' => 'error', 'message' => 'File not writable and cannot be deleted (ownership issue?). Path: ' . $file_path]);
                exit;
            }
        } else {
            echo json_encode(['status' => 'error', 'message' => 'File and directory are not writable. Path: ' . $file_path]);
            exit;
        }
    }
}

if (file_put_contents($file_path, json_encode($data, JSON_PRETTY_PRINT), LOCK_EX)) {
    echo json_encode(['status' => 'success']);
} else {
    $error = error_get_last();
    echo json_encode(['status' => 'error', 'message' => 'Failed to save file: ' . ($error['message'] ?? 'Unknown error')]);
}
?>