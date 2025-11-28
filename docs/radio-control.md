# Documentation - Contrôle de la Radio GRANDE MAISON

## Vue d'ensemble

Ce système permet de contrôler la radio Liquidsoap depuis le panel d'administration existant. Il ajoute une file d'attente contrôlable qui a priorité sur la playlist par défaut.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Admin Panel   │────▶│    PHP API       │────▶│   Liquidsoap    │
│   (admin.html)  │     │  (radio_api.php) │     │   (radio.liq)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
       │                        │                        │
       │ HTTP/AJAX              │ Telnet                 │ Icecast
       │                        │ (port 1234)            │ (port 8000)
       ▼                        ▼                        ▼
```

## Fichiers modifiés/ajoutés

### Liquidsoap
- `home/radio/radio.liq` - Modifié pour ajouter:
  - Serveur telnet local (port 1234)
  - File d'attente (`request.queue`)
  - Priorité de la queue sur la playlist fallback

### PHP API
- `var/www/html/radio_config.php` - Configuration (token, ports)
- `var/www/html/radio_api.php` - API de contrôle

### Panel Admin
- `var/www/html/admin.html` - Section "Gestion Radio" ajoutée
- `var/www/html/admin.js` - Fonctions JavaScript pour le contrôle

## Fonctionnalités

### 1. Passer au morceau suivant (Skip)
- Bouton "NEXT (Passer)" dans l'admin
- Commande API: `GET/POST radio_api.php?action=skip&token=TOKEN`
- Passe au prochain morceau dans la queue ou la playlist

### 2. Voir la file d'attente
- Affichage automatique dans le panel admin
- Rafraîchissement automatique toutes les 30 secondes
- Bouton de rafraîchissement manuel
- Commande API: `GET radio_api.php?action=queue&token=TOKEN`

### 3. Ajouter un morceau à la file
- Menu déroulant avec tous les fichiers musicaux
- Bouton "Ajouter à la file"
- Commande API: `POST radio_api.php?action=push`
  - Body JSON: `{"filename": "nom_du_fichier.mp3"}`

## Configuration

### Authentification
L'API utilise deux mécanismes d'authentification:

1. **Referer (panel admin)**: Les appels depuis le même domaine sont autorisés
2. **Token (intégrations externes)**: Utiliser le header `X-Radio-Token` ou le paramètre `token`

Le token API est défini dans `var/www/html/radio_config.php`:
```php
define('RADIO_API_TOKEN', 'grandemaison_radio_token_2024');
```

Pour changer le token, modifier uniquement `radio_config.php`.

### Ports et adresses
Configuration par défaut dans `radio_config.php`:
- Telnet Liquidsoap: `127.0.0.1:1234`
- Timeout connexion: 5 secondes
- Répertoire musique: `/home/radio/musique/`

## Commandes Telnet Liquidsoap

Si vous devez interagir manuellement avec Liquidsoap:

```bash
# Connexion telnet
telnet 127.0.0.1 1234

# Commandes disponibles
queue.push /chemin/vers/fichier.mp3  # Ajouter à la file
queue.queue                           # Voir la file d'attente
queue.skip                            # Passer le morceau actuel
help                                  # Liste des commandes
quit                                  # Quitter
```

## Sécurité

- Le serveur telnet écoute uniquement sur `127.0.0.1` (localhost)
- L'API PHP utilise la vérification du Referer (même origine) pour les appels du panel admin
- Un token peut être utilisé pour les intégrations externes (header X-Radio-Token ou paramètre token)
- Protection contre les attaques path traversal (basename validation)
- Pas d'accès direct externe au telnet
- Limite de boucle sur la lecture socket pour éviter les blocages

## Maintenance

### Redémarrage de Liquidsoap
```bash
sudo systemctl restart liquidsoap
# ou
sudo service liquidsoap restart
```

### Logs
- Logs Liquidsoap: `/var/log/liquidsoap/`
- Logs Icecast: `/var/log/icecast2/`
- Logs PHP: vérifier la configuration PHP pour l'emplacement

### Dépannage

#### La file d'attente ne s'affiche pas
1. Vérifier que Liquidsoap est démarré
2. Vérifier que le serveur telnet est actif: `netstat -tlnp | grep 1234`
3. Tester la connexion: `telnet 127.0.0.1 1234`

#### Erreur "Connexion impossible à Liquidsoap"
1. Redémarrer Liquidsoap
2. Vérifier les logs pour les erreurs
3. S'assurer que le port 1234 n'est pas bloqué par un firewall local

#### Le morceau ne se passe pas
- La commande skip peut ne pas avoir d'effet visible si la queue est vide
- Le prochain morceau de la playlist sera joué automatiquement

## Comportement de la lecture

1. **Queue prioritaire**: Si des morceaux sont dans la file d'attente, ils sont joués en premier
2. **Playlist fallback**: Quand la queue est vide, la playlist par défaut reprend (lecture aléatoire)
3. **Silence en dernier recours**: Si tout échoue, silence (blank)

## API Reference

### GET /radio_api.php?action=skip&token=TOKEN
Passe au morceau suivant.

**Réponse succès:**
```json
{"status": "success", "message": "Morceau passé avec succès."}
```

### GET /radio_api.php?action=queue&token=TOKEN
Retourne la file d'attente actuelle.

**Réponse:**
```json
{
  "status": "success",
  "queue": [
    {"path": "/home/radio/musique/fichier.mp3", "filename": "fichier.mp3"}
  ]
}
```

### POST /radio_api.php?action=push&token=TOKEN
Ajoute un morceau à la file d'attente.

**Body:**
```json
{"filename": "nom_du_fichier.mp3"}
```

**Réponse succès:**
```json
{"status": "success", "message": "\"nom_du_fichier.mp3\" ajouté à la file d'attente."}
```

### Codes d'erreur HTTP
- `400`: Requête invalide (action manquante, fichier non fourni)
- `401`: Token invalide ou manquant
- `404`: Fichier non trouvé
- `500`: Erreur serveur (connexion Liquidsoap impossible)
