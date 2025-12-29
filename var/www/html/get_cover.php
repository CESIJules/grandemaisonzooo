<?php
/**
 * Extract and serve album cover from MP3 file
 * Usage: get_cover.php?file=filename.mp3
 */

$musicDir = '/home/radio/musique/';

$filename = $_GET['file'] ?? '';

if (empty($filename)) {
    outputDefaultCover();
    exit;
}

// Security: only allow filenames, no paths
$filename = basename($filename);
$filepath = $musicDir . $filename;

if (!file_exists($filepath)) {
    outputDefaultCover();
    exit;
}

// Extract cover from MP3 using ID3 tags
$cover = extractCoverFromMP3($filepath);

if ($cover) {
    header('Content-Type: ' . $cover['mime']);
    header('Cache-Control: public, max-age=604800'); // Cache for 1 week
    header('Content-Length: ' . strlen($cover['data']));
    echo $cover['data'];
    exit;
}

// No cover found
outputDefaultCover();

/**
 * Extract embedded album art from MP3 file
 * Simple approach: find JPEG/PNG magic bytes after APIC tag
 */
function extractCoverFromMP3($filepath) {
    // Read enough data to include the cover (typically < 500KB)
    $data = file_get_contents($filepath, false, null, 0, 512000);
    if (!$data) return null;
    
    // Check for ID3v2 header
    if (substr($data, 0, 3) !== 'ID3') {
        return null;
    }
    
    // Find APIC frame
    $apicPos = strpos($data, 'APIC');
    if ($apicPos === false) {
        return null;
    }
    
    // Look for JPEG (FFD8) or PNG (89504E47) after APIC
    $jpegStart = strpos($data, "\xFF\xD8", $apicPos);
    $pngStart = strpos($data, "\x89PNG", $apicPos);
    
    if ($jpegStart !== false && ($pngStart === false || $jpegStart < $pngStart)) {
        // Found JPEG - find end marker (FFD9)
        $jpegEnd = strpos($data, "\xFF\xD9", $jpegStart);
        if ($jpegEnd !== false) {
            return [
                'mime' => 'image/jpeg',
                'data' => substr($data, $jpegStart, $jpegEnd - $jpegStart + 2)
            ];
        }
    } elseif ($pngStart !== false) {
        // Found PNG - find IEND chunk
        $iendPos = strpos($data, "IEND", $pngStart);
        if ($iendPos !== false) {
            return [
                'mime' => 'image/png',
                'data' => substr($data, $pngStart, $iendPos - $pngStart + 8)
            ];
        }
    }
    
    return null;
}

function outputDefaultCover() {
    header('Content-Type: image/svg+xml');
    header('Cache-Control: public, max-age=604800');
    echo '<?xml version="1.0" encoding="UTF-8"?>
<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#a855f7;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#ec4899;stop-opacity:1" />
        </linearGradient>
    </defs>
    <rect width="200" height="200" fill="#12121a"/>
    <circle cx="100" cy="100" r="55" fill="none" stroke="url(#grad)" stroke-width="4"/>
    <circle cx="100" cy="100" r="18" fill="url(#grad)"/>
    <circle cx="100" cy="100" r="6" fill="#12121a"/>
</svg>';
}
?>
