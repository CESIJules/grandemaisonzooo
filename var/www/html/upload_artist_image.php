<?php
require_once 'auth_check.php';
header('Content-Type: application/json');

// Check for post_max_size violation
if (empty($_POST) && empty($_FILES) && $_SERVER['CONTENT_LENGTH'] > 0) {
    $displayMaxSize = ini_get('post_max_size');
    echo json_encode(['status' => 'error', 'message' => "La requête est trop volumineuse. Elle dépasse la limite post_max_size du serveur ($displayMaxSize)."]);
    exit;
}

if (!isset($_FILES['image'])) {
    echo json_encode(['status' => 'error', 'message' => 'No image uploaded']);
    exit;
}

if ($_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    $uploadErrorMessages = [
        UPLOAD_ERR_INI_SIZE => 'Le fichier dépasse la taille upload_max_filesize dans php.ini (' . ini_get('upload_max_filesize') . ')',
        UPLOAD_ERR_FORM_SIZE => 'Le fichier dépasse la taille MAX_FILE_SIZE spécifiée dans le formulaire HTML',
        UPLOAD_ERR_PARTIAL => 'Le fichier n\'a été que partiellement téléchargé',
        UPLOAD_ERR_NO_FILE => 'Aucun fichier n\'a été téléchargé',
        UPLOAD_ERR_NO_TMP_DIR => 'Un dossier temporaire est manquant',
        UPLOAD_ERR_CANT_WRITE => 'Échec de l\'écriture du fichier sur le disque',
        UPLOAD_ERR_EXTENSION => 'Une extension PHP a arrêté le téléchargement du fichier',
    ];
    $errorMessage = $uploadErrorMessages[$_FILES['image']['error']] ?? 'Erreur de téléchargement inconnue';
    echo json_encode(['status' => 'error', 'message' => $errorMessage]);
    exit;
}

$target_dir = __DIR__ . "/images/";
if (!file_exists($target_dir)) {
    // Utilisation de permissions plus restrictives (0755)
    if (!mkdir($target_dir, 0755, true)) {
        echo json_encode(['status' => 'error', 'message' => 'Failed to create images directory']);
        exit;
    }
}

// Ensure writable
/*
if (!is_writable($target_dir)) {
    // Tentative de correction des permissions (0755 au lieu de 0777)
    @chmod($target_dir, 0755);
    if (!is_writable($target_dir)) {
        echo json_encode(['status' => 'error', 'message' => 'Images directory is not writable. Check permissions for: ' . $target_dir]);
        exit;
    }
}
*/

// Vérification du type MIME réel
$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime_type = $finfo->file($_FILES['image']['tmp_name']);

$allowed_mimes = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/gif' => 'gif',
    'image/webp' => 'webp'
];

if (!array_key_exists($mime_type, $allowed_mimes)) {
    echo json_encode(['status' => 'error', 'message' => 'Type de fichier invalide (MIME). Seules les images sont autorisées.']);
    exit;
}

// Force l'extension basée sur le type MIME détecté
$safe_extension = $allowed_mimes[$mime_type];
$new_filename = uniqid('artist_') . '.' . $safe_extension;
$target_file = $target_dir . $new_filename;
$relative_path = "images/" . $new_filename;

// (Suppression de la vérification d'extension obsolète car nous utilisons le type MIME)
/*
$file_extension = strtolower(pathinfo($_FILES["image"]["name"], PATHINFO_EXTENSION));
$allowed_types = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
if (!in_array($file_extension, $allowed_types)) {
    echo json_encode(['status' => 'error', 'message' => 'Type de fichier invalide. Extensions acceptées : jpg, jpeg, png, gif, webp.']);
    exit;
}
*/

if (move_uploaded_file($_FILES["image"]["tmp_name"], $target_file)) {
    echo json_encode(['status' => 'success', 'filepath' => $relative_path]);
} else {
    $error = error_get_last();
    echo json_encode(['status' => 'error', 'message' => 'Failed to move uploaded file: ' . ($error['message'] ?? 'Unknown error')]);
}
?>