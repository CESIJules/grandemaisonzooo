<?php
session_start();
header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);
$password = $data['password'] ?? '';

// Mot de passe défini (hashé)
$VALID_PASSWORD_HASH = '$6$Dxjpn28p42w8MgFv$nFfQL0BbyMAWRMoMlhDelTMLpefa4BUZxIKBWdMKTIvxsqQyRusda5lUXy9QM3WXGjM61zZXPbLi8QMhY6XNz.';

if (password_verify($password, $VALID_PASSWORD_HASH)) {
    $_SESSION['logged_in'] = true;
    echo json_encode(['status' => 'success']);
} else {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Mot de passe incorrect']);
}
?>
