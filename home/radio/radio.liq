# Playlist principale : lit les fichiers du dossier musique
radio = playlist(mode="random", reload=30, "/home/radio/musique")

# Fonction enrichie et sécurisée pour les métadonnées
def enrich_metadata(m) =
  # 1. Logique de base pour le titre (préservée de l'original)
  title =
    if m["filename"] == "" then
      "GRANDE MAISON RADIO"
    else
      parts = string.split(separator="/", m["filename"])
      list.nth(default="GRANDE MAISON RADIO", parts, list.length(parts) - 1)
    end

  # 2. Essayer d'obtenir la durée de manière sécurisée
  duration = ref 0.
  if m["filename"] != "" then
    # Le 'try...catch' empêche le script de crasher si metadata_of échoue
    meta = try metadata_of(m["filename"]) catch _ do [] end
    # Le 'try...catch' gère les cas où la durée n'est pas un nombre valide
    duration := try float_of_string(meta["duration"]) catch _ do 0. end
  end

  # 3. Construire les métadonnées finales
  [
    ("title", title),
    ("artist", ""),
    ("duration", string_of_float(!duration)),
    ("startTime", string_of_int(int_of_float(time())))
  ]
end

# Application de la transformation des métadonnées
radio = map_metadata(enrich_metadata, radio)

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
