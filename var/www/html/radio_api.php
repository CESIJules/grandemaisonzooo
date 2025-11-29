<?php
session_start();

require_once 'radio_config.php';

/**
 * API de contrôle de la radio Liquidsoap
 * 
 * Actions disponibles:
 * - skip: Passer au morceau suivant
 * - queue: Afficher la file d'attente
 * - push: Ajouter un morceau à la file d'attente
 * - reorder: Réorganiser la file d'attente
 * - upcoming: Obtenir les prochains morceaux (queue + playlist)
 * - events: Server-Sent Events pour les mises à jour en temps réel
 * 
 * Authentification: session PHP (via login existant)
 */

// File to store the last skip timestamp for SSE
define('SKIP_EVENT_FILE', '/tmp/radio_skip_event.txt');

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
    $socket = @fsockopen(LIQUIDSOAP_HOST, LIQUIDSOAP_PORT, $errno, $errstr, LIQUIDSOAP_TIMEOUT);
    
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
    
    // Write skip event timestamp for SSE listeners
    file_put_contents(SKIP_EVENT_FILE, time() . "\n", LOCK_EX);
    
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
    // Format Liquidsoap attendu: "[request_id] /full/path/to/file.mp3" (un élément par ligne)
    // Ou potentiellement: liste d'IDs séparés par des espaces sur une seule ligne
    $queue = [];
    $lines = explode("\n", $result['response']);
    
    foreach ($lines as $line) {
        $line = trim($line);
        if (empty($line) || $line === 'END') {
            continue;
        }
        
        // Format 1: [rid] /path/to/file.mp3
        // Chaque élément est sur sa propre ligne avec le request ID entre crochets
        if (preg_match('/^\[(\d+)\]\s+(.+)$/', $line, $matches)) {
            $requestId = $matches[1];
            $path = $matches[2];
            $filename = basename($path);
            $queue[] = [
                'rid' => $requestId,
                'path' => $path,
                'filename' => $filename
            ];
            continue;
        }
        
        // Format 2: Liste d'IDs séparés par des espaces (ex: "35 36 37 38")
        // Si la ligne contient uniquement des nombres séparés par des espaces, 
        // ce sont des request IDs qu'il faut résoudre individuellement
        // Note: This creates individual telnet connections per ID; acceptable for typical queue sizes
        if (preg_match('/^[\d\s]+$/', $line)) {
            $rids = preg_split('/\s+/', $line, -1, PREG_SPLIT_NO_EMPTY);
            foreach ($rids as $rid) {
                // Pour chaque request ID, obtenir les métadonnées via request.metadata
                $metaResult = sendToLiquidsoap("request.metadata $rid");
                if ($metaResult['success']) {
                    $filename = extractFilenameFromMetadata($metaResult['response'], $rid);
                } else {
                    // Fallback si la requête de métadonnées échoue
                    $filename = "Track #$rid";
                }
                $queue[] = [
                    'rid' => $rid,
                    'path' => null, // Path unknown when resolved from metadata
                    'filename' => $filename
                ];
            }
            continue;
        }
        
        // Format 3: Chemin simple sans request ID
        if (strpos($line, '/') !== false) {
            $filename = basename($line);
            $queue[] = [
                'path' => $line,
                'filename' => $filename
            ];
        }
    }
    
    return ['status' => 'success', 'queue' => $queue];
}

// Extraire le nom de fichier depuis les métadonnées Liquidsoap
function extractFilenameFromMetadata($metadata, $fallbackRid) {
    // Les métadonnées Liquidsoap sont au format "key=value" sur plusieurs lignes
    $lines = explode("\n", $metadata);
    foreach ($lines as $line) {
        // Chercher le champ "filename" ou "source" ou "title"
        if (preg_match('/^filename="(.+)"$/', trim($line), $matches)) {
            return basename($matches[1]);
        }
        if (preg_match('/^source="(.+)"$/', trim($line), $matches)) {
            return basename($matches[1]);
        }
        if (preg_match('/^title="(.+)"$/', trim($line), $matches)) {
            return $matches[1];
        }
    }
    // Fallback: retourner le request ID si aucun nom trouvé
    return "Track #$fallbackRid";
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

// Réorganiser la file d'attente
function reorderQueue($newOrder) {
    if (!is_array($newOrder) || empty($newOrder)) {
        http_response_code(400);
        return ['status' => 'error', 'message' => 'Ordre invalide fourni.'];
    }
    
    // Get current queue
    $currentQueue = getQueue();
    if ($currentQueue['status'] !== 'success') {
        return $currentQueue;
    }
    
    // Validate that all filenames in newOrder exist in the current queue
    $currentFilenames = array_map(function($item) {
        return $item['filename'];
    }, $currentQueue['queue']);
    
    foreach ($newOrder as $filename) {
        $safeFilename = basename($filename);
        if (!in_array($safeFilename, $currentFilenames)) {
            http_response_code(400);
            return ['status' => 'error', 'message' => "Fichier non trouvé dans la file: $safeFilename"];
        }
    }
    
    // Liquidsoap's request.queue doesn't have a native reorder command
    // We need to clear the queue and re-add items in the new order
    // First, get the queue IDs and ignore them all
    $result = sendToLiquidsoap("queue.queue");
    if ($result['success']) {
        $lines = explode("\n", $result['response']);
        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line) || $line === 'END') {
                continue;
            }
            
            // Format 1: [rid] /path/to/file.mp3
            if (preg_match('/^\[(\d+)\]/', $line, $matches)) {
                $rid = $matches[1];
                sendToLiquidsoap("queue.ignore $rid");
                continue;
            }
            
            // Format 2: Liste d'IDs séparés par des espaces
            if (preg_match('/^[\d\s]+$/', $line)) {
                $rids = preg_split('/\s+/', $line, -1, PREG_SPLIT_NO_EMPTY);
                foreach ($rids as $rid) {
                    sendToLiquidsoap("queue.ignore $rid");
                }
            }
        }
    }
    
    // Re-add items in the new order
    foreach ($newOrder as $filename) {
        $safeFilename = basename($filename);
        $fullPath = MUSIC_DIR . $safeFilename;
        if (file_exists($fullPath)) {
            sendToLiquidsoap("queue.push " . $fullPath);
        }
    }
    
    return ['status' => 'success', 'message' => 'File d\'attente réorganisée.'];
}

