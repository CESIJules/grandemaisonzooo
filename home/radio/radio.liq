# Configuration du serveur telnet pour le controle a distance
settings.server.telnet.set(true)
settings.server.telnet.bind_addr.set("127.0.0.1")
settings.server.telnet.port.set(1234)

# File d'attente pour les requetes manuelles
requests = request.queue()

# Playlist principale : lit les fichiers du dossier musique
playlist_source = playlist(mode="random", reload=30, "/home/radio/musique")

# Fonction de mise a jour des metadonnees
def set_title_artist(m) =
  # Calcul du titre a partir du chemin de fichier
  title =
    if m["filename"] == "" then
      "GRANDE MAISON RADIO"
    else
      parts = string.split(separator="/", m["filename"])
      list.nth(parts, list.length(parts) - 1)
    end
  [
    ("title",  title),
    ("artist", "")
  ]
end

# Combinaison : priorite aux requetes, fallback sur la playlist
radio = fallback(track_sensitive=true, [requests, playlist_source])

# Application a chaque morceau
radio = map_metadata(set_title_artist, radio)

# Securite : silence si playlist vide
radio = fallback(track_sensitive=false, [radio, blank()])

# Variable pour stocker la source finale avec skip
radio_output = source.on_track(radio, fun(m) -> log("Now playing: #{m["filename"]}"))

# Diffusion vers Icecast
output_radio = output.icecast(
  %mp3,
  host     = "127.0.0.1",
  port     = 8000,
  password = "hacklaradio",
  mount    = "/stream",
  name     = "Radio GRANDE MAISON",
  radio_output
)

# Commande pour passer au morceau suivant
def skip_song(_) =
  source.skip(radio_output)
  "Song skipped"
end
server.register("skip", skip_song)

# Commande pour ajouter une chanson a la file d'attente
def queue_push(uri) =
  r = request.create(uri)
  if request.resolve(r) then
    requests.push(r)
    "Queued: #{uri}"
  else
    request.destroy(r)
    "Failed to queue: #{uri}"
  end
end
server.register("queue.push", queue_push)

# Commande pour obtenir la taille de la file d'attente
def queue_length(_) =
  "#{requests.length()}"
end
server.register("queue.length", queue_length)
