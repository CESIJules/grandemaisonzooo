<?php
header('Content-Type: application/json');

// Error reporting for debugging
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

function send_json_error($message) {
    echo json_encode(['status' => 'error', 'message' => $message]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_json_error('Méthode de requête non autorisée.');
}

$postId = $_POST['id'] ?? null;

if (!$postId) {
    send_json_error('ID de post manquant.');
}

$file_path = 'timeline.json';
if (!file_exists($file_path)) {
    send_json_error('Fichier timeline.json non trouvé.');
}

$json_content = file_get_contents($file_path);
if ($json_content === false) {
    send_json_error('Impossible de lire le fichier timeline.json.');
}

$posts = json_decode($json_content, true);
if ($posts === null) {
    send_json_error('Erreur de décodage JSON.');
}

$post_index = -1;
foreach ($posts as $index => $post) {
    if ($post['id'] == $postId) {
        $post_index = $index;
        break;
    }
}

if ($post_index === -1) {
    send_json_error('Post non trouvé.');
}

// Update fields based on POST data
$posts[$post_index]['title'] = $_POST['title'] ?? $posts[$post_index]['title'];
$posts[$post_index]['subtitle'] = $_POST['subtitle'] ?? $posts[$post_index]['subtitle'];
$posts[$post_index]['date'] = $_POST['date'] ?? $posts[$post_index]['date'];
$posts[$post_index]['artist'] = $_POST['artist'] ?? $posts[$post_index]['artist'];
$posts[$post_index]['link'] = $_POST['link'] ?? $posts[$post_index]['link'];

// Handle image upload
if (isset($_FILES['image']) && $_FILES['image']['error'] !== UPLOAD_ERR_NO_FILE) {
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
        send_json_error($errorMessage);
    }

    $upload_dir = 'uploads/';
    if (!is_dir($upload_dir)) {
        mkdir($upload_dir, 0777, true);
    }

    $image_name = basename($_FILES['image']['name']);
    $image_ext = strtolower(pathinfo($image_name, PATHINFO_EXTENSION));
    $new_image_name = 'post_' . $postId . '_' . time() . '.' . $image_ext;
    $target_file = $upload_dir . $new_image_name;

    // Basic validation
    $allowed_types = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    if (!in_array($image_ext, $allowed_types)) {
        send_json_error('Type de fichier image non valide. Extensions acceptées : jpg, jpeg, png, gif, webp.');
    }

    if (move_uploaded_file($_FILES['image']['tmp_name'], $target_file)) {
        // If there was an old image, you might want to delete it here
        // For simplicity, we are not deleting the old one in this script.
        $posts[$post_index]['image'] = $target_file;
    } else {
        send_json_error('Erreur lors du téléchargement de l\'image.');
    }
}

// Migrate content to image if necessary
if (isset($posts[$post_index]['content'])) {
    // Basic check if content is a path
    if (strpos($posts[$post_index]['content'], 'uploads/') === 0) {
        if (empty($posts[$post_index]['image'])) { // Don't overwrite a newly uploaded image
            $posts[$post_index]['image'] = $posts[$post_index]['content'];
        }
    }
    unset($posts[$post_index]['content']);
}

// Write updated data back to the file
if (file_put_contents($file_path, json_encode($posts, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES))) {
    echo json_encode(['status' => 'success', 'message' => 'Post mis à jour avec succès.']);
} else {
    send_json_error('Impossible d\'écrire dans le fichier timeline.json.');
}
?>
