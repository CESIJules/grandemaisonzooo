<?php
require_once __DIR__ . '/../includes/db.php';

// Ce script est appelé par Liquidsoap via une requête HTTP GET/POST
// Exemple : http://localhost/scripts/log_track.php?artist=Artist&title=Title

$artist = $_REQUEST['artist'] ?? '';
$title = $_REQUEST['title'] ?? '';

// Nettoyage basique
$artist = trim($artist);
$title = trim($title);

if (empty($artist) && empty($title)) {
    die("Erreur : Pas de métadonnées fournies.");
}

$db = new AnalyticsDB();
$pdo = $db->getPDO();

// On récupère le nombre d'auditeurs actuel (le dernier log) pour l'associer au morceau
// Cela permettra de calculer la rétention plus tard
$stmt = $pdo->query("SELECT listeners FROM audience_logs ORDER BY id DESC LIMIT 1");
$currentListeners = $stmt->fetchColumn();
if ($currentListeners === false) $currentListeners = 0;

// Insertion
$now = date('Y-m-d H:i:s');
$stmt = $pdo->prepare("INSERT INTO play_history (timestamp, artist, title, listeners_start) VALUES (?, ?, ?, ?)");
$stmt->execute([$now, $artist, $title, $currentListeners]);

echo "Track loggé : $artist - $title ($currentListeners auditeurs) à $now";
?>
