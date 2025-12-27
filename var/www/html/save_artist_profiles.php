<?php
require_once 'auth_check.php';
header('Content-Type: application/json');

// Vérification de l'authentification
if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

if ($data === null) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid JSON']);
    exit;
}

$file_path = __DIR__ . '/artists_profiles.json';
$current_profiles = [];

if (file_exists($file_path)) {
    $current_profiles = json_decode(file_get_contents($file_path), true) ?? [];
}

// Logique de permission
$role = $_SESSION['role'] ?? 'guest';
$user_artist_id = $_SESSION['artist_id'] ?? null;

if ($role === 'admin') {
    // L'admin peut tout écraser (comportement original)
    $new_profiles = $data;
} elseif ($role === 'artist' && $user_artist_id) {
    // L'artiste ne peut modifier que son propre profil
    $new_profiles = $current_profiles;
    $found = false;

    // On parcourt les données reçues pour trouver les modifications de l'artiste
    foreach ($data as $received_profile) {
        if (isset($received_profile['id']) && $received_profile['id'] === $user_artist_id) {
            // On cherche l'index dans le tableau actuel
            $index = -1;
            foreach ($new_profiles as $i => $p) {
                if ($p['id'] === $user_artist_id) {
                    $index = $i;
                    break;
                }
            }

            if ($index !== -1) {
                // Mise à jour du profil existant
                // On s'assure que l'ID ne change pas
                $received_profile['id'] = $user_artist_id; 
                $new_profiles[$index] = $received_profile;
            } else {
                // Cas étrange : l'artiste n'existe pas encore dans le fichier mais a un compte ?
                // On l'ajoute si nécessaire, ou on rejette. 
                // Pour l'instant, on rejette la création par un artiste.
            }
            $found = true;
            break; // On ne traite qu'un seul profil pour l'artiste
        }
    }
    
    if (!$found) {
        // Si aucune donnée pour cet artiste n'a été trouvée dans l'envoi (suppression ?)
        // On ne fait rien, un artiste ne peut pas se supprimer lui-même via ce script global
    }
} else {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'Forbidden']);
    exit;
}

// Sauvegarde
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

if (file_put_contents($file_path, json_encode($new_profiles, JSON_PRETTY_PRINT), LOCK_EX)) {
    echo json_encode(['status' => 'success']);
} else {
    $error = error_get_last();
    echo json_encode(['status' => 'error', 'message' => 'Failed to save file: ' . ($error['message'] ?? 'Unknown error')]);
}
?>