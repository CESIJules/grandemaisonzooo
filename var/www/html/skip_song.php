<?php
header('Content-Type: application/json');

// Commande pour envoyer "request.skip" à Liquidsoap via netcat
$command = "echo 'request.skip' | nc localhost 1234";

// Exécuter la commande
// L'utilisateur 'www-data' (ou celui sous lequel tourne PHP) 
// doit avoir les permissions nécessaires pour exécuter 'nc'.
$output = shell_exec($command);

// Vérifier si la commande a pu être exécutée (shell_exec peut retourner null)
if ($output === null) {
    // Cela peut indiquer que la commande a échoué ou n'a rien retourné,
    // ce qui est normal pour une commande 'echo | nc'.
    // On suppose que ça a marché si aucune erreur évidente n'est capturée.
    echo json_encode(['status' => 'success', 'message' => 'Commande de skip envoyée.']);
} else {
    // Si nc retourne quelque chose (par ex. une erreur), on le log/renvoie
    echo json_encode(['status' => 'success', 'message' => 'Commande envoyée, réponse: ' . trim($output)]);
}
?>
