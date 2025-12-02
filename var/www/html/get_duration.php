<?php
// --- CONFIGURATION ---
// Chemin vers le répertoire de musique, confirmé depuis votre version précédente.
$music_directory = '/home/radio/musique/'; 

// URL du statut JSON d'Icecast.
$icecast_status_url = 'http://127.0.0.1:8000/status-json.xsl';

// Fichier temporaire pour stocker les informations sur la piste en cours.
// Le serveur web (nginx/apache) doit avoir le droit d'écrire dans ce dossier. /tmp/ est généralement un bon choix.
$track_info_file = '/tmp/radio_track_info.json';

// --- LOGIQUE PRINCIPALE ---
header('Content-Type: application/json');

// Prépare la structure de la réponse. server_now est toujours l'heure actuelle du serveur.
$response_data = [
    'duration' => null,
    'start_time' => null,
    'server_now' => time(),
    'error' => null
];

try {
    // 1. Récupérer les informations d'Icecast pour trouver la piste actuelle
    // On ajoute un paramètre 'nocache' pour éviter que le navigateur ou un proxy ne mette en cache la réponse.
    $icecast_json = @file_get_contents($icecast_status_url . '?nocache=' . time());
    if ($icecast_json === false) {
        throw new Exception('Impossible de contacter le serveur Icecast à l\'adresse: ' . $icecast_status_url);
    }

    $icecast_data = json_decode($icecast_json, true);
    
    // Naviguer dans la structure JSON d'Icecast pour trouver le titre
    $current_track_filename = null;
    if (isset($icecast_data['icestats']['source']) && is_array($icecast_data['icestats']['source'])) {
         // Cas où plusieurs flux sont définis
        foreach($icecast_data['icestats']['source'] as $source) {
            if (isset($source['listenurl']) && strpos($source['listenurl'], '/stream') !== false && isset($source['title'])) {
                 $current_track_filename = $source['title'];
                 break;
            }
        }
    } elseif (isset($icecast_data['icestats']['source']['title'])) {
        // Cas où il n'y a qu'un seul flux
        $current_track_filename = $icecast_data['icestats']['source']['title'];
    }


    if (!$current_track_filename) {
        throw new Exception('Aucune piste en cours de lecture selon Icecast.');
    }

    // 2. Gérer le fichier de suivi pour déterminer l'heure de début
    $track_info = [];
    if (file_exists($track_info_file)) {
        $track_info = json_decode(file_get_contents($track_info_file), true);
    }

    // 3. Vérifier si la piste a changé depuis la dernière exécution
    if (!isset($track_info['filename']) || $track_info['filename'] !== $current_track_filename) {
        // La piste a changé. On enregistre le nom du nouveau fichier et l'heure actuelle comme heure de début.
        $track_info = [
            'filename' => $current_track_filename,
            'start_time' => time(),
        ];
        // On écrit ces informations dans notre fichier de suivi.
        file_put_contents($track_info_file, json_encode($track_info));
    }

    // 4. On a maintenant l'heure de début, on la met dans notre réponse.
    $response_data['start_time'] = $track_info['start_time'];

    // 5. Obtenir la durée du fichier, en réutilisant la logique sécurisée de votre script original
    
    // basename() supprime toutes les informations de chemin pour la sécurité.
    $sanitizedFileName = basename($current_track_filename);
    $fullPath = $music_directory . $sanitizedFileName;

    // realpath() résout les '..' et retourne false si le fichier n'existe pas.
    // On vérifie qu'il est bien dans le dossier de musique attendu pour éviter toute faille de sécurité.
    $real_music_dir = realpath($music_directory);
    $real_filepath = realpath($fullPath);

    if ($real_filepath === false || strpos($real_filepath, $real_music_dir) !== 0) {
       throw new Exception('Fichier non trouvé ou accès non autorisé.');
    }
    
    // Commande pour ffprobe
    $command = sprintf(
        'ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 %s',
        escapeshellarg($real_filepath) // escapeshellarg() est crucial pour la sécurité
    );

    $duration = shell_exec($command);

    if ($duration === null || !is_numeric(trim($duration))) {
        throw new Exception('Impossible d\'extraire la durée du fichier avec ffprobe.');
    }

    $response_data['duration'] = floatval(trim($duration));

} catch (Exception $e) {
    // En cas d'erreur, on l'ajoute à la réponse pour le débogage.
    $response_data['error'] = $e->getMessage();
}

// 6. Envoyer la réponse JSON finale
echo json_encode($response_data);

?>