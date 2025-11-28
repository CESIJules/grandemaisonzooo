# Configuration du serveur telnet pour le controle externe
settings.server.telnet := true
settings.server.telnet.bind_addr := "127.0.0.1"
settings.server.telnet.port := 1234

# Playlist principale : lit les fichiers du dossier musique (fallback)
playlist_fallback = playlist(mode="random", reload=30, "/home/radio/musique")

# File d'attente pour les requetes externes
queue = request.queue(id="queue")

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

# Combinaison : queue prioritaire, puis playlist fallback
radio = fallback(track_sensitive=true, [queue, playlist_fallback])

# Application a chaque morceau
radio = map_metadata(set_title_artist, radio)

# Securite : silence si playlist vide
radio = fallback(track_sensitive=false, [radio, blank()])

# Diffusion vers Icecast
output.icecast(
  %mp3,
  host     = "127.0.0.1",
  port     = 8000,
  password = "hacklaradio",
  mount    = "/stream",
  name     = "Radio GRANDE MAISON",
  radio
)
