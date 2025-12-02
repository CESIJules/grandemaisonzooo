# Playlist principale : lit les fichiers d'un dossier.
# Ce dossier sera un lien symbolique vers la playlist active.
radio = playlist(mode="random.smart", reload=30, "/home/radio/live-playlist")

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

# Application a chaque morceau
radio = map_metadata(set_title_artist, radio)

# Securite : silence si playlist vide
radio = fallback(track_sensitive=false, [radio, blank()])
radio = limit(source, threshold = -3, attack = 1.0, release = 25.0, rms_window = 0.02)   

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