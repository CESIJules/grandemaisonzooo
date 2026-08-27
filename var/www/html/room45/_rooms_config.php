<?php
// ─────────────────────────────────────────────────────────────────────────────
// _rooms_config.php — Configuration partagée des salles (index + garde serveur)
// ─────────────────────────────────────────────────────────────────────────────
if (!defined('ROOM45_ENTRY')) {
    http_response_code(403);
    exit;
}

$ROOMS_INDEX = [
    ['id' => 'a01', 'label' => '1', 'active' => true],
    ['id' => 'a02', 'label' => '2', 'active' => true],
    ['id' => 'a03', 'label' => '3', 'active' => false],
    ['id' => 'a04', 'label' => '4', 'active' => false],
    ['id' => 'a05', 'label' => '5', 'active' => false],
    ['id' => 'a06', 'label' => '6', 'active' => false],
    ['id' => 'a07', 'label' => '7', 'active' => false],
    ['id' => 'a08', 'label' => '8', 'active' => false],
    ['id' => 'a09', 'label' => '9', 'active' => false],
    ['id' => 'a10', 'label' => '10', 'active' => false],
    ['id' => 'a11', 'label' => '11', 'active' => false],
    ['id' => 'a12', 'label' => '12', 'active' => false],
    ['id' => 'a13', 'label' => '13', 'active' => false],
    ['id' => 'a14', 'label' => '14', 'active' => false],
    ['id' => 'a15', 'label' => '15', 'active' => false],
    ['id' => 'a16', 'label' => '16', 'active' => false],
    ['id' => 'a17', 'label' => '17', 'active' => false],
    ['id' => 'a18', 'label' => '18', 'active' => false],
    ['id' => 'a19', 'label' => '19', 'active' => false],
    ['id' => 'a20', 'label' => '20', 'active' => false],
    ['id' => 'a21', 'label' => '21', 'active' => false],
    ['id' => 'a22', 'label' => '22', 'active' => false],
    ['id' => 'a23', 'label' => '23', 'active' => false],
    ['id' => 'a24', 'label' => '24', 'active' => false],
    ['id' => 'a25', 'label' => '25', 'active' => false],
    ['id' => 'a26', 'label' => '26', 'active' => false],
    ['id' => 'a27', 'label' => '27', 'active' => false],
    ['id' => 'a28', 'label' => '28', 'active' => false],
    ['id' => 'a29', 'label' => '29', 'active' => false],
    ['id' => 'a30', 'label' => '30', 'active' => false],
    ['id' => 'a31', 'label' => '31', 'active' => false],
    ['id' => 'a32', 'label' => '32', 'active' => false],
    ['id' => 'a33', 'label' => '33', 'active' => false],
    ['id' => 'a34', 'label' => '34', 'active' => false],
    ['id' => 'a35', 'label' => '35', 'active' => false],
    ['id' => 'a36', 'label' => '36', 'active' => false],
    ['id' => 'a37', 'label' => '37', 'active' => false],
    ['id' => 'a38', 'label' => '38', 'active' => false],
    ['id' => 'a39', 'label' => '39', 'active' => false],
    ['id' => 'a40', 'label' => '40', 'active' => false],
    ['id' => 'a41', 'label' => '41', 'active' => false],
    ['id' => 'a42', 'label' => '42', 'active' => false],
    ['id' => 'a43', 'label' => '43', 'active' => false],
    ['id' => 'a44', 'label' => '44', 'active' => false],
    ['id' => 'a45', 'label' => '45', 'active' => false],
];

if (!function_exists('room45_is_active')) {
    function room45_is_active(string $roomId): bool
    {
        global $ROOMS_INDEX;

        foreach ($ROOMS_INDEX as $room) {
            if (($room['id'] ?? '') === $roomId) {
                return !empty($room['active']);
            }
        }

        return false;
    }
}
