# radio.liq - Ultra Minimal Test

# Directly use the path, no variable.
radio = playlist(id="main_playlist", "/home/radio/current.playlist", mode="random", reload_mode="watch")

# Output directly to Icecast. No other processing.
output.icecast(
  %mp3,
  host     = "127.0.0.1",
  port     = 8000,
  password = "hacklaradio",
  mount    = "/stream",
  name     = "Radio Test",
  radio
)
