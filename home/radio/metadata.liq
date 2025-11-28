# Gestion des métadonnées : ajoute un titre et un artiste
radio = map_metadata(fun (meta) ->
  if not (string.is_empty(meta["filename"])) then
    # 1. On récupère le nom du fichier sans l'extension (ex: "Artiste_Nom-Titre_De_La_Chanson")
    let basename = file.basename(meta["filename"])

    # 2. On sépare le nom du fichier en deux parties avec le tiret "-"
    let parts = string.split(separator="-", basename)

    # 3. Si le nom de fichier contient bien un tiret
    if list.length(parts) == 2 then
      let artist_raw = list.nth(default="", parts, 0)
      let title_raw = list.nth(default="", parts, 1)

      # 4. On remplace les underscores "_" par des espaces pour l'artiste et le titre
      let artist_clean = string.replace(pattern="_", replace=" ", artist_raw)
      let title_clean = string.replace(pattern="_", replace=" ", title_raw)

      # 5. On assigne les métadonnées finales, nettoyées des espaces superflus
      meta["artist"] <- string.trim(artist_clean)
      meta["title"] <- string.trim(title_clean)
    else
      # 6. Si le format ne correspond pas, on nettoie au moins les underscores du titre
      meta["title"] <- string.replace(pattern="_", replace=" ", basename)
      meta["artist"] <- "GRANDE MAISON"
    end
  end
  meta
, radio)