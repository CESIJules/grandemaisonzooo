<?php
// Configuration des cookies de session pour éviter les problèmes de domaine/path
session_set_cookie_params([
    'lifetime' => 86400,
    'path' => '/',
    'domain' => '', // Laisser vide pour le domaine courant
    'secure' => false, // Mettre à true si HTTPS
    'httponly' => true,
    'samesite' => 'Lax'
]);
session_start();
header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);
$username = $data['username'] ?? '';
$password = $data['password'] ?? '';

// Chargement des utilisateurs depuis le fichier externe
$usersPath = __DIR__ . '/../users.json';

if (file_exists($usersPath)) {
    $users = json_decode(file_get_contents($usersPath), true);
} else {
    // Fallback ou erreur si le fichier est absent
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Configuration utilisateurs introuvable']);
    exit;
}

// Recherche de l'utilisateur (insensible à la casse)
$found_user = null;
$real_username = null;

foreach ($users as $u => $props) {
    if (strcasecmp($u, $username) === 0) {
        $found_user = $props;
        $real_username = $u;
        break;
    }
}

if ($found_user && password_verify($password, $found_user['password_hash'])) {
    $_SESSION['logged_in'] = true;
    $_SESSION['user_id'] = $real_username;
    $_SESSION['role'] = $found_user['role'];
    $_SESSION['artist_id'] = $found_user['artist_id'];
    
    echo json_encode(['status' => 'success']);
} else {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Identifiants incorrects']);
}
?>