// Obtenir les prochains morceaux (queue + playlist fallback)
function getUpcoming() {
    // Get queue first
    $queueResult = getQueue();
    $queue = ($queueResult['status'] === 'success') ? $queueResult['queue'] : [];
    
    // Get playlist files
    $playlistFiles = [];
    if (is_dir(MUSIC_DIR)) {
        $files = scandir(MUSIC_DIR);
        foreach ($files as $file) {
            if ($file !== '.' && $file !== '..' && preg_match('/\.(mp3|ogg|flac|wav|m4a)$/i', $file)) {
                $playlistFiles[] = [
                    'filename' => $file,
                    'path' => MUSIC_DIR . $file,
                    'source' => 'playlist'
                ];
            }
        }
        // Sort alphabetically
        usort($playlistFiles, function($a, $b) {
            return strcasecmp($a['filename'], $b['filename']);
        });
    }
    
    // Mark queue items
    foreach ($queue as &$item) {
        $item['source'] = 'queue';
    }
    
    return [
        'status' => 'success',
        'queue' => $queue,
        'playlist' => $playlistFiles,
        'upcoming' => array_merge($queue, array_slice($playlistFiles, 0, 10)) // Show queue + first 10 from playlist
    ];
}

// Get last skip event timestamp
function getLastSkipEvent() {
    if (file_exists(SKIP_EVENT_FILE)) {
        return (int)trim(file_get_contents(SKIP_EVENT_FILE));
    }
    return 0;
}

// Server-Sent Events endpoint for real-time updates
function streamEvents() {
    header('Content-Type: text/event-stream');
    header('Cache-Control: no-cache');
    header('Connection: keep-alive');
    header('X-Accel-Buffering: no'); // Disable nginx buffering
    
    // Disable output buffering
    if (ob_get_level()) {
        ob_end_clean();
    }
    
    $lastSkipTime = getLastSkipEvent();
    $lastCheck = time();
    $heartbeatInterval = 30; // Send heartbeat every 30 seconds
    $maxRunTime = 300; // Maximum connection time: 5 minutes
    $startTime = time();
    
    // Set script timeout to slightly longer than max run time
    set_time_limit($maxRunTime + 10);
    
    while (true) {
        // Check for new skip event
        $currentSkipTime = getLastSkipEvent();
        if ($currentSkipTime > $lastSkipTime) {
            $lastSkipTime = $currentSkipTime;
            echo "event: skip\n";
            echo "data: " . json_encode(['timestamp' => $currentSkipTime]) . "\n\n";
            flush();
        }
        
        // Send heartbeat to keep connection alive
        if (time() - $lastCheck >= $heartbeatInterval) {
            echo "event: heartbeat\n";
            echo "data: " . json_encode(['timestamp' => time()]) . "\n\n";
            flush();
            $lastCheck = time();
        }
        
        // Check if client disconnected
        if (connection_aborted()) {
            break;
        }
        
        // Limit connection time to prevent resource exhaustion
        if (time() - $startTime >= $maxRunTime) {
            echo "event: reconnect\n";
            echo "data: " . json_encode(['message' => 'Connection timeout, please reconnect']) . "\n\n";
            flush();
            break;
        }
        
        // Sleep to reduce CPU usage (1 second interval for event checking)
        sleep(1);
    }
}

// --- Routage ---
$action = $_GET['action'] ?? '';

// SSE doesn't need session validation for listeners
if ($action === 'events') {
    streamEvents();
    exit;
}

// Set JSON headers for non-SSE requests
header('Content-Type: application/json');
header('Cache-Control: no-cache');

validateSession();

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
    
    case 'reorder':
        $postData = json_decode(file_get_contents('php://input'), true);
        $newOrder = $postData['order'] ?? [];
        echo json_encode(reorderQueue($newOrder));
        break;
    
    case 'upcoming':
        echo json_encode(getUpcoming());
        break;
        
    default:
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Action invalide. Actions disponibles: skip, queue, push, reorder, upcoming, events']);
        break;
}
?>
