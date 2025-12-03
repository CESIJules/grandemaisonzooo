<?php
header('Content-Type: application/json');
header('Cache-Control: no-cache');

$metadataFile = __DIR__ . '/music_metadata.json';

if (file_exists($metadataFile)) {
    readfile($metadataFile);
} else {
    echo '{}';
}
?>