<?php
// get_duration.php

header('Content-Type: application/json');

// Le répertoire où se trouvent les fichiers de musique
$musicDir = '/home/radio/musique/';

// Récupérer le titre depuis la requête GET
$trackTitle = isset($_GET['title']) ? trim($_GET['title']) : '';

if (empty($trackTitle)) {
    echo json_encode(['error' => 'No title provided']);
    exit;
}

// Fonction pour "nettoyer" un nom de fichier ou un titre pour la comparaison
function normalizeTitle($str) {
    // Supprimer l'extension
    $str = preg_replace('/\.[^.\/]+$/', '', $str);
    // Remplacer les underscores par des espaces
    $str = str_replace('_', ' ', $str);
    // Normaliser les espaces autour des tirets
    $str = preg_replace('/\s*-\s*/', ' - ', $str);
    // Mettre en majuscules pour une comparaison insensible à la casse
    $str = strtoupper($str);
    // Supprimer les espaces multiples
    $str = preg_replace('/\s+/', ' ', $str);
    return trim($str);
}

$normalizedRequestTitle = normalizeTitle($trackTitle);
$bestMatchFile = null;

try {
    $dirIterator = new DirectoryIterator($musicDir);
    foreach ($dirIterator as $fileinfo) {
        if ($fileinfo->isFile() && in_array(strtolower($fileinfo->getExtension()), ['mp3', 'wav', 'flac', 'ogg', 'm4a'])) {
            $filename = $fileinfo->getFilename();
            $normalizedFilename = normalizeTitle($filename);

            // Comparaison simple pour commencer
            if ($normalizedFilename === $normalizedRequestTitle) {
                $bestMatchFile = $fileinfo->getPathname();
                break;
            }
        }
    }

    if ($bestMatchFile) {
        // Utiliser ffprobe pour obtenir la durée. C'est plus fiable.
        // Assurez-vous que ffprobe est installé et dans le PATH du serveur.
        $command = "ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 " . escapeshellarg($bestMatchFile);
        $duration = shell_exec($command);

        if ($duration) {
            echo json_encode(['duration' => floatval($duration)]);
        } else {
            echo json_encode(['error' => 'Could not get duration using ffprobe.']);
        }
    } else {
        echo json_encode(['error' => 'Track not found', 'searched_for' => $normalizedRequestTitle]);
    }

} catch (Exception $e) {
    echo json_encode(['error' => 'Error accessing music directory: ' . $e->getMessage()]);
}

