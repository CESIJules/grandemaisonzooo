# radio.liq - Simple and Robust Version

# This file contains the list of songs to play, one per line.
# It is generated and updated by the PHP admin panel.
playlist_file = "/home/radio/current.playlist"



# Create a playlist source that watches the playlist file for changes.
# If the playlist is empty or does not exist, it will wait for it.
radio = playlist(id="main_playlist", playlist_file, mode="random", reload_mode="watch")

# Fallback to a blank source in case the playlist is empty, to avoid errors.
radio = fallback(track_sensitive=false, [radio, blank(duration=10.)])

# --- Metadata and Processing ---
def set_title_artist(m)
  title =
    if m["filename"] == "" then
      "GRANDE MAISON RADIO"
    else
      parts = string.split(separator="/", m["filename"])
      filename = list.nth(default="", parts, list.length(parts) - 1)
      filename_parts = string.split(separator=".", filename)
      if list.length(filename_parts) > 1 then
        list.first(filename_parts)
      else
        filename
      end
    end
  [("title", title), ("artist", "")]
end

radio = map_metadata(set_title_artist, radio)
radio = compress(threshold=-15., ratio=4., attack=0.2, release=1., radio)

# --- Output to Icecast ---
output.icecast(
  %mp3,
  host     = "127.0.0.1",
  port     = 8000,
  password = "hacklaradio",
  mount    = "/stream",
  name     = "Radio GRANDE MAISON",
  description = "La radio de la Grande Maison",
  genre = "Various",
  url = "https://grandemaisonzoo.com",
  radio
)