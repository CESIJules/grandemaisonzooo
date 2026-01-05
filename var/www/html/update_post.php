<?php
require_once 'auth_check.php';
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

// Check for post_max_size violation
if (empty($_POST) && empty($_FILES) && $_SERVER['CONTENT_LENGTH'] > 0) {
    $displayMaxSize = ini_get('post_max_size');
    send_json_error("La requête est trop volumineuse. Elle dépasse la limite post_max_size du serveur ($displayMaxSize).");
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

// Vérification des permissions
if (isset($_SESSION['role']) && $_SESSION['role'] === 'artist') {
    // Vérifier si le post appartient à l'artiste
    // Note: On compare avec l'ID de l'artiste stocké dans le post
    // Il faut s'assurer que timeline.json utilise bien les IDs (ex: "nelsonnorth") et non les noms complets
    // Si timeline.json utilise les noms, il faudrait mapper, mais add_post utilise l'ID maintenant.
    // On suppose ici que $posts[$post_index]['artist'] contient l'ID.
    // Si c'est le nom, la comparaison échouera si $_SESSION['artist_id'] est l'ID.
    // Cependant, add_post.php a été modifié pour utiliser l'ID.
    // Pour être sûr, on peut être permissif ou vérifier les deux si nécessaire, 
    // mais pour l'instant on reste strict sur l'ID ou on laisse passer si c'est l'admin.
    
    if ($posts[$post_index]['artist'] !== $_SESSION['artist_id']) {
        http_response_code(403);
        send_json_error('Vous ne pouvez modifier que vos propres posts.');
    }
    // Forcer l'artiste à rester le même
    $_POST['artist'] = $_SESSION['artist_id'];
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

    $upload_dir = __DIR__ . '/uploads/';
    if (!is_dir($upload_dir)) {
        mkdir($upload_dir, 0777, true);
    }

    $image_name = basename($_FILES['image']['name']);
    $image_ext = strtolower(pathinfo($image_name, PATHINFO_EXTENSION));
    $new_image_name = 'post_' . $postId . '_' . time() . '.' . $image_ext;
    $target_file = $upload_dir . $new_image_name;
    $image_path = 'uploads/' . $new_image_name;

    // Basic validation
    $allowed_types = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    if (!in_array($image_ext, $allowed_types)) {
        send_json_error('Type de fichier image non valide. Extensions acceptées : jpg, jpeg, png, gif, webp.');
    }

    if (move_uploaded_file($_FILES['image']['tmp_name'], $target_file)) {
        // If there was an old image, you might want to delete it here
        // For simplicity, we are not deleting the old one in this script.
        $posts[$post_index]['image'] = $image_path;
    } else {
        $error = error_get_last();
        send_json_error('Erreur lors du téléchargement de l\'image: ' . ($error['message'] ?? 'Raison inconnue'));
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
