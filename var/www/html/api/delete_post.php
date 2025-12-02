<?php
header('Content-Type: application/json');

// 1. Vérifier la méthode de la requête
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); // Méthode non autorisée
    echo json_encode(['status' => 'error', 'message' => 'Méthode non autorisée.']);
    exit;
}

$file_path = 'timeline.json';

try {
    // 2. Récupérer l'ID du post à supprimer
    $request_body = file_get_contents('php://input');
    $data = json_decode($request_body, true);
    $post_id = $data['id'] ?? null;

    if (!$post_id) {
        http_response_code(400); // Mauvaise requête
        echo json_encode(['status' => 'error', 'message' => 'ID du post manquant.']);
        exit;
    }

    // 3. Lire le fichier JSON
    if (!file_exists($file_path) || !is_readable($file_path)) {
        throw new Exception('Impossible de lire le fichier timeline.');
    }
    $current_content = file_get_contents($file_path);
    $timeline = json_decode($current_content, true);

    if (!is_array($timeline)) {
        throw new Exception('Le fichier timeline est corrompu ou mal formaté.');
    }

    // 4. Filtrer le tableau pour supprimer le post
    $post_found = false;
    // Note: l'ID peut être un entier ou une chaîne, une comparaison non-stricte (==) est plus sûre.
    $updated_timeline = array_filter($timeline, function($post) use ($post_id, &$post_found) {
        if (isset($post['id']) && $post['id'] == $post_id) {
            $post_found = true;
            return false; // Ne pas inclure ce post
        }
        return true; // Conserver ce post
    });

    if (!$post_found) {
        http_response_code(404); // Non trouvé
        echo json_encode(['status' => 'error', 'message' => 'Post non trouvé.']);
        exit;
    }

    // Re-indexer le tableau pour éviter les clés discontinues après array_filter
    $updated_timeline = array_values($updated_timeline);

    // 5. Réécrire le fichier JSON mis à jour
    $write_result = file_put_contents($file_path, json_encode($updated_timeline, JSON_PRETTY_PRINT), LOCK_EX);

    if ($write_result === false) {
        throw new Exception('Impossible d\'écrire dans le fichier timeline.');
    }

    // 6. Renvoyer une réponse de succès
    echo json_encode(['status' => 'success', 'message' => 'Post supprimé avec succès.']);

} catch (Exception $e) {
    http_response_code(500); // Erreur interne du serveur
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>