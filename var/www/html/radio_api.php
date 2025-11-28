<?php
session_start();
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
 * 
 * Authentification: session PHP (via login existant)
 */

// --- Validation de la session ---
function validateSession() {
    // Vérifier que l'utilisateur est connecté via la session admin
    // Note: Le login.js utilise sessionStorage côté client, mais on peut aussi
    // accepter un token serveur pour les tests ou intégrations futures
    $headers = getallheaders();
    $token = $headers['X-Radio-Token'] ?? $_GET['token'] ?? '';
    
    // Accepter soit le token de configuration, soit la session admin
    if ($token === RADIO_API_TOKEN) {
        return true;
    }
    
    // Pour le panel admin, on fait confiance au Referer (même origine)
    $referer = $_SERVER['HTTP_REFERER'] ?? '';
    $host = $_SERVER['HTTP_HOST'] ?? '';
    
    if (!empty($referer) && !empty($host) && strpos($referer, $host) !== false) {
        return true;
    }
    
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Accès non autorisé.']);
    exit;
}

// --- Communication avec Liquidsoap via telnet ---
function sendToLiquidsoap($command) {
    $errno = 0;
    $errstr = '';
    $socket = fsockopen(LIQUIDSOAP_HOST, LIQUIDSOAP_PORT, $errno, $errstr, LIQUIDSOAP_TIMEOUT);
    
    if (!$socket) {
        error_log("Liquidsoap connection failed: $errstr ($errno)");
        return ['success' => false, 'error' => "Connexion impossible à Liquidsoap: $errstr ($errno)"];
    }
    
    // Envoyer la commande
    fwrite($socket, $command . "\n");
    
    // Lire la réponse avec protection contre boucle infinie
    $response = '';
    stream_set_timeout($socket, 2);
    $maxIterations = 1000;
    $iterations = 0;
    
    while (!feof($socket) && $iterations < $maxIterations) {
        $line = fgets($socket, 1024);
        if ($line === false || trim($line) === 'END') {
            break;
        }
        $response .= $line;
        $iterations++;
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
validateSession();

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
