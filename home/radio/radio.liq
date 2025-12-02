# radio.liq

# Path to the playlist configuration file
playlist_config_file = "/var/www/html/playlist.json"

# A function that creates a source based on the active playlist.
# This function will be called by a factory to create new sources on-demand.
def create_playlist_source()
  log("Checking for active playlist...")
  # Default to an empty playlist if file is invalid
  json_data = try file.read(playlist_config_file) catch e do "" end
  if json_data == "" then
    log("Could not read or parse playlist.json. Falling back to random music.", level="error")
    playlist(id="fallback_playlist", mode="random", reload_mode="watch", "/home/radio/musique")
  else
    json = json.parse(json_data)
    active_playlist_name = json["active_playlist"]
    all_playlists = json["playlists"]

    # Check if an active playlist is set
    if is_nil(active_playlist_name) or active_playlist_name == "" then
      log("No active playlist set. Falling back to random music.", level="info")
      playlist(id="fallback_playlist", mode="random", reload_mode="watch", "/home/radio/musique")
    else
      # Find the playlist and its songs
      found_playlist = list.find(fun(p) p["name"] == active_playlist_name end, all_playlists)

      if is_nil(found_playlist) or list.length(found_playlist["songs"]) == 0 then
        log(level="warning", "Active playlist '" + active_playlist_name + "' not found or is empty. Falling back to random music.")
        playlist(id="fallback_playlist", mode="random", reload_mode="watch", "/home/radio/musique")
      else
        log(level="info", "Loading active playlist: '" + active_playlist_name + "' with " + string_of(list.length(found_playlist["songs"])) + " songs.")
        # Create a playlist source from the list of songs.
        # Using a queue to play in order. Use playlist() for random.
        queue(id="dynamic_playlist", found_playlist["songs"])
      end
    end
  end
end

# Create a factory that can produce new playlist sources whenever we need one.
radio_factory = source.factory(create_playlist_source)

# Create a clock that "ticks" whenever the playlist configuration file is modified.
playlist_update_clock = file.watch(playlist_config_file)

# The main radio source. It starts with an initial source from the factory.
# The switch will transition to a *new* source from the same factory every time
# the playlist_update_clock ticks. `track_sensitive=false` ensures a smooth transition.
radio = switch(
  track_sensitive=false,
  transitions=[(playlist_update_clock, radio_factory)],
  radio_factory
)

# --- Metadata and Processing ---

# Function to update metadata
def set_title_artist(m)
  title =
    if m["filename"] == "" then
      "GRANDE MAISON RADIO"
    else
      # Extract filename from the full path
      parts = string.split(separator="/", m["filename"])
      filename = list.nth(default="", parts, list.length(parts) - 1)
      # Remove extension safely
      filename_parts = string.split(separator=".", filename)
      if list.length(filename_parts) > 1 then
        list.first(filename_parts)
      else
        filename
      end
    end
  [("title", title), ("artist", "")]
end

# Apply metadata mapping
radio = map_metadata(set_title_artist, radio)

# Safety net: play silence if the source is empty for some reason
radio = fallback(track_sensitive=false, [radio, blank(duration=5.)])

# Apply compression
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
