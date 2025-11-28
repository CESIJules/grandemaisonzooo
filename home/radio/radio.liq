# Playlist principale : lit les fichiers du dossier musique
radio = playlist(mode="random", reload=30, "/home/radio/musique")

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

  # --- NOUVEAU : Export des données du morceau ---
  # Récupération de la durée (en secondes), avec une valeur par défaut de 0.0
  duration = m["duration"] or 0.0
  # Récupération du timestamp UNIX actuel
  started_at = time()

  # Création du contenu JSON. On échappe les guillemets dans le titre.
  json_title = string.replace(pattern='"', replacement='\\"', title)
  json_payload = "{ \"title\": \"#{json_title}\", \"duration\": #{duration}, \"started_at\": #{started_at} }"

  # Écriture du JSON dans un fichier accessible par le serveur web
  # La commande 'ignore' est utilisée car system() retourne une valeur que nous ne voulons pas mixer avec le flux audio.
  ignore(system("echo '#{json_payload}' > /var/www/html/track_info.json"))
  # --- FIN NOUVEAU ---

  [
    ("title",  title),
    ("artist", "")
  ]
end

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
