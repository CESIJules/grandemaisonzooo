<?php
// get_duration.php

header('Content-Type: application/json');

// --- Configuration ---
// Chemin absolu vers le répertoire de musique. DOIT se terminer par un slash.
$musicDirectory = '/home/radio/musique/';

// --- Validation et Sécurité ---

// 1. Vérifier si le paramètre 'file' est présent
if (!isset($_GET['file']) || empty($_GET['file'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Filename parameter is missing.']);
    exit;
}

$fileName = $_GET['file'];

// 2. Nettoyage basique pour la sécurité (supprimer les tentatives de traversée de répertoire)
// basename() est une bonne protection car il supprime toutes les informations de chemin.
$sanitizedFileName = basename($fileName);

// 3. Reconstruire le chemin complet et vérifier son existence réelle
$fullPath = $musicDirectory . $sanitizedFileName;

// realpath() résout les '..' et autres, et retourne false si le fichier n'existe pas.
// On vérifie aussi qu'il est bien dans le dossier de musique attendu.
if (realpath($fullPath) === false || strpos(realpath($fullPath), $musicDirectory) !== 0) {
    http_response_code(404);
    echo json_encode(['error' => 'File not found or access denied.']);
    exit;
}

// --- Extraction de la durée avec ffprobe ---
// C'est la méthode la plus fiable si ffprobe (de FFmpeg) est installé.
// ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "CHEMIN_FICHIER"
$command = sprintf(
    'ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 %s',
    escapeshellarg($fullPath) // escapeshellarg est crucial pour la sécurité
);

// Exécuter la commande
$duration = shell_exec($command);

// --- Réponse ---

// Si la commande échoue ou retourne une valeur non numérique, on renvoie une erreur.
if ($duration === null || !is_numeric(trim($duration))) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to extract duration from file.', 'details' => 'Command output: ' . $duration]);
    exit;
}

// Succès : renvoyer la durée
echo json_encode(['duration' => floatval(trim($duration))]);

?>
