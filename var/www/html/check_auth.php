<?php
session_start();
header('Content-Type: application/json');

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
