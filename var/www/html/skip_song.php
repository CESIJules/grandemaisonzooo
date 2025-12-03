<?php
header('Content-Type: application/json');

$host = '127.0.0.1';
$port = 1234;
$timeout = 3;

$fp = @fsockopen($host, $port, $errno, $errstr, $timeout);

if (!$fp) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => "Impossible de se connecter à Liquidsoap: $errstr ($errno)"]);
    exit;
}

// Set stream timeout
stream_set_timeout($fp, 2);

// Send command
fwrite($fp, "main_playlist.skip\n");
fwrite($fp, "quit\n");

// Read response
$response = '';
while (!feof($fp)) {
    $line = fgets($fp, 128);
    if ($line === false) break;
    $response .= $line;
}

fclose($fp);

echo json_encode(['status' => 'success', 'message' => 'Commande envoyée.', 'telnet_response' => $response]);
?>
