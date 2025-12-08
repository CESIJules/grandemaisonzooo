<?php
header('Content-Type: application/json');
header('Cache-Control: no-cache');

$metadataFile = __DIR__ . '/music_metadata.json';

if (file_exists($metadataFile)) {
    $fp = fopen($metadataFile, 'rb');
    if (flock($fp, LOCK_SH)) { // Shared lock for reading
        fpassthru($fp);
        flock($fp, LOCK_UN);
    } else {
        // Fallback if lock fails (shouldn't happen often)
        readfile($metadataFile);
    }
    fclose($fp);
} else {
    echo '{}';
}
?>