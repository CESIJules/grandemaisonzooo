<?php
header('Content-Type: application/json');

// Affichez les erreurs PHP pour le débogage (à retirer en production)
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

$file_path = 'timeline.json';
$upload_dir = 'uploads/';

// --- Vérifications de permissions ---
if (file_exists($file_path) && !is_writable($file_path)) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Erreur de permission : Le fichier timeline.json n\'est pas accessible en écriture.'
    ]);
    exit;
}

if (!is_writable($upload_dir)) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Erreur de permission : Le dossier uploads/ n\'est pas accessible en écriture.'
    ]);
    exit;
}
// --- Fin des vérifications ---

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Méthode non autorisée.']);
    exit;
}

try {
    // Basic validation
    if (empty($_POST['title']) || empty($_POST['date']) || empty($_POST['artist'])) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Données invalides ou champs manquants (titre, date, artiste).']);
        exit;
    }

    $image_path = null;

    // Handle file upload
    if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
        $tmp_name = $_FILES['image']['tmp_name'];
        $file_extension = pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION);
        $new_filename = uniqid('post_', true) . '.' . $file_extension;
        $destination = $upload_dir . $new_filename;

        if (!move_uploaded_file($tmp_name, $destination)) {
            throw new Exception('Impossible de déplacer le fichier téléchargé. Vérifiez les permissions du dossier uploads.');
        }
        $image_path = $destination;
    }

    $new_post = [
        'id' => $_POST['id'] ?? time(),
        'title' => $_POST['title'],
        'subtitle' => $_POST['subtitle'] ?? '',
        'date' => $_POST['date'],
        'artist' => $_POST['artist'],
        'content' => $image_path ?? $_POST['content'] ?? ''
    ];

    $current_content = file_exists($file_path) ? file_get_contents($file_path) : '[]';
    if ($current_content === false) {
        throw new Exception('Impossible de lire le fichier timeline.json.');
    }

    $timeline = json_decode($current_content, true);
    if (!is_array($timeline)) {
        $timeline = [];
    }

    array_unshift($timeline, $new_post);

    if (file_put_contents($file_path, json_encode($timeline, JSON_PRETTY_PRINT), LOCK_EX) === false) {
        throw new Exception('Impossible d\'écrire dans le fichier timeline.json.');
    }

    echo json_encode(['status' => 'success', 'post' => $new_post]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
}
?>
