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
 */
function extractCoverFromMP3($filepath) {
    $file = fopen($filepath, 'rb');
    if (!$file) return null;
    
    // Read first 10 bytes to check for ID3v2
    $header = fread($file, 10);
    if (substr($header, 0, 3) !== 'ID3') {
        fclose($file);
        return null;
    }
    
    // Get ID3v2 size (syncsafe integer)
    $size = (ord($header[6]) << 21) | (ord($header[7]) << 14) | (ord($header[8]) << 7) | ord($header[9]);
    
    // Read entire ID3v2 tag
    $id3data = fread($file, $size);
    fclose($file);
    
    // Search for APIC frame
    $pos = 0;
    while ($pos < strlen($id3data) - 10) {
        $frameId = substr($id3data, $pos, 4);
        
        if ($frameId === 'APIC') {
            // Frame size (4 bytes, big endian for ID3v2.4, regular for v2.3)
            $frameSize = (ord($id3data[$pos + 4]) << 24) | 
                         (ord($id3data[$pos + 5]) << 16) | 
                         (ord($id3data[$pos + 6]) << 8) | 
                         ord($id3data[$pos + 7]);
            
            // If frame size seems wrong (syncsafe), recalculate
            if ($frameSize > $size) {
                $frameSize = (ord($id3data[$pos + 4]) << 21) | 
                             (ord($id3data[$pos + 5]) << 14) | 
                             (ord($id3data[$pos + 6]) << 7) | 
                             ord($id3data[$pos + 7]);
            }
            
            // Skip frame header (10 bytes) 
            $frameData = substr($id3data, $pos + 10, $frameSize);
            
            // Parse APIC frame
            // Format: encoding (1 byte) + mime type (null-terminated) + picture type (1 byte) + description (null-terminated) + picture data
            $encoding = ord($frameData[0]);
            $mimeEnd = strpos($frameData, "\x00", 1);
            
            if ($mimeEnd !== false) {
                $mimeType = substr($frameData, 1, $mimeEnd - 1);
                
                // Default mime type if empty
                if (empty($mimeType) || $mimeType === 'image/') {
                    $mimeType = 'image/jpeg';
                }
                
                // Find start of image data (after description null terminator)
                $descStart = $mimeEnd + 2; // +1 for picture type, +1 for null
                
                // Handle different encodings for description
                if ($encoding == 0 || $encoding == 3) {
                    // ISO-8859-1 or UTF-8
                    $descEnd = strpos($frameData, "\x00", $descStart);
                } else {
                    // UTF-16
                    $descEnd = strpos($frameData, "\x00\x00", $descStart);
                    if ($descEnd !== false) $descEnd += 1;
                }
                
                if ($descEnd !== false) {
                    $imageData = substr($frameData, $descEnd + 1);
                    
                    // Verify it looks like image data (JPEG or PNG magic bytes)
                    if (substr($imageData, 0, 2) === "\xFF\xD8" || // JPEG
                        substr($imageData, 0, 8) === "\x89PNG\r\n\x1a\n") { // PNG
                        return [
                            'mime' => $mimeType,
                            'data' => $imageData
                        ];
                    }
                }
            }
        }
        
        // Move to next frame
        if (strlen($id3data) > $pos + 4) {
            $nextFrameSize = (ord($id3data[$pos + 4]) << 24) | 
                             (ord($id3data[$pos + 5]) << 16) | 
                             (ord($id3data[$pos + 6]) << 8) | 
                             ord($id3data[$pos + 7]);
            
            if ($nextFrameSize <= 0 || $nextFrameSize > $size) {
                break;
            }
            $pos += 10 + $nextFrameSize;
        } else {
            break;
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
