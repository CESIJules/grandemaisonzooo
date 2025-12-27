<?php
session_start();
header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);
$username = $data['username'] ?? '';
$password = $data['password'] ?? '';

// Chargement des utilisateurs depuis le fichier externe
$usersPath = __DIR__ . '/../../../home/users.json';

if (file_exists($usersPath)) {
    $users = json_decode(file_get_contents($usersPath), true);
} else {
    // Fallback ou erreur si le fichier est absent
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Configuration utilisateurs introuvable']);
    exit;
}

if (isset($users[$username]) && password_verify($password, $users[$username]['password_hash'])) {
    $_SESSION['logged_in'] = true;
    $_SESSION['user_id'] = $username;
    $_SESSION['role'] = $users[$username]['role'];
    $_SESSION['artist_id'] = $users[$username]['artist_id'];
    
    echo json_encode(['status' => 'success']);
} else {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Identifiants incorrects']);
}
?>
