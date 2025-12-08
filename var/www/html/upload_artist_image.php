<?php
header('Content-Type: application/json');

if (!isset($_FILES['image'])) {
    echo json_encode(['status' => 'error', 'message' => 'No image uploaded']);
    exit;
}

if ($_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    $uploadErrorMessages = [
        UPLOAD_ERR_INI_SIZE => 'Le fichier dépasse la taille upload_max_filesize dans php.ini',
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
    echo json_encode(['status' => 'error', 'message' => 'Type de fichier invalide. Extensions acceptées : jpg, jpeg, png, gif, webp.']);
    exit;
}

if (move_uploaded_file($_FILES["image"]["tmp_name"], $target_file)) {
    echo json_encode(['status' => 'success', 'filepath' => $relative_path]);
} else {
    $error = error_get_last();
    echo json_encode(['status' => 'error', 'message' => 'Failed to move uploaded file: ' . ($error['message'] ?? 'Unknown error')]);
}
?>