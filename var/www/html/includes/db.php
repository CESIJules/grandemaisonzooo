<?php
class AnalyticsDB {
    private $dbPath;
    private $pdo;

    public function __construct() {
        // Le fichier .db est stocké en dehors du dossier html pour la sécurité (si possible)
        // Ici on le met dans var/www/data/
        $this->dbPath = __DIR__ . '/../../data/analytics.db';
        
        // Création du dossier si inexistant
        $dir = dirname($this->dbPath);
        if (!is_dir($dir)) {
            mkdir($dir, 0777, true);
        }
        
        try {
            $this->pdo = new PDO("sqlite:" . $this->dbPath);
            $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            die("Erreur de connexion BDD Analytics : " . $e->getMessage());
        }
    }

    public function getPDO() {
        return $this->pdo;
    }
    
    public function initTables() {
        // Table Audience (Logs toutes les X minutes)
        $this->pdo->exec("CREATE TABLE IF NOT EXISTS audience_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            listeners INTEGER,
            peak_listeners INTEGER
        )");

        // Table Historique des morceaux
        $this->pdo->exec("CREATE TABLE IF NOT EXISTS play_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            artist TEXT,
            title TEXT,
            listeners_start INTEGER
        )");
        
        // Index pour accélérer les recherches par date
        $this->pdo->exec("CREATE INDEX IF NOT EXISTS idx_audience_time ON audience_logs(timestamp)");
        $this->pdo->exec("CREATE INDEX IF NOT EXISTS idx_history_time ON play_history(timestamp)");
    }
}
?>
