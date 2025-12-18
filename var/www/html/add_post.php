<?php
require_once 'auth_check.php';
header('Content-Type: application/json');

$file_path = 'timeline.json';
$upload_dir = 'uploads/';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Méthode non autorisée.']);
    exit;
}

try {
    // Check for post_max_size violation
    if (empty($_POST) && empty($_FILES) && $_SERVER['CONTENT_LENGTH'] > 0) {
        $displayMaxSize = ini_get('post_max_size');
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => "La requête est trop volumineuse. Elle dépasse la limite post_max_size du serveur ($displayMaxSize)."]);
        exit;
    }

    // Basic validation
    if (empty($_POST['title']) || empty($_POST['date']) || empty($_POST['artist'])) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Données invalides ou champs manquants (titre, date, artiste).']);
        exit;
    }

    $image_path = null;

    // Handle file upload
    if (isset($_FILES['image']) && $_FILES['image']['error'] !== UPLOAD_ERR_NO_FILE) {
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
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => $errorMessage]);
            exit;
        }

        if (!file_exists($upload_dir)) {
            mkdir($upload_dir, 0755, true);
        }

        $tmp_name = $_FILES['image']['tmp_name'];
        
        // Vérification du type MIME réel
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mime_type = $finfo->file($tmp_name);

        $allowed_mimes = [
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/gif' => 'gif',
            'image/webp' => 'webp'
        ];

        if (!array_key_exists($mime_type, $allowed_mimes)) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Type de fichier invalide (MIME). Seules les images sont autorisées.']);
            exit;
        }

        // Force l'extension basée sur le type MIME détecté
        $safe_extension = $allowed_mimes[$mime_type];
        $new_filename = uniqid('post_', true) . '.' . $safe_extension;
        $destination = $upload_dir . $new_filename;

        if (move_uploaded_file($tmp_name, $destination)) {
            $image_path = $destination;
        } else {
            throw new Exception('Impossible de déplacer le fichier téléchargé.');
        }
    }

    $new_post = [
        'id' => $_POST['id'] ?? time(),
        'title' => $_POST['title'],
        'subtitle' => $_POST['subtitle'] ?? '',
        'date' => $_POST['date'],
        'artist' => $_POST['artist'],
        'link' => $_POST['link'] ?? '',
        'image' => $image_path ?? ''
    ];

    $current_content = file_exists($file_path) ? file_get_contents($file_path) : '[]';
    if ($current_content === false) {
        throw new Exception('Impossible de lire le fichier timeline.');
    }

    $timeline = json_decode($current_content, true);
    if (!is_array($timeline)) {
        $timeline = [];
    }

    array_unshift($timeline, $new_post);

    $write_result = file_put_contents($file_path, json_encode($timeline, JSON_PRETTY_PRINT), LOCK_EX);
    if ($write_result === false) {
        throw new Exception('Impossible d\'écrire dans le fichier timeline.');
    }

    echo json_encode(['status' => 'success', 'post' => $new_post]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>
