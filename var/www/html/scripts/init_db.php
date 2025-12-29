<?php
require_once __DIR__ . '/../includes/db.php';

$db = new AnalyticsDB();
$db->initTables();

echo "Base de données Analytics initialisée avec succès dans /var/www/data/analytics.db";
?>
