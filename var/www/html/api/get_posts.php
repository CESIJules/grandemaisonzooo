<?php
// Définit l'en-tête pour s'assurer que le navigateur interprète le contenu comme du JSON.
header('Content-Type: application/json');
// Empêche la mise en cache du résultat par le navigateur.
header('Cache-Control: no-cache, must-revalidate');

// Le chemin vers notre fichier de stockage.
$file_path = 'timeline.json';

// Récupère le paramètre 'artist' de l'URL, s'il existe.
$artist_filter = isset($_GET['artist']) ? $_GET['artist'] : 'Tous';

// Vérifie si le fichier existe.
if (file_exists($file_path)) {
    // Lit le contenu du fichier.
    $json_content = file_get_contents($file_path);
    $posts = json_decode($json_content, true);

    // Si le filtre 'artist' est défini et n'est pas 'Tous', on filtre les posts.
    if ($artist_filter !== 'Tous') {
        $filtered_posts = array_filter($posts, function ($post) use ($artist_filter) {
            // Vérifie si la clé 'artist' existe et si sa valeur correspond au filtre.
            return isset($post['artist']) && $post['artist'] == $artist_filter;
        });
        // Ré-indexe le tableau pour s'assurer qu'il est bien un tableau JSON et non un objet.
        echo json_encode(array_values($filtered_posts));
    } else {
        // Sinon, on retourne tous les posts.
        echo json_encode($posts);
    }
} else {
    // Si le fichier n'existe pas, on renvoie un tableau vide.
    echo '[]';
}
?>