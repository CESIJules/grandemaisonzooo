<?php
session_start();
header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);
$password = $data['password'] ?? '';

// Chargement de la configuration depuis le fichier externe
// Le fichier est situé dans le dossier home à la racine du projet
$configPath = __DIR__ . '/../../../home/config.php';
if (file_exists($configPath)) {
    $config = require $configPath;
    $VALID_PASSWORD_HASH = $config['admin_password_hash'];
} else {
    // Fallback sécurisé ou erreur si le fichier de config est absent
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Configuration introuvable']);
    exit;
}

if (password_verify($password, $VALID_PASSWORD_HASH)) {
    $_SESSION['logged_in'] = true;
    echo json_encode(['status' => 'success']);
} else {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Mot de passe incorrect']);
}
?>
