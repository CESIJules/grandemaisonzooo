<?php
session_start();
header('Content-Type: application/json');
// Debug: voir si la session est bien reçue
// error_log('Session ID: ' . session_id());
// error_log('Session Data: ' . print_r($_SESSION, true));

if (isset($_SESSION['logged_in']) && $_SESSION['logged_in'] === true) {
    echo json_encode([
        'logged_in' => true,
        'user_id' => $_SESSION['user_id'] ?? null,
        'role' => $_SESSION['role'] ?? 'guest',
        'artist_id' => $_SESSION['artist_id'] ?? null
    ]);
} else {
    echo json_encode(['logged_in' => false]);
}
?>
