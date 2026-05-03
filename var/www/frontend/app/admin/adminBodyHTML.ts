// Auto-extracted from admin.html body
// Used with dangerouslySetInnerHTML in admin/page.tsx
const adminBodyHTML: string = String.raw`
    <button class="mobile-menu-toggle" id="mobileMenuToggle" aria-label="Toggle menu">
        <i class="fas fa-bars"></i>
    </button>
    <div class="sidebar-overlay" id="sidebarOverlay"></div>
    <nav class="admin-sidebar" id="adminSidebar">
        <div class="sidebar-header">GMZ ADMIN</div>
        <div class="sidebar-nav">
            <ul>
                <li><a href="#" class="nav-link active" data-section="timeline"><i class="fas fa-stream"></i> Timeline</a></li>
                <li><a href="#" class="nav-link" data-section="analytics"><i class="fas fa-chart-line"></i> Analytics</a></li>
                <li><a href="#" class="nav-link" data-section="artists"><i class="fas fa-users"></i> Artistes</a></li>
                <li><a href="#" class="nav-link" data-section="music"><i class="fas fa-music"></i> Musique</a></li>
                <li><a href="#" class="nav-link" data-section="playlists"><i class="fas fa-list-ol"></i> Playlists</a></li>
            </ul>
        </div>
        <div class="sidebar-footer">
            <div class="sidebar-user-info">
                <div class="sidebar-user-avatar" id="sidebarUserAvatar">?</div>
                <div class="sidebar-user-details">
                    <div class="sidebar-user-name" id="sidebarUserName">Chargement...</div>
                    <div class="sidebar-user-role" id="sidebarUserRole">-</div>
                </div>
            </div>
            <button id="logoutBtn" class="btn btn-danger" style="width: 100%;"><i class="fas fa-sign-out-alt"></i> Logout</button>
        </div>
    </nav>
    <main class="admin-main-content">
        <!-- SECTION: TIMELINE -->
        <section id="timeline" class="admin-section active">
            <div class="section-header">
                <h2>Timeline</h2>
            </div>
            
            <!-- Posts List -->
            <div class="modern-table-container">
                <div class="modern-table-header">
                    <h3><i class="fas fa-stream"></i> Posts publiés</h3>
                    <div class="modern-table-search">
                        <div class="posts-view-toggle">
                            <button id="viewGridBtn" class="active" title="Vue grille"><i class="fas fa-th-large"></i></button>
                            <button id="viewListBtn" title="Vue liste"><i class="fas fa-list"></i></button>
                        </div>
                        <select id="postArtistFilter" style="background: rgba(255,255,255,0.05); border: 1px solid var(--surface-border); border-radius: 8px; padding: 10px 16px; color: var(--text-primary); font-size: 0.9rem;"></select>
                        <button type="button" class="btn btn-primary" id="openAddPostModal"><i class="fas fa-plus"></i> Nouveau post</button>
                    </div>
                </div>
                <div class="modern-table-content posts-grid" id="postsManagementContainer">
                    <!-- Posts générés dynamiquement -->
                </div>
            </div>
            
            <!-- Modal Add/Edit Post -->
            <div id="postModal" class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 id="postModalTitle" class="modal-title">Nouveau post</h3>
                        <button class="modal-close" id="closePostModal">&times;</button>
                    </div>
                    <form id="adminTimelineForm">
                        <div class="modal-body">
                            <div class="form-grid">
                                <div class="form-group">
                                    <label for="postTitle">Titre du Projet</label>
                                    <input type="text" id="postTitle" name="title" placeholder="Ex: Single - Nom du titre" required>
                                    <small style="color: var(--text-secondary); font-size: 0.75rem;">Le type (Single, EP, Album, Clip, Mixtape, Flip) est détecté automatiquement</small>
                                </div>
                                <div class="form-group">
                                    <label for="postArtist">Artiste</label>
                                    <select id="postArtist" name="artist" required></select>
                                </div>
                                <div class="form-group">
                                    <label for="postDate">Date</label>
                                    <input type="date" id="postDate" name="date" required>
                                </div>
                                <div class="form-group">
                                    <label for="postLink">Lien (optionnel)</label>
                                    <input type="url" id="postLink" name="link" placeholder="https://...">
                                </div>
                                <div class="form-group" style="grid-column: 1 / -1;">
                                    <label for="postImage">Image du post</label>
                                    <input type="file" id="postImage" name="image" accept=".jpg, .jpeg, .png, .gif, .webp">
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <span id="adminFormMessage" class="form-message"></span>
                            <div class="form-actions">
                                <button type="button" class="btn btn-secondary" id="cancelPostModal">Annuler</button>
                                <button type="submit" class="btn btn-primary"><i class="fas fa-check"></i> Publier</button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </section>

        <!-- SECTION: ARTISTES -->
        <section id="artists" class="admin-section">
            <div class="section-header">
                <h2>Artistes</h2>
                <button type="button" class="btn btn-primary" id="openAddArtistModal"><i class="fas fa-plus"></i> Nouvel artiste</button>
            </div>
            
            <!-- Artists Grid -->
            <div id="artistsManagementContainer" class="artists-grid">
                <!-- Artistes générés dynamiquement -->
            </div>
            
            <!-- Modal Add/Edit Artist -->
            <div id="artistModal" class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 id="artistModalTitle" class="modal-title">Nouvel artiste</h3>
                        <button class="modal-close" id="closeArtistModal">&times;</button>
                    </div>
                    <form id="adminArtistForm">
                        <input type="hidden" name="editingArtistId" id="editingArtistId">
                        <div class="modal-body">
                            <div class="form-grid">
                                <div class="form-group">
                                    <label for="artistName">Nom de Scène</label>
                                    <input type="text" id="artistName" name="name" placeholder="Ex: Nelson North" required>
                                </div>
                                <div class="form-group">
                                    <label for="artistLocation">Localisation</label>
                                    <input type="text" id="artistLocation" name="location" placeholder="Ex: Nice, France">
                                </div>
                                <div class="form-group">
                                    <label for="artistListenLink">Lien Écouter</label>
                                    <input type="url" id="artistListenLink" name="listenLink" placeholder="Spotify, Apple Music...">
                                </div>
                                <div class="form-group">
                                    <label for="artistWatchLink">Lien Regarder</label>
                                    <input type="url" id="artistWatchLink" name="watchLink" placeholder="YouTube...">
                                </div>
                                <div class="form-group">
                                    <label for="artistInstagramLink">Instagram</label>
                                    <input type="url" id="artistInstagramLink" name="instagramLink" placeholder="https://instagram.com/...">
                                </div>
                                <div class="form-group">
                                    <label for="artistImage">Photo</label>
                                    <input type="file" id="artistImage" name="image" accept=".jpg, .jpeg, .png, .gif, .webp">
                                    <input type="hidden" id="currentArtistImage" name="currentImage">
                                </div>
                            </div>
                            <div id="artistImagePreview" style="margin-top: 16px;"></div>
                        </div>
                        <div class="modal-footer">
                            <span id="artistFormMessage" class="form-message"></span>
                            <div class="form-actions">
                                <button type="button" class="btn btn-secondary" id="cancelArtistModal">Annuler</button>
                                <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Enregistrer</button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </section>

        <!-- SECTION ANALYTICS -->
        <section id="analytics" class="admin-section" style="display: none;">
            <h2>Analytics</h2>
            
            <!-- Enhanced KPIs -->
            <div class="analytics-kpi-grid">
                <div class="analytics-kpi-card" style="--kpi-color: #a855f7; --kpi-color-rgb: 0, 255, 104;">
                    <div class="analytics-kpi-header">
                        <div class="analytics-kpi-icon"><i class="fas fa-chart-line"></i></div>
                        <div class="analytics-kpi-label">Pic d'audience (30j)</div>
                    </div>
                    <div class="analytics-kpi-value" id="statPeak">0</div>
                    <div class="analytics-kpi-comparison neutral" id="statPeakComparison">
                        <i class="fas fa-minus"></i> <span>vs mois dernier</span>
                    </div>
                </div>
                <div class="analytics-kpi-card" style="--kpi-color: #3b82f6; --kpi-color-rgb: 59, 130, 246;">
                    <div class="analytics-kpi-header">
                        <div class="analytics-kpi-icon"><i class="fas fa-users"></i></div>
                        <div class="analytics-kpi-label">Moyenne (24h)</div>
                    </div>
                    <div class="analytics-kpi-value" id="statAvg">0</div>
                    <div class="analytics-kpi-comparison neutral" id="statAvgComparison">
                        <i class="fas fa-minus"></i> <span>vs hier</span>
                    </div>
                </div>
                <div class="analytics-kpi-card" style="--kpi-color: #8b5cf6; --kpi-color-rgb: 139, 92, 246;">
                    <div class="analytics-kpi-header">
                        <div class="analytics-kpi-icon"><i class="fas fa-play-circle"></i></div>
                        <div class="analytics-kpi-label">Tracks joués (24h)</div>
                    </div>
                    <div class="analytics-kpi-value" id="statTracks">0</div>
                    <div class="analytics-kpi-comparison neutral" id="statTracksComparison">
                        <i class="fas fa-minus"></i> <span>vs hier</span>
                    </div>
                </div>
            </div>

            <!-- Audience Chart -->
            <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3>Audience en temps réel</h3>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-primary" onclick="loadAudienceChart('24h')">24h</button>
                        <button class="btn btn-sm btn-secondary" onclick="loadAudienceChart('7d')">7 Jours</button>
                    </div>
                </div>
                <div style="height: 300px; width: 100%;">
                    <canvas id="audienceChart"></canvas>
                </div>
            </div>

            <div class="form-grid">
                <!-- Top Tracks -->
                <div class="card">
                    <h3>Top Titres (30j)</h3>
                    <div class="panel-content" style="height: 300px;">
                        <ul id="topTracksList" class="item-list">
                            <!-- JS injected -->
                        </ul>
                    </div>
                </div>

                <!-- Top Artists -->
                <div class="card">
                    <h3>Top Artistes (30j)</h3>
                    <div class="panel-content" style="height: 300px;">
                        <ul id="topArtistsList" class="item-list">
                            <!-- JS injected -->
                        </ul>
                    </div>
                </div>
            </div>
            
            <!-- Heatmap (Simplified as Bar Chart for now) -->
            <div class="card">
                <h3>Heures de Pointe (Moyenne 30j)</h3>
                <div style="height: 300px; width: 100%;">
                    <canvas id="heatmapChart"></canvas>
                </div>
            </div>
        </section>

        <!-- SECTION MUSIQUE -->
        <section id="music" class="admin-section">
            <div class="section-header">
                <h2>Musique</h2>
                <div class="header-actions">
                    <button id="skipSongBtn" class="btn btn-secondary"><i class="fas fa-forward"></i> Skip</button>
                </div>
            </div>
            
            <!-- Stats rapides -->
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-card-icon"><i class="fas fa-music"></i></div>
                    <div class="stat-card-value" id="totalTracksCount">-</div>
                    <div class="stat-card-label">Morceaux</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-icon" style="color: #ff0000;"><i class="fab fa-youtube"></i></div>
                    <div class="stat-card-value" id="youtubeDownloads">-</div>
                    <div class="stat-card-label">YouTube</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-icon" style="color: #1db954;"><i class="fab fa-spotify"></i></div>
                    <div class="stat-card-value" id="spotifyDownloads">-</div>
                    <div class="stat-card-label">Spotify</div>
                </div>
            </div>
            
            <!-- Download Panels -->
            <div class="modern-grid" style="grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));">
                <!-- YouTube Download -->
                <div class="modern-form-panel" style="margin-bottom: 0;">
                    <div class="modern-form-header">
                        <h3><i class="fab fa-youtube" style="color: #ff0000;"></i> YouTube</h3>
                    </div>
                    <form id="youtubeDownloadForm">
                        <div class="modern-form-content">
                            <div class="form-group">
                                <label for="youtubeUrl">URL de la vidéo</label>
                                <input type="url" id="youtubeUrl" placeholder="https://www.youtube.com/watch?v=..." required>
                            </div>
                        </div>
                        <div class="modern-form-footer">
                            <span id="youtubeFormMessage" class="form-message"></span>
                            <button type="submit" class="btn btn-primary"><i class="fas fa-download"></i> Télécharger</button>
                        </div>
                    </form>
                </div>
                
                <!-- Spotify Download -->
                <div class="modern-form-panel" style="margin-bottom: 0;">
                    <div class="modern-form-header">
                        <h3><i class="fab fa-spotify" style="color: #1db954;"></i> Spotify</h3>
                    </div>
                    <form id="spotifyDownloadForm">
                        <div class="modern-form-content">
                            <div class="form-group">
                                <label for="spotifyUrl">URL (track ou playlist)</label>
                                <input type="url" id="spotifyUrl" placeholder="https://open.spotify.com/track/..." required>
                            </div>
                        </div>
                        <div class="modern-form-footer">
                            <span id="spotifyFormMessage" class="form-message"></span>
                            <button type="submit" class="btn" style="background: #1db954; color: #000;"><i class="fas fa-download"></i> Télécharger</button>
                        </div>
                    </form>
                </div>
            </div>
            
            <!-- Bulk Download -->
            <div class="modern-form-panel" style="margin-top: 24px;">
                <div class="modern-form-header">
                    <h3><i class="fas fa-layer-group"></i> Téléchargement en masse</h3>
                </div>
                <form id="bulkDownloadForm">
                    <div class="modern-form-content">
                        <p style="color: var(--text-secondary); margin-bottom: 16px; font-size: 0.9rem;">
                            Collez des URLs YouTube ou Spotify (une par ligne). Les playlists Spotify sont supportées !
                        </p>
                        <div class="form-group">
                            <label for="bulkYoutubeUrls">URLs (une par ligne)</label>
                            <textarea id="bulkYoutubeUrls" rows="6" placeholder="https://www.youtube.com/watch?v=abc123
https://open.spotify.com/track/xyz789
https://open.spotify.com/playlist/abc456" style="width: 100%; background: #141414; border: 1px solid var(--surface-border); border-radius: 10px; padding: 14px; color: var(--text-primary); font-family: monospace; resize: vertical;"></textarea>
                        </div>
                        <div id="bulkProgressContainer" style="display: none; margin-top: 16px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <span id="bulkProgressText">0 / 0</span>
                                <span id="bulkProgressPercent">0%</span>
                            </div>
                            <div style="background: var(--surface-border); border-radius: 4px; height: 8px; overflow: hidden;">
                                <div id="bulkProgressBar" style="background: var(--accent-primary); height: 100%; width: 0%; transition: width 0.3s;"></div>
                            </div>
                            <div id="bulkDownloadLog" style="margin-top: 12px; max-height: 150px; overflow-y: auto; font-size: 0.85rem; font-family: monospace; background: #141414; padding: 12px; border-radius: 8px;"></div>
                        </div>
                    </div>
                    <div class="modern-form-footer">
                        <span id="bulkFormMessage" class="form-message"></span>
                        <button type="submit" class="btn btn-primary"><i class="fas fa-download"></i> Télécharger tout</button>
                    </div>
                </form>
            </div>

            <!-- Music Library -->
            <div class="modern-table-container" style="margin-top: 24px;">
                <div class="modern-table-header">
                    <h3><i class="fas fa-database"></i> Bibliothèque musicale</h3>
                    <div class="modern-table-search">
                        <input type="text" id="musicSearchInput" placeholder="Rechercher...">
                    </div>
                </div>
                <div class="modern-table-content scrollable" id="musicManagementContainer">
                    <!-- Fichiers générés dynamiquement -->
                </div>
            </div>
        </section>

        <!-- SECTION: PLAYLISTS -->
        <section id="playlists" class="admin-section">
            <div class="playlists-header">
                <h2>Gestion des Playlists</h2>
                <div style="display: flex; gap: 10px;">
                    <button id="fallbackModeBtn" class="btn btn-secondary" title="Désactiver la playlist active et jouer tout en aléatoire">
                        <i class="fas fa-random"></i> Mode Fallback
                    </button>
                    <button id="createPlaylistBtn" class="btn btn-primary">
                        <i class="fas fa-plus"></i> Nouvelle Playlist
                    </button>
                </div>
            </div>
            
            <!-- Grille des playlists -->
            <div id="playlistsGrid" class="playlists-grid">
                <!-- Cards générées dynamiquement -->
            </div>
            
            <!-- Zone d'édition de playlist (apparaît quand une playlist est sélectionnée) -->
            <div id="playlistEditorPanel" class="playlist-editor-panel" style="display: none;">
                <div class="editor-header">
                    <div class="editor-title-section">
                        <button id="backToPlaylistsBtn" class="btn btn-ghost">
                            <i class="fas fa-arrow-left"></i>
                        </button>
                        <div class="editor-cover-preview" id="editorCoverPreview">
                            <i class="fas fa-image"></i>
                            <input type="file" id="editorCoverInput" accept="image/*" hidden>
                        </div>
                        <div class="editor-playlist-info">
                            <input type="text" id="editPlaylistNameInput" class="playlist-name-input" placeholder="Nom de la playlist">
                            <div class="editor-playlist-meta">
                                <span id="editorSongCount">0 morceaux</span>
                                <span id="editorPlaylistStatus" class="status-badge"></span>
                            </div>
                        </div>
                    </div>
                    <div class="editor-actions">
                        <button id="activatePlaylistBtn" class="btn btn-success">
                            <i class="fas fa-broadcast-tower"></i> Mettre en LIVE
                        </button>
                        <button id="deletePlaylistBtn" class="btn btn-danger-outline">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                
                <div class="editor-content">
                    <!-- Colonne gauche: Morceaux de la playlist -->
                    <div class="editor-column playlist-songs-column">
                        <div class="column-header">
                            <h3><i class="fas fa-list-music"></i> Dans la playlist</h3>
                            <span class="song-count" id="playlistSongsCount">0</span>
                        </div>
                        <div id="playlistSongsDropzone" class="songs-dropzone">
                            <ul id="playlistSongsList" class="songs-list sortable-list">
                                <!-- Morceaux de la playlist (drag & drop) -->
                            </ul>
                            <div class="dropzone-hint" id="playlistDropHint">
                                <i class="fas fa-music"></i>
                                <p>Glissez des morceaux ici</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Colonne droite: Bibliothèque -->
                    <div class="editor-column library-column">
                        <div class="column-header">
                            <h3><i class="fas fa-database"></i> Bibliothèque</h3>
                            <div class="library-filters">
                                <input type="text" id="librarySearchInput" class="search-input" placeholder="Rechercher...">
                                <select id="libraryGenreFilter" class="genre-filter-select">
                                    <option value="">Tous genres</option>
                                </select>
                            </div>
                        </div>
                        <div class="library-content">
                            <ul id="librarySongsList" class="songs-list">
                                <!-- Tous les morceaux disponibles -->
                            </ul>
                        </div>
                    </div>
                </div>
                
                <!-- Suggestions harmoniques -->
                <div class="suggestions-section">
                    <div class="suggestions-header">
                        <h3><i class="fas fa-magic"></i> Suggestions harmoniques</h3>
                        <div class="suggestions-controls">
                            <span class="suggestions-based-on">Basé sur: <strong id="suggestionsBasedOn">-</strong></span>
                        </div>
                    </div>
                    <div class="suggestions-filters">
                        <select id="suggestionsGenreFilter" class="filter-select">
                            <option value="">Tous genres</option>
                        </select>
                        <div class="sort-buttons">
                            <button class="btn btn-sm sort-btn active" data-sort="score" title="Trier par score">
                                <i class="fas fa-fire"></i>
                            </button>
                            <button class="btn btn-sm sort-btn" data-sort="bpm" title="Trier par BPM">
                                <i class="fas fa-heartbeat"></i>
                            </button>
                            <button class="btn btn-sm sort-btn" data-sort="key" title="Trier par tonalité">
                                <i class="fas fa-music"></i>
                            </button>
                        </div>
                    </div>
                    <div id="harmonicSuggestionsList" class="suggestions-list">
                        <!-- Suggestions -->
                    </div>
                </div>
            </div>
            
            <!-- Modal création playlist -->
            <div id="createPlaylistModal" class="modal-overlay" style="display: none;">
                <div class="modal-content modal-small">
                    <div class="modal-header">
                        <h3>Nouvelle Playlist</h3>
                        <button class="modal-close" id="closeCreateModal">&times;</button>
                    </div>
                    <form id="createPlaylistForm">
                        <div class="form-group">
                            <label>Nom de la playlist</label>
                            <input type="text" id="newPlaylistName" placeholder="Ex: Chill Vibes" required>
                        </div>
                        <div class="form-group">
                            <label>Cover</label>
                            <div class="cover-upload-container">
                                <div class="cover-preview" id="newPlaylistCoverPreview">
                                    <i class="fas fa-image"></i>
                                    <span>Aucune image</span>
                                </div>
                                <div class="cover-actions">
                                    <label class="btn btn-sm" for="newPlaylistCoverInput">
                                        <i class="fas fa-upload"></i> Choisir une image
                                    </label>
                                    <input type="file" id="newPlaylistCoverInput" accept="image/*" style="display: none;">
                                    <button type="button" class="btn btn-sm" id="removeCoverBtn" style="display: none;">
                                        <i class="fas fa-times"></i> Supprimer
                                    </button>
                                </div>
                            </div>
                            <input type="hidden" id="newPlaylistCover" value="">
                        </div>
                        <div class="form-group">
                            <label>Couleur d'accent</label>
                            <div class="color-picker-grid">
                                <button type="button" class="color-option active" data-color="#a855f7" style="background: linear-gradient(135deg, #a855f7, #9333ea);"></button>
                                <button type="button" class="color-option" data-color="#ec4899" style="background: linear-gradient(135deg, #ec4899, #db2777);"></button>
                                <button type="button" class="color-option" data-color="#6366f1" style="background: linear-gradient(135deg, #6366f1, #4f46e5);"></button>
                                <button type="button" class="color-option" data-color="#f59e0b" style="background: linear-gradient(135deg, #f59e0b, #d97706);"></button>
                                <button type="button" class="color-option" data-color="#22c55e" style="background: linear-gradient(135deg, #22c55e, #16a34a);"></button>
                                <button type="button" class="color-option" data-color="#ef4444" style="background: linear-gradient(135deg, #ef4444, #dc2626);"></button>
                                <button type="button" class="color-option" data-color="#06b6d4" style="background: linear-gradient(135deg, #06b6d4, #0891b2);"></button>
                                <button type="button" class="color-option" data-color="#8b5cf6" style="background: linear-gradient(135deg, #8b5cf6, #7c3aed);"></button>
                            </div>
                            <input type="hidden" id="newPlaylistColor" value="#a855f7">
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn" id="cancelCreatePlaylist">Annuler</button>
                            <button type="submit" class="btn btn-primary">Créer</button>
                        </div>
                    </form>
                </div>
            </div>
        </section>

        <!-- MODAL/SECTION: PLAYLIST EDITOR (Legacy - hidden) -->
        <section id="playlistEditModal" class="admin-section" style="display: none !important;">
            <h2>Éditer Playlist: <span id="editingPlaylistName"></span></h2>
            <div class="playlist-editor-container">
                <div class="playlist-songs-panel card">
                    <h3>Chansons de la Playlist</h3>
                    <div class="panel-content">
                        <ul id="currentPlaylistSongs"></ul>
                    </div>
                </div>
                <div class="all-available-songs-panel card">
                    <h3>Toutes les Musiques</h3>
                    <input type="text" id="songSearchInput" class="form-group" placeholder="Rechercher une musique..." />
                    <div class="panel-content">
                        <ul id="allAvailableSongsForEdit"></ul>
                    </div>
                </div>
                <div class="suggestions-panel card">
                    <h3>Suggestions Harmoniques (Mixable avec le dernier son)</h3>
                    <div class="panel-content">
                        <ul id="harmonicSuggestions"></ul>
                    </div>
                </div>
            </div>
            <div class="form-actions">
                <button id="cancelPlaylistEditBtn" class="btn"><i class="fas fa-times"></i> Annuler</button>
                <button id="savePlaylistChangesBtn" class="btn btn-primary"><i class="fas fa-save"></i> Enregistrer</button>
            </div>
        </section>
    </main>
    <!-- Legacy IDs for JS compatibility -->
    <div style="display:none;">
        <div id="admin-timeline"></div>
    </div>
`;

export default adminBodyHTML;