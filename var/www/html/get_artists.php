<?php
header('Content-Type: application/json');
header('Cache-Control: no-cache, must-revalidate');

$file_path = 'artists.json';

if (file_exists($file_path)) {
    $json_content = file_get_contents($file_path);
    echo $json_content;
} else {
    echo '[]';
}
?>
