# Playlist principale : lit les fichiers d'un dossier.
# Ce dossier sera un lien symbolique vers la playlist active.
radio = playlist(id="main_playlist", mode="random.smart", reload=30, "/home/radio/live-playlist")

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
  
  # --- ANALYTICS HOOK ---
  # Appel asynchrone au script PHP pour logger le morceau
  # On utilise url.encode pour eviter les problemes avec les caracteres speciaux
  ignore(http.get("http://127.0.0.1/scripts/log_track.php?artist=" ^ url.encode("") ^ "&title=" ^ url.encode(title)))
  # ----------------------

  [
    ("title",  title),
    ("artist", "")
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