<?php
require_once __DIR__ . '/../includes/db.php';

// URL locale d'Icecast (status-json.xsl fournit les stats en JSON)
$icecastUrl = 'http://127.0.0.1:8000/status-json.xsl';

// Récupération des données
$json = @file_get_contents($icecastUrl);

if ($json === false) {
    // Si Icecast est éteint, on loggue 0
    $listeners = 0;
    $peak = 0;
} else {
    $data = json_decode($json, true);
    $source = $data['icestats']['source'] ?? null;
    
    $listeners = 0;
    $peak = 0;

    // Icecast peut retourner un objet unique ou un tableau de sources
    if ($source) {
        if (isset($source['listeners'])) {
            // Une seule source
            $listeners = $source['listeners'];
            $peak = $source['listener_peak'] ?? 0;
        } elseif (is_array($source)) {
            // Plusieurs sources, on cherche celle du stream principal
            foreach ($source as $mount) {
                // On cherche le mount point principal (souvent /stream ou /live)
                // Ici on prend le premier qui a des auditeurs ou par défaut le premier
                if (isset($mount['listeners'])) {
                    $listeners += $mount['listeners']; // Cumul si plusieurs points de montage
                    $peak = max($peak, $mount['listener_peak'] ?? 0);
                }
            }
        }
    }
}

// Enregistrement en BDD
$db = new AnalyticsDB();
$pdo = $db->getPDO();

// On insère la date actuelle avec le bon fuseau horaire
$now = date('Y-m-d H:i:s');

$stmt = $pdo->prepare("INSERT INTO audience_logs (timestamp, listeners, peak_listeners) VALUES (?, ?, ?)");
$stmt->execute([$now, $listeners, $peak]);

echo "Audience enregistrée : $listeners auditeurs (Pic: $peak) à $now";
?>
