<?php
header('Content-Type: application/json');
$file = 'artists_profiles.json';
if (file_exists($file)) {
    $fp = fopen($file, 'rb');
    if (flock($fp, LOCK_SH)) {
        fpassthru($fp);
        flock($fp, LOCK_UN);
    } else {
        echo file_get_contents($file);
    }
    fclose($fp);
} else {
    echo json_encode([]);
}
?>