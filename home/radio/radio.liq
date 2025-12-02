# Path to the playlist configuration file
playlist_config_file = "/home/radio/playlists.json"

# Function to get the active playlist songs
def get_active_playlist_songs()
  json_data = json.parse(file.read(playlist_config_file))

  active_playlist_name = json_data["active_playlist"]
  all_playlists = json_data["playlists"]

  if is_nil(active_playlist_name) or is_nil(all_playlists)
    log("No active playlist configured or playlists data missing. Falling back to random music directory playback.", level="warning")
    playlist(mode="random.smart", "/home/radio/musique")
  else
    found_playlist = false
    current_playlist_songs = []
    
    for p in all_playlists do
      if p["name"] == active_playlist_name then
        current_playlist_songs = p["songs"]
        found_playlist = true
        break
      end
    end

    if not found_playlist or list.length(current_playlist_songs) == 0 then
      log("Active playlist '" + active_playlist_name + "' not found or is empty. Falling back to random music directory playback.", level="warning")
      playlist(mode="random.smart", "/home/radio/musique")
    else
      log("Playing active playlist: " + active_playlist_name + " with " + (string_of(list.length(current_playlist_songs))) + " songs.", level="info")
      # Use `queue` to play songs in order, `playlist` to play randomly
      queue(id="active_playlist_queue", current_playlist_songs)
    end
  end
end

# Main radio source, re-evaluated when playlist_config_file changes
radio = get_active_playlist_songs()
radio = once(radio) # Ensure the source is re-evaluated only on changes to the config file

# Watch for changes in the playlist config file and re-evaluate the source
radio = switch(reopen(id="playlist_config_watcher", playlist_config_file, 1.), [radio])


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
radio = compress(threshold=-15.,ratio=4.,attack=0.2,release=1.,radio)


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
