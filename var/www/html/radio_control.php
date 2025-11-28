<?php
header('Content-Type: application/json');
header('Cache-Control: no-cache');

// Configuration Liquidsoap telnet
$telnetHost = '127.0.0.1';
$telnetPort = 1234;
$timeout = 5;

// Repertoire musique
$musicDir = '/home/radio/musique/';

/**
 * Envoie une commande au serveur Liquidsoap via telnet
 * @param string $command La commande a envoyer
 * @return string|false La reponse ou false en cas d'erreur
 */
function sendTelnetCommand($command, $host, $port, $timeout) {
    $socket = @fsockopen($host, $port, $errno, $errstr, $timeout);
    if (!$socket) {
        return false;
    }
    
    // Configuration du timeout pour la lecture
    stream_set_timeout($socket, $timeout);
    
    // Envoyer la commande
    fwrite($socket, $command . "\n");
    fwrite($socket, "quit\n");
    
    // Lire la reponse
    $response = '';
    while (!feof($socket)) {
        $line = fgets($socket, 4096);
        if ($line === false) break;
        $response .= $line;
    }
    
    fclose($socket);
    return trim($response);
}

// Verifier la methode
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Methode non autorisee']);
    exit;
}

// Recuperer les donnees JSON
$data = json_decode(file_get_contents('php://input'), true);
$action = isset($data['action']) ? $data['action'] : '';

switch ($action) {
    case 'skip':
        // Passer au morceau suivant
        $result = sendTelnetCommand('skip', $telnetHost, $telnetPort, $timeout);
        if ($result === false) {
            http_response_code(503);
            echo json_encode(['status' => 'error', 'message' => 'Impossible de se connecter au serveur Liquidsoap']);
        } else {
            echo json_encode(['status' => 'success', 'message' => 'Morceau suivant']);
        }
        break;
        
    case 'queue':
        // Ajouter une chanson a la file d'attente
        $filename = isset($data['filename']) ? $data['filename'] : '';
        
        if (empty($filename)) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Nom de fichier requis']);
            exit;
        }
        
        // Securite: empecher la traversee de repertoire
        $safeFilename = basename($filename);
        if ($safeFilename !== $filename) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Tentative de traversee de repertoire detectee']);
            exit;
        }
        
        $fullPath = $musicDir . $safeFilename;
        
        // Verifier que le chemin resolu est bien dans le repertoire musique
        $realPath = realpath($fullPath);
        $realMusicDir = realpath($musicDir);
        if ($realPath === false || $realMusicDir === false || strpos($realPath, $realMusicDir) !== 0) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Chemin de fichier invalide']);
            exit;
        }
        
        if (!file_exists($realPath) || !is_file($realPath)) {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'message' => 'Fichier non trouve']);
            exit;
        }
        
        // Echapper les caracteres speciaux pour la commande telnet
        $escapedPath = addcslashes($realPath, "\n\r\t\\\"'");
        $result = sendTelnetCommand('queue.push ' . $escapedPath, $telnetHost, $telnetPort, $timeout);
        if ($result === false) {
            http_response_code(503);
            echo json_encode(['status' => 'error', 'message' => 'Impossible de se connecter au serveur Liquidsoap']);
        } else {
            echo json_encode(['status' => 'success', 'message' => 'Morceau ajoute a la file d\'attente', 'response' => $result]);
        }
        break;
        
    case 'queue_length':
        // Obtenir la longueur de la file d'attente
        $result = sendTelnetCommand('queue.length', $telnetHost, $telnetPort, $timeout);
        if ($result === false) {
            http_response_code(503);
            echo json_encode(['status' => 'error', 'message' => 'Impossible de se connecter au serveur Liquidsoap']);
        } else {
            echo json_encode(['status' => 'success', 'length' => intval($result)]);
        }
        break;
        
    default:
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Action non reconnue']);
        break;
}
?>
