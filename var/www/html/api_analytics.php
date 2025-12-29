<?php
require_once __DIR__ . '/includes/db.php';

header('Content-Type: application/json');

// Vérification basique de sécurité (à renforcer avec auth_check.php si nécessaire)
// require_once 'auth_check.php'; 

$type = $_GET['type'] ?? '';
$range = $_GET['range'] ?? '24h';

$db = new AnalyticsDB();
$pdo = $db->getPDO();

$response = ['status' => 'error', 'message' => 'Invalid request'];

try {
    switch ($type) {
        case 'audience':
            // Récupération des logs d'audience
            $limit = 144; // 24h * 6 (si 10min intervalle) = 144 points
            if ($range === '7d') $limit = 1008;
            
            // On récupère les X derniers points
            // On utilise une sous-requête pour trier par date croissante à la fin
            $sql = "SELECT * FROM (
                        SELECT timestamp, listeners 
                        FROM audience_logs 
                        ORDER BY id DESC 
                        LIMIT :limit
                    ) ORDER BY timestamp ASC";
            
            $stmt = $pdo->prepare($sql);
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->execute();
            $data = $stmt->fetchAll();
            
            $response = ['status' => 'success', 'data' => $data];
            break;

        case 'top_tracks':
            // Top 10 des morceaux les plus joués (30 derniers jours)
            $sql = "SELECT artist, title, COUNT(*) as count 
                    FROM play_history 
                    WHERE timestamp > datetime('now', '-30 days')
                    GROUP BY artist, title 
                    ORDER BY count DESC 
                    LIMIT 10";
            $stmt = $pdo->query($sql);
            $data = $stmt->fetchAll();
            $response = ['status' => 'success', 'data' => $data];
            break;

        case 'top_artists':
            // Top 10 des artistes (30 derniers jours)
            $sql = "SELECT artist, COUNT(*) as count 
                    FROM play_history 
                    WHERE timestamp > datetime('now', '-30 days')
                    GROUP BY artist 
                    ORDER BY count DESC 
                    LIMIT 10";
            $stmt = $pdo->query($sql);
            $data = $stmt->fetchAll();
            $response = ['status' => 'success', 'data' => $data];
            break;
            
        case 'heatmap':
            // Données pour la heatmap (Jour de la semaine x Heure)
            // SQLite: strftime('%w', timestamp) -> 0-6 (Dimanche-Samedi)
            // SQLite: strftime('%H', timestamp) -> 00-23
            $sql = "SELECT 
                        strftime('%w', timestamp) as day_of_week,
                        strftime('%H', timestamp) as hour_of_day,
                        AVG(listeners) as avg_listeners
                    FROM audience_logs
                    WHERE timestamp > datetime('now', '-30 days')
                    GROUP BY day_of_week, hour_of_day";
            $stmt = $pdo->query($sql);
            $data = $stmt->fetchAll();
            $response = ['status' => 'success', 'data' => $data];
            break;
            
        case 'stats_header':
            // Stats rapides pour le haut du dashboard
            // 1. Pic d'audience (30j) et comparaison avec les 30j précédents
            $peak = $pdo->query("SELECT MAX(listeners) FROM audience_logs WHERE timestamp > datetime('now', '-30 days')")->fetchColumn();
            $peak_prev = $pdo->query("SELECT MAX(listeners) FROM audience_logs WHERE timestamp > datetime('now', '-60 days') AND timestamp <= datetime('now', '-30 days')")->fetchColumn();
            
            // 2. Moyenne auditeurs (24h) et comparaison avec hier
            $avg = $pdo->query("SELECT AVG(listeners) FROM audience_logs WHERE timestamp > datetime('now', '-24 hours')")->fetchColumn();
            $avg_prev = $pdo->query("SELECT AVG(listeners) FROM audience_logs WHERE timestamp > datetime('now', '-48 hours') AND timestamp <= datetime('now', '-24 hours')")->fetchColumn();
            
            // 3. Total tracks joués (24h) et comparaison avec hier
            $tracks = $pdo->query("SELECT COUNT(*) FROM play_history WHERE timestamp > datetime('now', '-24 hours')")->fetchColumn();
            $tracks_prev = $pdo->query("SELECT COUNT(*) FROM play_history WHERE timestamp > datetime('now', '-48 hours') AND timestamp <= datetime('now', '-24 hours')")->fetchColumn();
            
            $response = ['status' => 'success', 'data' => [
                'peak_30d' => $peak ?: 0,
                'peak_prev_30d' => $peak_prev ?: 0,
                'avg_24h' => round($avg ?: 0, 1),
                'avg_prev_24h' => round($avg_prev ?: 0, 1),
                'tracks_24h' => $tracks ?: 0,
                'tracks_prev_24h' => $tracks_prev ?: 0
            ]];
            break;

        default:
            $response = ['status' => 'error', 'message' => 'Unknown type'];
    }
} catch (Exception $e) {
    $response = ['status' => 'error', 'message' => $e->getMessage()];
}

echo json_encode($response);
?>
