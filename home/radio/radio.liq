# Playlist principale : lit les fichiers du dossier musique
radio = playlist(mode="random", reload=30, "/home/radio/musique")

# Fonction pour ajouter la durée et le temps de début aux métadonnées
def add_track_metadata(m) =
  # Extraction de la durée via ffprobe (metadata_of)
  meta = metadata_of(m["uri"])
  duration = try meta["duration"] catch _ do 0. end
  
  # Récupération du nom de fichier propre
  parts = string.split(separator="/", m["filename"])
  title = list.nth(default="", parts, list.length(parts) - 1)

  # Ajoute la durée et le timestamp de début aux métadonnées
  [
    ("title", title),
    ("artist", ""),
    ("duration", string(duration)),
    ("startTime", string(time()))
  ]
end

# Application de la transformation des métadonnées
radio = map_metadata(add_track_metadata, radio)

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
