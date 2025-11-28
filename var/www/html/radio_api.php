<?php
header('Content-Type: application/json');
header('Cache-Control: no-cache');

require_once 'radio_config.php';

/**
 * API de contrôle de la radio Liquidsoap
 * 
 * Actions disponibles:
 * - skip: Passer au morceau suivant
 * - queue: Afficher la file d'attente
 * - push: Ajouter un morceau à la file d'attente
 */

// --- Validation du token ---
function validateToken() {
    $headers = getallheaders();
    $token = $headers['X-Radio-Token'] ?? $_GET['token'] ?? '';
    
    if ($token !== RADIO_API_TOKEN) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Token invalide ou manquant.']);
        exit;
    }
}

// --- Communication avec Liquidsoap via telnet ---
function sendToLiquidsoap($command) {
    $socket = @fsockopen(LIQUIDSOAP_HOST, LIQUIDSOAP_PORT, $errno, $errstr, LIQUIDSOAP_TIMEOUT);
    
    if (!$socket) {
        return ['success' => false, 'error' => "Connexion impossible à Liquidsoap: $errstr ($errno)"];
    }
    
    // Envoyer la commande
    fwrite($socket, $command . "\n");
    
    // Lire la réponse
    $response = '';
    stream_set_timeout($socket, 2);
    while (!feof($socket)) {
        $line = fgets($socket, 1024);
        if ($line === false || trim($line) === 'END') {
            break;
        }
        $response .= $line;
    }
    
    // Fermer proprement avec quit
    fwrite($socket, "quit\n");
    fclose($socket);
    
    return ['success' => true, 'response' => trim($response)];
}

// --- Actions ---

// Passer au morceau suivant
function skipTrack() {
    // Utiliser la commande skip sur la source
    $result = sendToLiquidsoap("queue.skip");
    
    if (!$result['success']) {
        http_response_code(500);
        return ['status' => 'error', 'message' => $result['error']];
    }
    
    return ['status' => 'success', 'message' => 'Morceau passé avec succès.'];
}

// Afficher la file d'attente
function getQueue() {
    $result = sendToLiquidsoap("queue.queue");
    
    if (!$result['success']) {
        http_response_code(500);
        return ['status' => 'error', 'message' => $result['error']];
    }
    
    // Parser la réponse pour extraire les fichiers
    $queue = [];
    $lines = explode("\n", $result['response']);
    foreach ($lines as $line) {
        $line = trim($line);
        if (!empty($line) && $line !== 'END') {
            // Extraire le nom du fichier depuis le chemin
            $filename = basename($line);
            $queue[] = [
                'path' => $line,
                'filename' => $filename
            ];
        }
    }
    
    return ['status' => 'success', 'queue' => $queue];
}

// Ajouter un morceau à la file d'attente
function pushTrack($filename) {
    // Validation du nom de fichier (sécurité anti path traversal)
    $safeFilename = basename($filename);
    if ($safeFilename !== $filename) {
        http_response_code(400);
        return ['status' => 'error', 'message' => 'Tentative de parcours de répertoire détectée.'];
    }
    
    $fullPath = MUSIC_DIR . $safeFilename;
    
    // Vérifier que le fichier existe
    if (!file_exists($fullPath)) {
        http_response_code(404);
        return ['status' => 'error', 'message' => 'Le fichier n\'existe pas.'];
    }
    
    // Envoyer la commande push à Liquidsoap
    $result = sendToLiquidsoap("queue.push " . $fullPath);
    
    if (!$result['success']) {
        http_response_code(500);
        return ['status' => 'error', 'message' => $result['error']];
    }
    
    return ['status' => 'success', 'message' => "\"$safeFilename\" ajouté à la file d'attente."];
}

// --- Routage ---
validateToken();

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'skip':
        echo json_encode(skipTrack());
        break;
        
    case 'queue':
        echo json_encode(getQueue());
        break;
        
    case 'push':
        $postData = json_decode(file_get_contents('php://input'), true);
        $filename = $postData['filename'] ?? $_GET['filename'] ?? '';
        
        if (empty($filename)) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Aucun nom de fichier fourni.']);
        } else {
            echo json_encode(pushTrack($filename));
        }
        break;
        
    default:
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Action invalide. Actions disponibles: skip, queue, push']);
        break;
}
?>
