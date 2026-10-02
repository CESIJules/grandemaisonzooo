<?php
/**
 * sync.php — Service de synchronisation temps réel pour le Scanner Compagnon ARG
 * Grande Maison / Room 45 — Solution 3
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Cache-Control: no-cache, no-store, must-revalidate');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$sessionsDir = __DIR__ . '/sessions';
if (!is_dir($sessionsDir)) {
    @mkdir($sessionsDir, 0777, true);
}

// Nettoyage périodique (2% de chance) des sessions > 3h
if (mt_rand(1, 50) === 1 && is_dir($sessionsDir)) {
    $now = time();
    $files = @glob($sessionsDir . '/*.json');
    if ($files) {
        foreach ($files as $f) {
            if ($now - @filemtime($f) > 10800) {
                @unlink($f);
            }
        }
    }
}

// Lecture des paramètres (POST JSON ou $_POST / $_GET)
$input = [];
$rawInput = file_get_contents('php://input');
if ($rawInput) {
    $decoded = json_decode($rawInput, true);
    if (is_array($decoded)) {
        $input = $decoded;
    }
}
$action = $input['action'] ?? $_POST['action'] ?? $_GET['action'] ?? 'poll';
$sessionId = $input['session'] ?? $_POST['session'] ?? $_GET['session'] ?? '';

// Nettoyage de l'ID de session
$sessionId = preg_replace('/[^A-Za-z0-9_-]/', '', (string)$sessionId);
if (strlen($sessionId) > 32) {
    $sessionId = substr($sessionId, 0, 32);
}

function getSessionFilePath(string $dir, string $id): string {
    return $dir . '/session_' . md5($id) . '.json';
}

function readSession(string $filePath): ?array {
    if (!file_exists($filePath)) {
        return null;
    }
    for ($i = 0; $i < 2; $i++) {
        $content = @file_get_contents($filePath);
        if ($content) {
            $data = json_decode($content, true);
            if (is_array($data)) {
                return $data;
            }
        }
        usleep(5000); // 5ms retry
    }
    return null;
}

function writeSession(string $filePath, array &$data): bool {
    $data['updated_at'] = microtime(true);
    $data['version'] = (int)($data['version'] ?? 0) + 1;
    $encoded = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    
    // Écriture atomique via fichier temporaire + rename
    $dir = dirname($filePath);
    $tmp = $dir . '/.tmp_' . uniqid('', true) . '.json';
    if (@file_put_contents($tmp, $encoded, LOCK_EX) !== false) {
        if (@rename($tmp, $filePath)) {
            return true;
        }
        @unlink($tmp);
    }
    // Fallback écriture directe
    return (bool)@file_put_contents($filePath, $encoded, LOCK_EX);
}

switch ($action) {
    case 'create':
        if (empty($sessionId)) {
            $randomHex = strtoupper(substr(bin2hex(random_bytes(3)), 0, 4));
            $sessionId = 'R45-' . $randomHex;
        }

        $filePath = getSessionFilePath($sessionsDir, $sessionId);
        $existing = readSession($filePath);

        $initialState = [
            'id' => $sessionId,
            'created_at' => time(),
            'updated_at' => microtime(true),
            'state' => 'standby', // standby | connected | scanning | revealed
            'mobile_connected' => false,
            'secret' => 'SUFFOCATION',
            'version' => 0,
            'room' => 'a01'
        ];

        writeSession($filePath, $initialState);

        echo json_encode([
            'status' => 'success',
            'message' => 'Session créée',
            'session' => $initialState
        ], JSON_UNESCAPED_UNICODE);
        exit;

    case 'join':
        if (empty($sessionId)) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Session ID manquant']);
            exit;
        }

        $filePath = getSessionFilePath($sessionsDir, $sessionId);
        $session = readSession($filePath);
        if (!$session) {
            // Création automatique si absente
            $session = [
                'id' => $sessionId,
                'created_at' => time(),
                'updated_at' => microtime(true),
                'state' => 'connected',
                'mobile_connected' => true,
                'secret' => 'SUFFOCATION',
                'version' => 0,
                'room' => 'a01'
            ];
        } else {
            $session['mobile_connected'] = true;
            if ($session['state'] === 'standby') {
                $session['state'] = 'connected';
            }
        }

        writeSession($filePath, $session);

        echo json_encode([
            'status' => 'success',
            'message' => 'Lentille connectée',
            'session' => $session
        ], JSON_UNESCAPED_UNICODE);
        exit;

    case 'scan_start':
        if (empty($sessionId)) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Session ID manquant']);
            exit;
        }

        $filePath = getSessionFilePath($sessionsDir, $sessionId);
        $session = readSession($filePath);
        if (!$session) {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'message' => 'Session introuvable']);
            exit;
        }

        $session['state'] = 'scanning';
        writeSession($filePath, $session);

        echo json_encode([
            'status' => 'success',
            'message' => 'Scan en cours',
            'session' => $session
        ], JSON_UNESCAPED_UNICODE);
        exit;

    case 'reveal':
        if (empty($sessionId)) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Session ID manquant']);
            exit;
        }

        $filePath = getSessionFilePath($sessionsDir, $sessionId);
        $session = readSession($filePath);
        if (!$session) {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'message' => 'Session introuvable']);
            exit;
        }

        $session['state'] = 'revealed';
        $session['revealed_at'] = time();
        writeSession($filePath, $session);

        echo json_encode([
            'status' => 'success',
            'message' => 'Secret révélé',
            'session' => $session
        ], JSON_UNESCAPED_UNICODE);
        exit;

    case 'reset':
        if (empty($sessionId)) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Session ID manquant']);
            exit;
        }

        $filePath = getSessionFilePath($sessionsDir, $sessionId);
        $session = readSession($filePath);
        if ($session) {
            $session['state'] = 'standby';
            $session['mobile_connected'] = false;
            writeSession($filePath, $session);
        }

        echo json_encode([
            'status' => 'success',
            'message' => 'Session réinitialisée',
            'session' => $session ?? ['id' => $sessionId, 'state' => 'standby', 'version' => 1]
        ], JSON_UNESCAPED_UNICODE);
        exit;

    case 'rescan':
        if (empty($sessionId)) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Session ID manquant']);
            exit;
        }

        $filePath = getSessionFilePath($sessionsDir, $sessionId);
        $session = readSession($filePath);
        if ($session) {
            $session['state'] = 'connected';
            $session['mobile_connected'] = true;
            writeSession($filePath, $session);
        }

        echo json_encode([
            'status' => 'success',
            'message' => 'Lentille prête pour nouveau scan',
            'session' => $session ?? ['id' => $sessionId, 'state' => 'connected', 'version' => 1]
        ], JSON_UNESCAPED_UNICODE);
        exit;

    case 'poll':
    default:
        if (empty($sessionId)) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Session ID manquant']);
            exit;
        }

        $filePath = getSessionFilePath($sessionsDir, $sessionId);
        $session = readSession($filePath);
        if (!$session) {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'message' => 'Session introuvable']);
            exit;
        }

        $clientVersion = isset($_GET['v']) ? (int)$_GET['v'] : (isset($input['v']) ? (int)$input['v'] : -1);
        $changed = ($clientVersion !== (int)($session['version'] ?? 0));

        echo json_encode([
            'status' => 'success',
            'session' => $session,
            'changed' => $changed
        ], JSON_UNESCAPED_UNICODE);
        exit;
}
