<?php
header('Content-Type: application/json');
header('Cache-Control: no-cache, must-revalidate');

$file_path = __DIR__ . '/artists_profiles.json';

if (file_exists($file_path)) {
    $json_content = file_get_contents($file_path);
    $profiles = json_decode($json_content, true);
    
    if (json_last_error() === JSON_ERROR_NONE && is_array($profiles)) {
        $names = array_map(function($profile) {
            return $profile['name'];
        }, $profiles);
        echo json_encode(array_values($names));
    } else {
        echo '[]';
    }
} else {
    echo '[]';
}
?>
