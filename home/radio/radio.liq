# Playlist principale : lit les fichiers d'un dossier.
# Ce dossier sera un lien symbolique vers la playlist active.
radio = playlist(id="main_playlist", mode="random.smart", reload=30, "/home/radio/live-playlist")

# Fonction de mise a jour des metadonnees
def set_title_artist(m) =
  # Recupere le nom du fichier (sans le chemin)
  filename =
    if m["filename"] == "" then
      "GRANDE MAISON RADIO"
    else
      parts = string.split(separator="/", m["filename"])
      list.nth(parts, list.length(parts) - 1)
    end
  
  # Supprime l'extension (.mp3, .wav, etc.)
  filename_no_ext = string.replace(pattern="\\.mp3$|\\.wav$|\\.flac$|\\.m4a$|\\.ogg$", (fun (_) -> ""), filename)
  
  # Essaye de parser "Artiste - Titre" ou utilise le nom complet comme titre
  artist = ""
  title = filename_no_ext
  
  # Si le fichier contient " - ", on split pour avoir Artiste et Titre
  if string.contains(substring=" - ", filename_no_ext) then
    parts = string.split(separator=" - ", filename_no_ext)
    artist := list.nth(parts, 0)
    title := list.nth(parts, 1)
  end
  
  # --- ANALYTICS HOOK ---
  # Appel robuste via curl (plus fiable que http.get)
  # On encode les parametres pour eviter les problemes avec les caracteres speciaux
  cmd = "curl -s -o /dev/null 'http://127.0.0.1/scripts/log_track.php?artist=" ^ url.encode(artist) ^ "&title=" ^ url.encode(title) ^ "'"
  ignore(process.run(cmd))
  # ----------------------

  [
    ("title",  title),
    ("artist", artist)
  ]
end

# Application a chaque morceau
radio = map_metadata(set_title_artist, radio)

# Securite : silence si playlist vide
radio = fallback(id="radio", track_sensitive=false, [radio, blank()]) 

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

# Configuration du serveur telnet pour le controle a distance
settings.server.telnet.set(true)
settings.server.telnet.bind_addr.set("127.0.0.1")
settings.server.telnet.port.set(1234)