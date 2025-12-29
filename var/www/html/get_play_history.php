<?php
// get_play_history.php
// Retourne les X derniers morceaux joués (hors morceau en cours)

header('Content-Type: application/json');
header('Cache-Control: no-cache, no-store, must-revalidate');

require_once __DIR__ . '/includes/db.php';

$limit = isset($_GET['limit']) ? intval($_GET['limit']) : 3;
$limit = max(1, min(20, $limit)); // Entre 1 et 20

try {
    $db = new AnalyticsDB();
    $pdo = $db->getPDO();
    
    // Récupérer les X+1 derniers morceaux (le premier est le morceau en cours)
    // On exclut le morceau en cours en prenant à partir du 2ème
    $stmt = $pdo->prepare("
        SELECT timestamp, artist, title 
        FROM play_history 
        ORDER BY id DESC 
        LIMIT ? OFFSET 1
    ");
    $stmt->execute([$limit]);
    $history = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Calculer le temps relatif pour chaque morceau
    $now = time();
    foreach ($history as &$track) {
        $trackTime = strtotime($track['timestamp']);
        $diff = $now - $trackTime;
        
        if ($diff < 60) {
            $track['relative_time'] = 'Il y a moins d\'1 min';
        } elseif ($diff < 3600) {
            $mins = floor($diff / 60);
            $track['relative_time'] = 'Il y a ' . $mins . ' min';
        } elseif ($diff < 86400) {
            $hours = floor($diff / 3600);
            $track['relative_time'] = 'Il y a ' . $hours . 'h';
        } else {
            $track['relative_time'] = date('d/m H:i', $trackTime);
        }
        
        // Formater le titre complet
        if (!empty($track['artist']) && !empty($track['title'])) {
            $track['display'] = strtoupper($track['artist'] . ' - ' . $track['title']);
        } elseif (!empty($track['title'])) {
            $track['display'] = strtoupper($track['title']);
        } else {
            $track['display'] = strtoupper($track['artist']);
        }
    }
    
    echo json_encode([
        'success' => true,
        'history' => $history
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database error'
    ]);
}
?>
