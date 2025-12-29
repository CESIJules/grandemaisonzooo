document.addEventListener('DOMContentLoaded', async () => {
    let currentUser = null;

    // --- Auth Check ---
    try {
        const response = await fetch('check_auth.php');
        const data = await response.json();
        if (!data.logged_in) {
            window.location.href = 'login.html';
            return;
        }
        currentUser = data;
        
        // Update sidebar user info
        updateSidebarUserInfo(currentUser);
        
        // UI Adjustments based on role
        if (currentUser.role === 'artist') {
            // 1. Hide Music and Playlists sections
            const musicNav = document.querySelector('.nav-link[data-section="music"]');
            const playlistsNav = document.querySelector('.nav-link[data-section="playlists"]');
            if (musicNav) musicNav.style.display = 'none';
            if (playlistsNav) playlistsNav.style.display = 'none';

            // 2. Hide "Add Artist" form submit button (or change text)
            // We want to prevent creating new artists.
            // The form is used for both Add and Edit.
            // We can hide the submit button initially, and only show it when editing.
            const artistSubmitBtn = document.querySelector('#adminArtistForm button[type="submit"]');
            if (artistSubmitBtn) {
                // Hide it by default (Add mode)
                artistSubmitBtn.style.display = 'none';
            }
            
            // Also hide the "Annuler" button initially as it resets to Add mode
            const cancelBtn = document.getElementById('cancelArtistEditBtn');
            if (cancelBtn) {
                // Override click to just hide the form or do nothing special, 
                // but mainly we want to ensure they can't go back to "Add" mode.
                cancelBtn.addEventListener('click', () => {
                    if (artistSubmitBtn) artistSubmitBtn.style.display = 'none';
                });
            }
        }
    } catch (e) {
        console.error('Auth check failed', e);
        window.location.href = 'login.html';
        return;
    }

    // --- Mobile Menu Toggle ---
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const adminSidebar = document.getElementById('adminSidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    function openMobileMenu() {
        if (adminSidebar) adminSidebar.classList.add('open');
        if (sidebarOverlay) sidebarOverlay.classList.add('active');
        if (mobileMenuToggle) mobileMenuToggle.innerHTML = '<i class="fas fa-times"></i>';
        document.body.style.overflow = 'hidden';
    }

    function closeMobileMenu() {
        if (adminSidebar) adminSidebar.classList.remove('open');
        if (sidebarOverlay) sidebarOverlay.classList.remove('active');
        if (mobileMenuToggle) mobileMenuToggle.innerHTML = '<i class="fas fa-bars"></i>';
        document.body.style.overflow = '';
    }

    // --- Update Sidebar User Info ---
    function updateSidebarUserInfo(user) {
        const avatarEl = document.getElementById('sidebarUserAvatar');
        const nameEl = document.getElementById('sidebarUserName');
        const roleEl = document.getElementById('sidebarUserRole');
        
        if (!user) return;
        
        // Get display name
        let displayName = user.user_id || 'Utilisateur';
        
        // For artist role, try to get the artist name
        if (user.role === 'artist' && user.artist_id) {
            // Will be updated when artistProfiles is loaded
            displayName = user.artist_id;
        }
        
        // Update avatar with first letter
        if (avatarEl) {
            avatarEl.textContent = displayName.charAt(0).toUpperCase();
        }
        
        // Update name
        if (nameEl) {
            nameEl.textContent = displayName;
        }
        
        // Update role with proper label
        if (roleEl) {
            const roleLabels = {
                'admin': 'Administrateur',
                'artist': 'Artiste',
                'guest': 'Invité'
            };
            roleEl.textContent = roleLabels[user.role] || user.role;
        }
    }

    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', () => {
            if (adminSidebar && adminSidebar.classList.contains('open')) {
                closeMobileMenu();
            } else {
                openMobileMenu();
            }
        });
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeMobileMenu);
    }

    // --- New Sidebar Navigation ---
    const navLinks = document.querySelectorAll('.nav-link');
    const adminSections = document.querySelectorAll('.admin-section');
    let analyticsInterval = null;

    // Helper to refresh analytics
    function refreshAnalyticsData() {
        if (typeof loadAnalyticsHeader === 'function') loadAnalyticsHeader();
        // loadAudienceChart is assigned to window, so we check window.loadAudienceChart
        if (typeof window.loadAudienceChart === 'function') window.loadAudienceChart('24h');
        if (typeof loadTopLists === 'function') loadTopLists();
        if (typeof loadHeatmap === 'function') loadHeatmap();
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = link.getAttribute('data-section');
            
            // Close mobile menu when navigating
            closeMobileMenu();
            
            // Update active link
            navLinks.forEach(navLink => navLink.classList.remove('active'));
            link.classList.add('active');

            // Show active section
            adminSections.forEach(section => {
                section.style.display = section.id === sectionId ? 'block' : 'none';
            });

            // Handle Analytics Auto-Refresh
            if (sectionId === 'analytics') {
                refreshAnalyticsData();
                // Refresh every 30 seconds
                if (analyticsInterval) clearInterval(analyticsInterval);
                analyticsInterval = setInterval(refreshAnalyticsData, 30000);
            } else {
                if (analyticsInterval) {
                    clearInterval(analyticsInterval);
                    analyticsInterval = null;
                }
            }
            
            // Reset playlist view when entering playlists section
            if (sectionId === 'playlists') {
                const playlistsGridEl = document.getElementById('playlistsGrid');
                const playlistEditorPanelEl = document.getElementById('playlistEditorPanel');
                if (playlistsGridEl) playlistsGridEl.style.display = 'grid';
                if (playlistEditorPanelEl) playlistEditorPanelEl.style.display = 'none';
            }
        });
    });

    // --- General Element Selectors ---
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'logout.php';
        });
    }

    // --- Timeline Section ---
    const adminTimelineForm = document.getElementById('adminTimelineForm');
    const adminFormMessage = document.getElementById('adminFormMessage');
    const postsManagementContainer = document.getElementById('postsManagementContainer');
    const postArtistSelect = document.getElementById('postArtist');
    const postArtistFilter = document.getElementById('postArtistFilter');
    const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

    // --- Music Section ---
    const youtubeDownloadForm = document.getElementById('youtubeDownloadForm');
    const youtubeUrlInput = document.getElementById('youtubeUrl');
    const youtubeFormMessage = document.getElementById('youtubeFormMessage');
    const musicManagementContainer = document.getElementById('musicManagementContainer');
    const musicSearchInput = document.getElementById('musicSearchInput');
    const skipSongBtn = document.getElementById('skipSongBtn');
    
    // --- Spotify Download Section ---
    const spotifyDownloadForm = document.getElementById('spotifyDownloadForm');
    const spotifyUrlInput = document.getElementById('spotifyUrl');
    const spotifyFormMessage = document.getElementById('spotifyFormMessage');
    
    // --- Bulk Download Section ---
    const bulkDownloadForm = document.getElementById('bulkDownloadForm');
    const bulkYoutubeUrls = document.getElementById('bulkYoutubeUrls');
    const bulkFormMessage = document.getElementById('bulkFormMessage');
    const bulkProgressContainer = document.getElementById('bulkProgressContainer');
    const bulkProgressBar = document.getElementById('bulkProgressBar');
    const bulkProgressText = document.getElementById('bulkProgressText');
    const bulkProgressPercent = document.getElementById('bulkProgressPercent');
    const bulkDownloadLog = document.getElementById('bulkDownloadLog');

    // --- Playlist Section ---
    const createPlaylistForm = document.getElementById('createPlaylistForm');
    const newPlaylistNameInput = document.getElementById('newPlaylistName');
    const createPlaylistMessage = document.getElementById('createPlaylistMessage');
    const existingPlaylistsContainer = document.getElementById('existingPlaylistsContainer');
    
    // --- Playlist Editing Section ---
    const playlistEditModal = document.getElementById('playlistEditModal');
    const editingPlaylistNameSpan = document.getElementById('editingPlaylistName');
    const currentPlaylistSongsUl = document.getElementById('currentPlaylistSongs');
    const allAvailableSongsForEditUl = document.getElementById('allAvailableSongsForEdit');
    const songSearchInput = document.getElementById('songSearchInput');
    const savePlaylistChangesBtn = document.getElementById('savePlaylistChangesBtn');
    const cancelPlaylistEditBtn = document.getElementById('cancelPlaylistEditBtn');

    // --- Artists Section ---
    const adminArtistForm = document.getElementById('adminArtistForm');
    const artistFormMessage = document.getElementById('artistFormMessage');
    const artistsManagementContainer = document.getElementById('artistsManagementContainer');
    const cancelArtistEditBtn = document.getElementById('cancelArtistEditBtn');
    const artistImagePreview = document.getElementById('artistImagePreview');
    
    // --- Modals ---
    const postModal = document.getElementById('postModal');
    const artistModal = document.getElementById('artistModal');
    
    let artistProfiles = [];
    let allPosts = [];
    let allPlaylists = [];
    let currentPostsView = 'grid'; // 'grid' or 'list'

    // --- State ---
    let allAvailableSongs = [];
    let allMusicFiles = [];
    let currentActivePlaylist = null;
    let currentEditingPlaylist = null;
    let suggestionSortMode = 'bpm'; // Default sort mode

    // --- Utility Functions ---
    function escapeHtml(text) {
        if (!text) return text;
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function formatSongPathToTitle(songPath) {
        if (!songPath) return '';
        const filename = songPath.split('/').pop();
        return escapeHtml(filename.replace(/\.[^/.]+$/, "").replace(/_/g, ' ').replace(/\s*-\s*/g, ' - ').toUpperCase());
    }

    // --- Harmonic Mixing Logic ---
    const camelotWheel = {
        '1B': { compatible: ['1B', '12B', '2B', '1A'], name: 'B Major' },
        '2B': { compatible: ['2B', '1B', '3B', '2A'], name: 'F# Major' },
        '3B': { compatible: ['3B', '2B', '4B', '3A'], name: 'Db Major' },
        '4B': { compatible: ['4B', '3B', '5B', '4A'], name: 'Ab Major' },
        '5B': { compatible: ['5B', '4B', '6B', '5A'], name: 'Eb Major' },
        '6B': { compatible: ['6B', '5B', '7B', '6A'], name: 'Bb Major' },
        '7B': { compatible: ['7B', '6B', '8B', '7A'], name: 'F Major' },
        '8B': { compatible: ['8B', '7B', '9B', '8A'], name: 'C Major' },
        '9B': { compatible: ['9B', '8B', '10B', '9A'], name: 'G Major' },
        '10B': { compatible: ['10B', '9B', '11B', '10A'], name: 'D Major' },
        '11B': { compatible: ['11B', '10B', '12B', '11A'], name: 'A Major' },
        '12B': { compatible: ['12B', '11B', '1B', '12A'], name: 'E Major' },
        '1A': { compatible: ['1A', '12A', '2A', '1B'], name: 'Ab Minor' },
        '2A': { compatible: ['2A', '1A', '3A', '2B'], name: 'Eb Minor' },
        '3A': { compatible: ['3A', '2A', '4A', '3B'], name: 'Bb Minor' },
        '4A': { compatible: ['4A', '3A', '5A', '4B'], name: 'F Minor' },
        '5A': { compatible: ['5A', '4A', '6A', '5B'], name: 'C Minor' },
        '6A': { compatible: ['6A', '5A', '7A', '6B'], name: 'G Minor' },
        '7A': { compatible: ['7A', '6A', '8A', '7B'], name: 'D Minor' },
        '8A': { compatible: ['8A', '7A', '9A', '8B'], name: 'A Minor' },
        '9A': { compatible: ['9A', '8A', '10A', '9B'], name: 'E Minor' },
        '10A': { compatible: ['10A', '9A', '11A', '10B'], name: 'B Minor' },
        '11A': { compatible: ['11A', '10A', '12A', '11B'], name: 'F# Minor' },
        '12A': { compatible: ['12A', '11A', '1A', '12B'], name: 'Db Minor' }
    };

    const metadataCache = {};

    // --- Metadata Cache Management ---
    async function loadAllMetadata() {
        try {
            const response = await fetch('get_all_metadata.php');
            if (response.ok) {
                const data = await response.json();
                // Merge with existing cache
                Object.assign(metadataCache, data);
                console.log('Bulk metadata loaded:', Object.keys(data).length, 'items');
                
                // Populate genre filter after loading
                populateGenreFilter();
            }
        } catch (e) {
            console.error('Failed to load bulk metadata:', e);
        }
    }
    
    // Genre filter population function (declared early)
    function populateGenreFilter() {
        const libraryGenreFilter = document.getElementById('libraryGenreFilter');
        const suggestionsGenreFilter = document.getElementById('suggestionsGenreFilter');
        
        const genres = new Set();
        Object.values(metadataCache).forEach(meta => {
            if (meta && meta.genre) genres.add(meta.genre);
        });
        
        const sortedGenres = Array.from(genres).sort();
        
        // Update library filter
        if (libraryGenreFilter) {
            const currentValue = libraryGenreFilter.value;
            libraryGenreFilter.innerHTML = '<option value="">Tous genres</option>';
            sortedGenres.forEach(genre => {
                const option = document.createElement('option');
                option.value = genre;
                option.textContent = genre;
                libraryGenreFilter.appendChild(option);
            });
            if (currentValue && genres.has(currentValue)) {
                libraryGenreFilter.value = currentValue;
            }
        }
        
        // Update suggestions filter
        if (suggestionsGenreFilter) {
            const currentValue = suggestionsGenreFilter.value;
            suggestionsGenreFilter.innerHTML = '<option value="">Tous genres</option>';
            sortedGenres.forEach(genre => {
                const option = document.createElement('option');
                option.value = genre;
                option.textContent = genre;
                suggestionsGenreFilter.appendChild(option);
            });
            if (currentValue && genres.has(currentValue)) {
                suggestionsGenreFilter.value = currentValue;
            }
        }
        
        console.log('Genre filter populated:', sortedGenres.length, 'genres');
    }

    // Load metadata on startup
    loadAllMetadata();

    async function getMusicMetadata(filename, force = false) {
        if (!force && metadataCache[filename]) return metadataCache[filename];
        
        try {
            const response = await fetch('get_music_metadata.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: filename, force: force })
            });
            const result = await response.json();
            if (result.status === 'success') {
                metadataCache[filename] = result.data;
                // Log full metadata for debugging
                console.log(`Metadata for ${filename}:`, result.data);
                return result.data;
            } else {
                console.error('Metadata error:', result);
                return { error: true, message: result.message, debug: result.debug };
            }
        } catch (error) {
            console.error('Error fetching metadata:', error);
            return { error: true, message: error.message };
        }
    }

    async function renderSuggestions() {
        const suggestionsUl = document.getElementById('harmonicSuggestions');
        suggestionsUl.innerHTML = '<p>Analyse en cours...</p>';

        if (!currentEditingPlaylist || currentEditingPlaylist.songs.length === 0) {
            suggestionsUl.innerHTML = '<p>Ajoutez des chansons à la playlist pour voir des suggestions.</p>';
            return;
        }

        // Get last song
        const lastSongPath = currentEditingPlaylist.songs[currentEditingPlaylist.songs.length - 1];
        const lastSongFilename = lastSongPath.split('/').pop();
        
        const lastSongMeta = await getMusicMetadata(lastSongFilename);
        
        if (!lastSongMeta || lastSongMeta.error || !lastSongMeta.camelot) {
            const errorDetails = lastSongMeta && lastSongMeta.error ? `<br><small>${lastSongMeta.message} ${lastSongMeta.debug ? '<br>Debug: ' + lastSongMeta.debug : ''}</small>` : '';
            suggestionsUl.innerHTML = `<p style="color: var(--accent-danger);">Impossible d'analyser la dernière chanson (${formatSongPathToTitle(lastSongPath)}).${errorDetails}</p>`;
            
            // Add retry button
            const retryBtn = document.createElement('button');
            retryBtn.className = 'btn btn-sm btn-secondary';
            retryBtn.style.marginTop = '10px';
            retryBtn.innerHTML = '<i class="fas fa-sync"></i> Réessayer (Forcer)';
            retryBtn.onclick = async () => {
                suggestionsUl.innerHTML = '<p>Réanalyse forcée en cours...</p>';
                await getMusicMetadata(lastSongFilename, true);
                renderSuggestions();
            };
            suggestionsUl.appendChild(retryBtn);
            return;
        }

        const targetBpm = lastSongMeta.bpm;
        const targetKey = lastSongMeta.camelot;
        const targetEnergy = Math.round((lastSongMeta.energy || 0) * 100);
        const targetDance = Math.round((lastSongMeta.danceability || 0) * 100);
        const source = lastSongMeta.source || 'unknown';
        const librosaError = lastSongMeta.librosa_error ? ` (Error: ${lastSongMeta.librosa_error})` : '';
        const compatibleKeys = camelotWheel[targetKey]?.compatible || [];

        suggestionsUl.innerHTML = '';
        
        // Header with current song info and refresh button
        const headerDiv = document.createElement('div');
        headerDiv.style.marginBottom = '15px';
        headerDiv.style.paddingBottom = '10px';
        headerDiv.style.borderBottom = '1px solid var(--surface-border)';
        headerDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="flex-grow: 1; margin-right: 15px;">
                    <small style="color: var(--text-secondary);">Basé sur:</small><br>
                    <div style="margin-bottom: 5px;"><strong>${formatSongPathToTitle(lastSongPath)}</strong></div>
                    <div style="margin-bottom: 8px;">
                        <span class="suggestion-badge badge-bpm" title="Source: ${source}${librosaError}">${targetBpm} BPM</span> 
                        <span class="suggestion-badge badge-key">${targetKey}</span>
                    </div>
                    
                    <div style="display: flex; gap: 15px; max-width: 300px;">
                        <div class="stat-item" style="flex: 1;">
                            <div style="display: flex; justify-content: space-between; font-size: 0.7rem; margin-bottom: 3px; color: var(--text-secondary);">
                                <span>Energy</span>
                                <span style="color: var(--text-primary);">${targetEnergy}%</span>
                            </div>
                            <div style="height: 4px; background: #333; border-radius: 2px; overflow: hidden;">
                                <div style="height: 100%; width: ${targetEnergy}%; background: #ffc107; border-radius: 2px;"></div>
                            </div>
                        </div>
                        <div class="stat-item" style="flex: 1;">
                            <div style="display: flex; justify-content: space-between; font-size: 0.7rem; margin-bottom: 3px; color: var(--text-secondary);">
                                <span>Dance</span>
                                <span style="color: var(--text-primary);">${targetDance}%</span>
                            </div>
                            <div style="height: 4px; background: #333; border-radius: 2px; overflow: hidden;">
                                <div style="height: 100%; width: ${targetDance}%; background: #0dcaf0; border-radius: 2px;"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div style="margin-top: 6px;"><small style="font-size: 0.7em; color: #666;">Source: ${source}</small></div>
                    
                    <div style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed #333; display: flex; align-items: center; gap: 10px;">
                        <small style="color: var(--text-secondary);">Trier par :</small>
                        <button id="sortBpmBtn" class="btn btn-sm ${suggestionSortMode === 'bpm' ? 'btn-primary' : 'btn-outline-secondary'}" style="padding: 2px 8px; font-size: 0.75rem;">BPM</button>
                        <button id="sortKeyBtn" class="btn btn-sm ${suggestionSortMode === 'key' ? 'btn-primary' : 'btn-outline-secondary'}" style="padding: 2px 8px; font-size: 0.75rem;">Clé</button>
                    </div>
                </div>
                <button id="forceRefreshBtn" class="btn btn-sm btn-outline-secondary" title="Forcer la réanalyse" style="margin-top: 5px;">
                    <i class="fas fa-sync"></i>
                </button>
            </div>
        `;
        suggestionsUl.appendChild(headerDiv);
        
        // Sort Listeners
        document.getElementById('sortBpmBtn').addEventListener('click', () => {
            suggestionSortMode = 'bpm';
            renderSuggestions();
        });
        document.getElementById('sortKeyBtn').addEventListener('click', () => {
            suggestionSortMode = 'key';
            renderSuggestions();
        });
        
        document.getElementById('forceRefreshBtn').addEventListener('click', async () => {
            const btn = document.getElementById('forceRefreshBtn');
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            btn.disabled = true;
            await getMusicMetadata(lastSongFilename, true);
            renderSuggestions();
        });

        // Filter candidates
        const candidates = [];
        
        // OPTIMIZATION: Prioritize cached songs to avoid waiting for analysis
        // 1. Split songs into cached and uncached
        const cachedSongs = [];
        const uncachedSongs = [];
        
        for (const songPath of allAvailableSongs) {
            if (currentEditingPlaylist.songs.includes(songPath)) continue;
            const filename = songPath.split('/').pop();
            if (metadataCache[filename]) {
                cachedSongs.push(songPath);
            } else {
                uncachedSongs.push(songPath);
            }
        }
        
        // 2. Check cached songs first (Instant)
        let matchCount = 0;
        
        for (const songPath of cachedSongs) {
            if (matchCount >= 5) break;
            
            const filename = songPath.split('/').pop();
            const meta = metadataCache[filename]; // Guaranteed to exist
            
            // Check BPM (±5%)
            const bpmDiff = Math.abs(meta.bpm - targetBpm);
            const bpmMatch = bpmDiff <= (targetBpm * 0.05);

            // Check Key
            const keyMatch = compatibleKeys.includes(meta.camelot);

            if (bpmMatch && keyMatch) {
                candidates.push({ path: songPath, meta: meta });
                matchCount++;
            }
        }
        
        // 3. If we don't have enough matches, try to analyze a few uncached songs
        // Limit to analyzing max 3 songs to prevent UI freeze
        if (matchCount < 5 && uncachedSongs.length > 0) {
            let analyzedCount = 0;
            const maxAnalyze = 3; 
            
            // Show a small indicator that we are analyzing more
            const loadingIndicator = document.createElement('div');
            loadingIndicator.innerHTML = '<small><i>Recherche approfondie...</i></small>';
            suggestionsUl.appendChild(loadingIndicator);
            
            for (const songPath of uncachedSongs) {
                if (matchCount >= 5 || analyzedCount >= maxAnalyze) break;
                
                const filename = songPath.split('/').pop();
                const meta = await getMusicMetadata(filename); // Triggers analysis
                analyzedCount++;
                
                if (!meta) continue;

                const bpmDiff = Math.abs(meta.bpm - targetBpm);
                const bpmMatch = bpmDiff <= (targetBpm * 0.05);
                const keyMatch = compatibleKeys.includes(meta.camelot);

                if (bpmMatch && keyMatch) {
                    candidates.push({ path: songPath, meta: meta });
                    matchCount++;
                }
            }
            
            // Remove indicator
            if (loadingIndicator.parentNode) loadingIndicator.parentNode.removeChild(loadingIndicator);
        }

        // SORTING LOGIC
        candidates.sort((a, b) => {
            if (suggestionSortMode === 'bpm') {
                // Sort by BPM (Ascending)
                return a.meta.bpm - b.meta.bpm;
            } else {
                // Sort by Key (Camelot) - Numeric sort handles 1A vs 10A correctly
                return a.meta.camelot.localeCompare(b.meta.camelot, undefined, {numeric: true});
            }
        });

        if (candidates.length === 0) {
            suggestionsUl.innerHTML += '<p>Aucune suggestion trouvée pour le moment.</p>';
            return;
        }

        const list = document.createElement('ul');
        candidates.forEach(cand => {
            const li = document.createElement('li');
            li.className = 'suggestion-item';
            
            const energyPercent = Math.round((cand.meta.energy || 0) * 100);
            const dancePercent = Math.round((cand.meta.danceability || 0) * 100);

            li.innerHTML = `
                <div class="suggestion-info">
                    <div class="suggestion-header">
                        <strong>${formatSongPathToTitle(cand.path)}</strong>
                    </div>
                    <div class="suggestion-badges">
                        <span class="suggestion-badge badge-bpm">${escapeHtml(String(cand.meta.bpm))} BPM</span>
                        <span class="suggestion-badge badge-key">${escapeHtml(String(cand.meta.camelot))}</span>
                    </div>
                    <div class="suggestion-stats" style="margin-top: 8px; display: flex; gap: 10px;">
                        <div class="stat-item" style="flex: 1;">
                            <div style="display: flex; justify-content: space-between; font-size: 0.7rem; margin-bottom: 2px;">
                                <span>Energy</span>
                                <span>${energyPercent}%</span>
                            </div>
                            <div style="height: 4px; background: #333; border-radius: 2px;">
                                <div style="height: 100%; width: ${energyPercent}%; background: #ffc107; border-radius: 2px;"></div>
                            </div>
                        </div>
                        <div class="stat-item" style="flex: 1;">
                            <div style="display: flex; justify-content: space-between; font-size: 0.7rem; margin-bottom: 2px;">
                                <span>Dance</span>
                                <span>${dancePercent}%</span>
                            </div>
                            <div style="height: 4px; background: #333; border-radius: 2px;">
                                <div style="height: 100%; width: ${dancePercent}%; background: #0dcaf0; border-radius: 2px;"></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            const addBtn = document.createElement('button');
            addBtn.innerHTML = '<i class="fas fa-plus"></i> AJOUTER';
            addBtn.className = 'btn btn-primary btn-sm';
            addBtn.addEventListener('click', () => {
                currentEditingPlaylist.songs.push(cand.path);
                renderCurrentPlaylistSongs();
                renderSuggestions(); // Refresh suggestions based on new last song
            });
            li.appendChild(addBtn);
            list.appendChild(li);
        });
        suggestionsUl.appendChild(list);
    }

    // --- API & Rendering Functions ---

    // RADIO CONTROL
    async function skipSong() {
        const originalBtnHtml = skipSongBtn.innerHTML;
        skipSongBtn.disabled = true;
        skipSongBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi...';

        try {
            const response = await fetch('skip_song.php', {
                method: 'POST',
                cache: 'no-store'
            });
            if (!response.ok) throw new Error(`Erreur serveur: ${response.statusText}`);
            const result = await response.json();
            if (result.status !== 'success') throw new Error(result.message || 'Erreur inconnue.');
            
            // Provide visual feedback
            skipSongBtn.innerHTML = '<i class="fas fa-check"></i> Succès !';

        } catch (error) {
            console.error('Failed to skip song:', error);
            skipSongBtn.innerHTML = '<i class="fas fa-times"></i> Erreur';
            alert(`Erreur lors de la commande de skip : ${error.message}`);
        } finally {
            // Restore button after a short delay
            setTimeout(() => {
                skipSongBtn.disabled = false;
                skipSongBtn.innerHTML = originalBtnHtml;
            }, 2000);
        }
    }

    // ARTISTS
    async function populateArtistDropdown() {
        if (!postArtistSelect) return;
        try {
            const response = await fetch('get_artists.php');
            if (!response.ok) throw new Error('Could not fetch artists');
            const artists = await response.json();
            postArtistSelect.innerHTML = '<option value="" disabled selected>Choisir un artiste</option>';
            
            artists.forEach(artist => {
                // If user is artist, only show their own option
                if (currentUser && currentUser.role === 'artist') {
                    // We need to match artist name or ID. 
                    // get_artists.php returns names usually.
                    // Let's check if the artist string matches the user's artist_id (which might be an ID or name)
                    // Actually, get_artists.php returns a list of strings from artists.json.
                    // artists.json contains names like "Req1", "Nelson North".
                    // currentUser.artist_id is like "req1", "nelsonnorth".
                    // We need to be careful about matching.
                    // Ideally we should use IDs everywhere.
                    // But get_artists.php reads artists.json which is just a list of names.
                    // artists_profiles.json has IDs and Names.
                    
                    // Let's try to match loosely or just allow all but select the right one?
                    // No, we want to restrict.
                    
                    // Since we don't have a clear mapping here without fetching profiles,
                    // maybe we should rely on the backend forcing the value.
                    // But for UI, let's try to select the one that looks like the user.
                    
                    // Better approach: If artist, disable the select and set a hidden value?
                    // Or just show their name if we can find it.
                    
                    // Let's just show all for now but auto-select if possible, 
                    // OR if we can match, only show that.
                    
                    // Improved matching using artistProfiles
                    let isMatch = false;
                    const artistNameClean = artist.toLowerCase().replace(/\s/g, '');
                    const userIdClean = currentUser.artist_id.toLowerCase().replace(/\s/g, '');
                    
                    if (artistNameClean === userIdClean) isMatch = true;
                    
                    // Check against profile name if available
                    if (!isMatch && artistProfiles.length > 0) {
                        const profile = artistProfiles.find(p => p.id === currentUser.artist_id);
                        if (profile && profile.name.toLowerCase().replace(/\s/g, '') === artistNameClean) {
                            isMatch = true;
                        }
                    }

                    if (isMatch) {
                         const option = document.createElement('option');
                         option.value = artist; // The value sent to add_post (which is ignored by backend for artists now)
                         option.textContent = artist;
                         option.selected = true;
                         postArtistSelect.appendChild(option);
                    }
                } else {
                    const option = document.createElement('option');
                    option.value = artist;
                    option.textContent = artist;
                    postArtistSelect.appendChild(option);
                }
            });
            
            if (currentUser && currentUser.role === 'artist') {
                // If we found a match, disable the select to prevent changing (visual only)
                if (postArtistSelect.options.length > 1) { // 1 is the default disabled option
                     postArtistSelect.disabled = true;
                } else {
                    // Fallback: add the ID as option if no name matched
                    // Try to find name in profiles first
                    let displayName = currentUser.artist_id;
                    if (artistProfiles.length > 0) {
                        const profile = artistProfiles.find(p => p.id === currentUser.artist_id);
                        if (profile) displayName = profile.name;
                    }
                    
                    const option = document.createElement('option');
                    option.value = displayName;
                    option.textContent = displayName + " (You)";
                    option.selected = true;
                    postArtistSelect.appendChild(option);
                    postArtistSelect.disabled = true;
                }
            }
            
        } catch (error) {
            console.error('Failed to populate artist dropdown:', error);
            postArtistSelect.innerHTML = '<option value="" disabled>Erreur</option>';
        }
    }

    async function populateArtistFilterDropdown() {
        if (!postArtistFilter) return;
        try {
            const response = await fetch('get_artists.php');
            if (!response.ok) throw new Error('Could not fetch artists');
            const artists = await response.json();
            postArtistFilter.innerHTML = '<option value="all">Tous les artistes</option>';
            artists.forEach(artist => {
                const option = document.createElement('option');
                option.value = artist;
                option.textContent = artist;
                postArtistFilter.appendChild(option);
            });
        } catch (error) {
            console.error('Failed to populate artist filter dropdown:', error);
            postArtistFilter.innerHTML = '<option value="all">Erreur</option>';
        }
    }

    // POSTS (TIMELINE)
    const typeLabels = {
        'single': 'Single',
        'ep': 'EP',
        'album': 'Album',
        'clip': 'Clip',
        'mixtape': 'Mixtape',
        'flip': 'Flip',
        'live': 'Live',
        'other': 'Autre'
    };

    function detectPostType(title) {
        if (!title) return 'other';
        const lowerTitle = title.toLowerCase().trim();
        
        // Check for patterns at the start: "TYPE - ..." or "TYPE:" (case insensitive)
        const patterns = [
            { regex: /^single\s*[-:]/, type: 'single' },
            { regex: /^ep\s*[-:]/, type: 'ep' },
            { regex: /^album\s*[-:]/, type: 'album' },
            { regex: /^clip\s*[-:]/, type: 'clip' },
            { regex: /^mixtape\s*[-:]/, type: 'mixtape' },
            { regex: /^flip\s*[-:]/, type: 'flip' },
            { regex: /^live\s*session/, type: 'live' },
            { regex: /^live\s*[-:]/, type: 'live' },
        ];
        
        for (const p of patterns) {
            if (p.regex.test(lowerTitle)) return p.type;
        }
        
        // Check for [FLIP] or (FLIP) pattern anywhere in title
        if (/\[.*flip.*\]/i.test(title) || /\(.*flip.*\)/i.test(title)) return 'flip';
        
        // Check for type anywhere but with word boundaries
        if (/\bmixta?pe\b/i.test(title)) return 'mixtape';
        if (/\balbum\b/i.test(title)) return 'album';
        
        return 'other';
    }

    async function renderAdminPosts(artistFilter = 'all') {
        try {
            const response = await fetch('get_posts.php', { cache: 'no-store' });
            if (!response.ok) throw new Error(`Erreur serveur: ${response.statusText}`);
            let posts = await response.json();
            posts.sort((a, b) => new Date(b.date) - new Date(a.date));
            allPosts = posts; // Store globally

            if (artistFilter !== 'all') {
                posts = posts.filter(post => post.artist && post.artist.toLowerCase() === artistFilter.toLowerCase());
            }

            // Filter for Artist Role: Only show their own posts
            if (currentUser && currentUser.role === 'artist') {
                const userArtistId = currentUser.artist_id.toLowerCase().replace(/\s/g, '');
                const artistProfile = artistProfiles.find(p => p.id === currentUser.artist_id);
                const userArtistName = artistProfile ? artistProfile.name.toLowerCase().replace(/\s/g, '') : '';

                posts = posts.filter(post => {
                    const postArtist = post.artist ? post.artist.toLowerCase().replace(/\s/g, '') : '';
                    return postArtist === userArtistId || postArtist === userArtistName;
                });
            }

            if (posts.length === 0) {
                postsManagementContainer.innerHTML = `
                    <div class="empty-state" style="grid-column: 1 / -1;">
                        <i class="fas fa-stream"></i>
                        <p>Aucun post à afficher</p>
                    </div>
                `;
                return;
            }

            // Set container class based on view
            postsManagementContainer.className = currentPostsView === 'grid' ? 'modern-table-content posts-grid' : 'modern-table-content posts-list';
            postsManagementContainer.innerHTML = '';
            
            posts.forEach(post => {
                let displayTitle = post.title;
                // If title equals artist name, use subtitle as actual title
                if (post.artist && post.title && post.title.trim().toLowerCase() === post.artist.trim().toLowerCase() && post.subtitle) {
                    displayTitle = post.subtitle;
                }

                // Get or detect post type - use displayTitle which has the real title
                const postType = post.type || detectPostType(displayTitle);
                const typeLabel = typeLabels[postType] || 'Autre';

                // Permission check for buttons
                let canEdit = true;
                if (currentUser && currentUser.role === 'artist') {
                    const postArtist = post.artist ? post.artist.toLowerCase().replace(/\s/g, '') : '';
                    const userArtistId = currentUser.artist_id.toLowerCase().replace(/\s/g, '');
                    const artistProfile = artistProfiles.find(p => p.id === currentUser.artist_id);
                    const userArtistName = artistProfile ? artistProfile.name.toLowerCase().replace(/\s/g, '') : '';

                    if (postArtist !== userArtistId && postArtist !== userArtistName) {
                        canEdit = false;
                    }
                }

                const imageUrl = post.image || null;
                const formattedDate = new Date(post.date).toLocaleDateString('fr-FR', { 
                    day: 'numeric', 
                    month: 'short', 
                    year: 'numeric' 
                });

                if (currentPostsView === 'grid') {
                    // Grid view (cards)
                    const card = document.createElement('div');
                    card.className = 'post-card';
                    
                    card.innerHTML = `
                        <div class="post-card-bg" style="${imageUrl ? `background-image: url('${escapeHtml(imageUrl)}')` : 'background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'}"></div>
                        ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="" class="post-card-image" onerror="this.style.display='none'">` : 
                        `<div class="post-card-no-image"><i class="fas fa-music"></i></div>`}
                        ${post.link ? `<a href="${escapeHtml(post.link)}" target="_blank" class="post-card-link" title="Voir le lien"><i class="fas fa-external-link-alt"></i></a>` : ''}
                        ${canEdit ? `
                        <div class="post-card-actions">
                            <button class="post-action-btn edit-post-btn" data-id="${escapeHtml(String(post.id))}" title="Modifier">
                                <i class="fas fa-pencil-alt"></i>
                            </button>
                            <button class="post-action-btn danger delete-post-btn" data-id="${escapeHtml(String(post.id))}" title="Supprimer">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                        ` : ''}
                        <div class="post-card-content">
                            <div class="post-card-title">${escapeHtml(displayTitle)}</div>
                            <div class="post-card-meta">
                                <span class="post-type-badge ${postType}">${typeLabel}</span>
                                <span class="post-card-artist">
                                    <i class="fas fa-user"></i>
                                    ${escapeHtml(post.artist || 'Inconnu')}
                                </span>
                                <span class="post-card-date">
                                    <i class="far fa-calendar"></i>
                                    ${formattedDate}
                                </span>
                            </div>
                        </div>
                    `;
                    postsManagementContainer.appendChild(card);
                } else {
                    // List view (compact)
                    const item = document.createElement('div');
                    item.className = 'post-list-item';
                    
                    item.innerHTML = `
                        ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="" class="post-list-image" onerror="this.style.display='none'">` : 
                        `<div class="post-list-no-image"><i class="fas fa-music"></i></div>`}
                        <div class="post-list-info">
                            <div class="post-list-title">${escapeHtml(displayTitle)}</div>
                            <div class="post-list-meta">
                                <span class="post-type-badge ${postType}">${typeLabel}</span>
                                <span><i class="fas fa-user"></i> ${escapeHtml(post.artist || 'Inconnu')}</span>
                                <span><i class="far fa-calendar"></i> ${formattedDate}</span>
                                ${post.link ? `<a href="${escapeHtml(post.link)}" target="_blank" style="color: var(--accent-primary);"><i class="fas fa-external-link-alt"></i></a>` : ''}
                            </div>
                        </div>
                        ${canEdit ? `
                        <div class="post-list-actions">
                            <button class="btn-icon edit-post-btn" data-id="${escapeHtml(String(post.id))}" title="Modifier">
                                <i class="fas fa-pencil-alt"></i>
                            </button>
                            <button class="btn-icon danger delete-post-btn" data-id="${escapeHtml(String(post.id))}" title="Supprimer">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                        ` : ''}
                    `;
                    postsManagementContainer.appendChild(item);
                }
            });

        } catch (error) {
            postsManagementContainer.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Impossible de charger les posts: ${error.message}</p>
                </div>
            `;
        }
    }

    async function addPost(formData) {
        try {
            const response = await fetch('add_post.php', { method: 'POST', body: formData });
            if (!response.ok) {
                let errorMsg = `Erreur serveur: ${response.statusText}`;
                try {
                    const errorJson = await response.json();
                    if (errorJson.message) errorMsg = errorJson.message;
                } catch (e) { /* ignore JSON parse error */ }
                throw new Error(errorMsg);
            }
            const result = await response.json();
            if (result.status !== 'success') throw new Error(result.message || 'Erreur inconnue.');
            
            closePostModal();
            renderAdminPosts();
        } catch (error) {
            adminFormMessage.textContent = `Erreur: ${error.message}`;
            adminFormMessage.style.color = 'var(--accent-danger)';
        }
    }

    async function updatePost(formData) {
        try {
            const response = await fetch('update_post.php', { method: 'POST', body: formData });
            if (!response.ok) {
                let errorMsg = `Erreur serveur: ${response.statusText}`;
                try {
                    const errorJson = await response.json();
                    if (errorJson.message) errorMsg = errorJson.message;
                } catch (e) { /* ignore JSON parse error */ }
                throw new Error(errorMsg);
            }
            const result = await response.json();
            if (result.status !== 'success') throw new Error(result.message || 'Erreur inconnue.');

            closePostModal();
            renderAdminPosts();
        } catch (error) {
            adminFormMessage.textContent = `Erreur: ${error.message}`;
            adminFormMessage.style.color = 'var(--accent-danger)';
        }
    }

    async function deletePost(postId) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce post ?')) return;
        try {
            const response = await fetch('delete_post.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: postId }),
            });
            if (!response.ok) throw new Error(`Erreur serveur: ${response.statusText}`);
            const result = await response.json();
            if (result.status !== 'success') throw new Error(result.message || 'Erreur inconnue.');
            renderAdminPosts();
        } catch (error) {
            alert(`Erreur lors de la suppression: ${error.message}`);
        }
    }

    function editPost(postId) {
        // Convert postId to string for comparison because dataset.id is a string
        const post = allPosts.find(p => String(p.id) === String(postId));
        if (!post) return;

        openPostModal(post);
    }

    async function downloadYoutube(url) {
        youtubeFormMessage.textContent = 'Téléchargement en cours...';
        youtubeFormMessage.style.color = 'var(--text-primary)';
        
        try {
            const response = await fetch('download_youtube.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: url })
            });
            const result = await response.json();
            
            if (result.status === 'success') {
                youtubeFormMessage.textContent = 'Téléchargement réussi !';
                youtubeFormMessage.style.color = 'lightgreen';
                youtubeUrlInput.value = '';
                renderMusicFiles('', true);
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            youtubeFormMessage.textContent = 'Erreur: ' + error.message;
            youtubeFormMessage.style.color = 'var(--accent-danger)';
        }
    }

    // SPOTIFY DOWNLOAD
    async function downloadSpotify(url) {
        spotifyFormMessage.textContent = 'Téléchargement en cours... (peut prendre du temps pour les playlists)';
        spotifyFormMessage.style.color = 'var(--text-primary)';
        
        const submitBtn = spotifyDownloadForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Téléchargement...';
        
        try {
            const response = await fetch('download_spotify.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: url })
            });
            const result = await response.json();
            
            if (result.status === 'success') {
                spotifyFormMessage.textContent = '✅ ' + result.message;
                spotifyFormMessage.style.color = 'lightgreen';
                spotifyUrlInput.value = '';
                renderMusicFiles('', true);
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            spotifyFormMessage.textContent = 'Erreur: ' + error.message;
            spotifyFormMessage.style.color = 'var(--accent-danger)';
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fab fa-spotify"></i> Télécharger';
        }
    }

    // Helper function to detect URL type
    function getUrlType(url) {
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            return 'youtube';
        } else if (url.includes('spotify.com') || url.startsWith('spotify:')) {
            return 'spotify';
        }
        return null;
    }

    // BULK DOWNLOAD (YouTube + Spotify)
    async function bulkDownloadYoutube(urls) {
        const validUrls = urls
            .split('\n')
            .map(url => url.trim())
            .filter(url => url && getUrlType(url) !== null);
        
        if (validUrls.length === 0) {
            bulkFormMessage.textContent = 'Aucune URL YouTube valide trouvée.';
            bulkFormMessage.style.color = 'var(--accent-danger)';
            return;
        }

        // Show progress UI
        bulkProgressContainer.style.display = 'block';
        bulkDownloadLog.innerHTML = '';
        bulkFormMessage.textContent = '';
        
        const submitBtn = bulkDownloadForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Téléchargement...';

        let completed = 0;
        let success = 0;
        let failed = 0;
        const total = validUrls.length;

        function updateProgress() {
            const percent = Math.round((completed / total) * 100);
            bulkProgressBar.style.width = percent + '%';
            bulkProgressText.textContent = `${completed} / ${total}`;
            bulkProgressPercent.textContent = percent + '%';
        }

        function addLog(message, isError = false, isSpotify = false) {
            const logEntry = document.createElement('div');
            logEntry.style.color = isError ? 'var(--accent-danger)' : (isSpotify ? '#1db954' : 'lightgreen');
            logEntry.textContent = message;
            bulkDownloadLog.appendChild(logEntry);
            bulkDownloadLog.scrollTop = bulkDownloadLog.scrollHeight;
        }

        updateProgress();

        // Process URLs sequentially to avoid overloading the server
        for (const url of validUrls) {
            const urlType = getUrlType(url);
            const isSpotify = urlType === 'spotify';
            const endpoint = isSpotify ? 'download_spotify.php' : 'download_youtube.php';
            const icon = isSpotify ? '🟢' : '🔴';
            
            try {
                addLog(`${icon} ⏳ Téléchargement: ${url.substring(0, 50)}...`, false, isSpotify);
                
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: url })
                });
                const result = await response.json();
                
                if (result.status === 'success') {
                    success++;
                    addLog(`${icon} ✅ ${result.message}`, false, isSpotify);
                } else {
                    failed++;
                    addLog(`${icon} ❌ Erreur: ${result.message}`, true);
                }
            } catch (error) {
                failed++;
                addLog(`${icon} ❌ Erreur réseau: ${error.message}`, true);
            }
            
            completed++;
            updateProgress();
        }
        // Final summary
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-layer-group"></i> Télécharger tout';
        
        if (failed === 0) {
            bulkFormMessage.textContent = `✅ ${success} fichier(s) téléchargé(s) avec succès !`;
            bulkFormMessage.style.color = 'lightgreen';
            bulkYoutubeUrls.value = '';
        } else {
            bulkFormMessage.textContent = `${success} réussi(s), ${failed} échec(s)`;
            bulkFormMessage.style.color = failed === total ? 'var(--accent-danger)' : 'orange';
        }

        // Refresh music list
        renderMusicFiles('', true);
    }

    // MUSIC
    async function renderMusicFiles(filter = '', forceRefresh = false) {
        try {
            // Fetch only if the list is empty or a refresh is forced
            if (forceRefresh || allMusicFiles.length === 0) {
                const response = await fetch('get_music_files.php', { cache: 'no-store' });
                if (!response.ok) throw new Error(`Erreur serveur: ${response.statusText}`);
                const result = await response.json();
                if (result.status === 'error') throw new Error(result.message);
                allMusicFiles = result.files || [];
                allMusicFiles.sort((a, b) => a.localeCompare(b));
            }
            
            // Update stats
            const totalTracksEl = document.getElementById('totalTracksCount');
            if (totalTracksEl) totalTracksEl.textContent = allMusicFiles.length;

            const filteredFiles = allMusicFiles.filter(file => 
                formatSongPathToTitle(file).toLowerCase().includes(filter.toLowerCase())
            );

            if (filteredFiles.length === 0) {
                musicManagementContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-music"></i>
                        <p>${allMusicFiles.length === 0 ? 'Aucun fichier de musique trouvé' : 'Aucun résultat pour cette recherche'}</p>
                    </div>
                `;
                return;
            }
            
            musicManagementContainer.innerHTML = '';
            
            filteredFiles.forEach(file => {
                const item = document.createElement('div');
                item.className = 'modern-list-item';
                
                item.innerHTML = `
                    <div class="modern-list-item-image" style="display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-music" style="color: var(--text-secondary);"></i>
                    </div>
                    <div class="modern-list-item-info">
                        <div class="modern-list-item-title">${formatSongPathToTitle(file)}</div>
                        <div class="modern-list-item-subtitle">${file.split('.').pop().toUpperCase()}</div>
                    </div>
                    <div class="modern-list-item-actions">
                        <button class="btn-icon rename-music-btn" data-filename="${escapeHtml(file)}" title="Renommer">
                            <i class="fas fa-pencil-alt"></i>
                        </button>
                        <button class="btn-icon danger delete-music-btn" data-filename="${escapeHtml(file)}" title="Supprimer">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
                
                musicManagementContainer.appendChild(item);
            });

        } catch (error) {
            musicManagementContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Impossible de charger les fichiers: ${error.message}</p>
                </div>
            `;
        }
    }
    
    async function deleteMusicFile(filename) {
        if (!confirm(`Êtes-vous sûr de vouloir supprimer "${filename}" ?`)) return;
        try {
            const response = await fetch('delete_music.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: filename }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Erreur inconnue.');
            alert(result.message);
            renderMusicFiles(musicSearchInput.value, true); // Refresh list
        } catch (error) {
            alert(`Erreur: ${error.message}`);
        }
    }

    async function renameMusicFile(oldFilename) {
        const newFilename = prompt(`Entrez le nouveau nom pour "${oldFilename}":`, oldFilename);
        if (!newFilename || newFilename.trim() === '' || newFilename === oldFilename) return;

        try {
            const response = await fetch('rename_music.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ old_name: oldFilename, new_name: newFilename }),
            });
            const result = await response.json();
            if (!response.ok || result.status !== 'success') throw new Error(result.message || 'Erreur inconnue.');
            alert(result.message);
            renderMusicFiles(musicSearchInput.value, true); // Refresh list
        } catch (error) {
            alert(`Erreur: ${error.message}`);
        }
    }

    // PLAYLISTS
    async function fetchAllSongs() {
        try {
            const response = await fetch('get_all_songs.php', { cache: 'no-store' });
            const result = await response.json();
            if (result.status === 'success') {
                allAvailableSongs = result.files;
            } else {
                throw new Error(result.message || 'Error fetching all songs.');
            }
        } catch (error) {
            console.error('Failed to fetch all songs:', error);
        }
    }

    async function fetchPlaylists() {
        try {
            const response = await fetch('get_playlists.php', { cache: 'no-store' });
            if (!response.ok) throw new Error(`Erreur serveur: ${response.statusText}`);
            const result = await response.json();
            if (result.status !== 'success') throw new Error(result.message || 'Erreur de récupération.');
            
            currentActivePlaylist = result.data.active_playlist;
            allPlaylists = result.data.playlists || [];
            
            console.log('Playlists loaded:', allPlaylists.length);

        } catch (error) {
            console.error('Failed to fetch playlists:', error);
            allPlaylists = [];
        }
    }

    async function createPlaylist(playlistName) {
        try {
            const response = await fetch('create_playlist.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: playlistName })
            });
            const result = await response.json();
            if (result.status !== 'success') throw new Error(result.message || 'Erreur inconnue.');
            createPlaylistMessage.textContent = 'Playlist créée !';
            createPlaylistMessage.style.color = 'lightgreen';
            newPlaylistNameInput.value = '';
            fetchPlaylists();
        } catch (error) {
            createPlaylistMessage.textContent = `Erreur: ${error.message}`;
            createPlaylistMessage.style.color = 'var(--accent-danger)';
        } finally {
            setTimeout(() => createPlaylistMessage.textContent = '', 3000);
        }
    }

    async function deletePlaylist(playlistName) {
        if (!confirm(`Êtes-vous sûr de vouloir supprimer la playlist "${playlistName}" ?`)) return;
        try {
            const response = await fetch('delete_playlist.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: playlistName })
            });
            const result = await response.json();
            if (result.status !== 'success') throw new Error(result.message || 'Erreur inconnue.');
            fetchPlaylists();
        } catch (error) {
            alert(`Erreur: ${error.message}`);
        }
    }

    async function setActivePlaylist(playlistName) {
        try {
            const response = await fetch('set_active_playlist.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: playlistName })
            });
            const result = await response.json();
            if (result.status !== 'success') throw new Error(result.message || 'Erreur inconnue.');
            
            const message = playlistName ? 'Playlist activée !' : 'Playlist désactivée (retour au fallback).';
            alert(`${message} La radio changera de source dans les 30 secondes.`);
            fetchPlaylists();
        } catch (error) {
            alert(`Erreur: ${error.message}`);
        }
    }

    // PLAYLIST EDITOR
    function editPlaylist(playlist) {
        currentEditingPlaylist = JSON.parse(JSON.stringify(playlist)); // Deep copy
        editingPlaylistNameSpan.textContent = currentEditingPlaylist.name;
        
        adminSections.forEach(section => section.style.display = 'none');
        playlistEditModal.style.display = 'block';
        navLinks.forEach(navLink => navLink.classList.remove('active'));

        renderCurrentPlaylistSongs();
        renderAllAvailableSongsForEdit();
        renderSuggestions();
    }

    function cancelPlaylistEdit() {
        document.querySelector('.nav-link[data-section="playlists"]').click();
        fetchPlaylists();
        currentEditingPlaylist = null;
    }

    function renderCurrentPlaylistSongs() {
        currentPlaylistSongsUl.innerHTML = '';
        if (currentEditingPlaylist && currentEditingPlaylist.songs.length > 0) {
            currentEditingPlaylist.songs.forEach((songPath, index) => {
                const li = document.createElement('li');
                li.textContent = formatSongPathToTitle(songPath);
                const removeBtn = document.createElement('button');
                removeBtn.innerHTML = '<i class="fas fa-minus-circle"></i> RETIRER';
                removeBtn.className = 'btn btn-danger btn-sm';
                removeBtn.addEventListener('click', () => {
                    currentEditingPlaylist.songs.splice(index, 1);
                    renderCurrentPlaylistSongs();
                    renderSuggestions();
                });
                li.appendChild(removeBtn);
                currentPlaylistSongsUl.appendChild(li);
            });
        } else {
            currentPlaylistSongsUl.innerHTML = '<p>Aucune chanson dans cette playlist.</p>';
        }
    }

    function renderAllAvailableSongsForEdit(filter = '') {
        allAvailableSongsForEditUl.innerHTML = '';
        const filteredSongs = allAvailableSongs.filter(songPath =>
            formatSongPathToTitle(songPath).toLowerCase().includes(filter.toLowerCase())
        );

        if (filteredSongs.length === 0) {
            allAvailableSongsForEditUl.innerHTML = '<p>Aucune chanson trouvée.</p>';
            return;
        }

        filteredSongs.forEach(songPath => {
            const li = document.createElement('li');
            li.textContent = formatSongPathToTitle(songPath);
            const addBtn = document.createElement('button');
            addBtn.innerHTML = '<i class="fas fa-plus-circle"></i> AJOUTER';
            addBtn.className = 'btn btn-sm';
            addBtn.addEventListener('click', async () => {
                if (!currentEditingPlaylist.songs.includes(songPath)) {
                    currentEditingPlaylist.songs.push(songPath);
                    renderCurrentPlaylistSongs();
                    
                    // Force refresh metadata for the added song
                    const suggestionsUl = document.getElementById('harmonicSuggestions');
                    if(suggestionsUl) suggestionsUl.innerHTML = '<p>Analyse et recalcul du BPM en cours...</p>';
                    
                    const filename = songPath.split('/').pop();
                    await getMusicMetadata(filename, true);
                    
                    renderSuggestions();
                }
            });
            li.appendChild(addBtn);
            allAvailableSongsForEditUl.appendChild(li);
        });
    }

    async function savePlaylistChanges() {
        if (!currentEditingPlaylist) return;
        try {
            const response = await fetch('update_playlist.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: currentEditingPlaylist.name,
                    songs: currentEditingPlaylist.songs
                })
            });
            const result = await response.json();
            if (result.status !== 'success') throw new Error(result.message || 'Erreur inconnue.');
            alert('Playlist mise à jour !');
            cancelPlaylistEdit();
        } catch (error) {
            alert(`Erreur: ${error.message}`);
        }
    }

    // --- Artists Section ---
    async function fetchArtistProfiles() {
        try {
            const response = await fetch('get_artist_profiles.php', { cache: 'no-store' });
            if (!response.ok) throw new Error('Failed to fetch artist profiles');
            artistProfiles = await response.json();
            renderArtistProfiles();
            
            // Update sidebar user name for artist role (now that we have artist names)
            if (currentUser && currentUser.role === 'artist' && currentUser.artist_id) {
                const profile = artistProfiles.find(p => p.id === currentUser.artist_id);
                if (profile) {
                    const nameEl = document.getElementById('sidebarUserName');
                    const avatarEl = document.getElementById('sidebarUserAvatar');
                    if (nameEl) nameEl.textContent = profile.name;
                    if (avatarEl) avatarEl.textContent = profile.name.charAt(0).toUpperCase();
                }
            }
        } catch (error) {
            console.error('Error fetching artist profiles:', error);
            artistsManagementContainer.innerHTML = '<p style="color: var(--accent-danger);">Erreur de chargement des artistes.</p>';
        }
    }

    function renderArtistProfiles() {
        if (artistProfiles.length === 0) {
            artistsManagementContainer.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <i class="fas fa-users"></i>
                    <p>Aucun artiste dans le collectif</p>
                </div>
            `;
            return;
        }

        // Count releases per artist from allPosts
        const releaseCount = {};
        allPosts.forEach(post => {
            const postArtist = (post.artist || '').toLowerCase().trim();
            if (postArtist) {
                releaseCount[postArtist] = (releaseCount[postArtist] || 0) + 1;
            }
        });

        // Helper to get release count for an artist
        function getArtistReleaseCount(artist) {
            // Try matching by ID, name, or name without spaces
            const artistId = (artist.id || '').toLowerCase().trim();
            const artistName = (artist.name || '').toLowerCase().trim();
            
            // Check all possible matches
            return releaseCount[artistId] || releaseCount[artistName] || 0;
        }

        // If user is artist, show only their own profile card (no modal auto-open)
        if (currentUser && currentUser.role === 'artist') {
            const myProfile = artistProfiles.find(a => a.id === currentUser.artist_id);
            if (myProfile) {
                const header = document.querySelector('#artists .section-header h2');
                if (header) header.textContent = 'Mon Profil';
                const addBtn = document.getElementById('openAddArtistModal');
                if (addBtn) addBtn.style.display = 'none';
                
                const myReleases = getArtistReleaseCount(myProfile);
                
                // Show only my profile card
                artistsManagementContainer.innerHTML = '';
                const card = document.createElement('div');
                card.className = 'artist-card';
                
                const imageUrl = myProfile.image || 'images/placeholder.jpg';
                
                card.innerHTML = `
                    <div class="artist-card-badge">
                        <i class="fas fa-compact-disc"></i> ${myReleases} release${myReleases !== 1 ? 's' : ''}
                    </div>
                    <div class="artist-card-actions">
                        <button class="artist-action-btn edit-artist-btn" data-id="${escapeHtml(myProfile.id)}" title="Modifier mon profil">
                            <i class="fas fa-pencil-alt"></i>
                        </button>
                    </div>
                    <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(myProfile.name)}" class="artist-card-image" onerror="this.src='images/placeholder.jpg'">
                    <div class="artist-card-content">
                        <div class="artist-card-name">${escapeHtml(myProfile.name)}</div>
                        <div class="artist-card-location">
                            <i class="fas fa-map-marker-alt"></i> ${escapeHtml(myProfile.location || 'Non spécifié')}
                        </div>
                        <div class="artist-card-links">
                            ${myProfile.listenLink ? `<a href="${escapeHtml(myProfile.listenLink)}" target="_blank" class="artist-link-btn" title="Écouter"><i class="fas fa-headphones"></i></a>` : ''}
                            ${myProfile.watchLink ? `<a href="${escapeHtml(myProfile.watchLink)}" target="_blank" class="artist-link-btn" title="Regarder"><i class="fab fa-youtube"></i></a>` : ''}
                            ${myProfile.instagramLink ? `<a href="${escapeHtml(myProfile.instagramLink)}" target="_blank" class="artist-link-btn" title="Instagram"><i class="fab fa-instagram"></i></a>` : ''}
                        </div>
                    </div>
                `;
                
                artistsManagementContainer.appendChild(card);
                return;
            }
        }

        artistsManagementContainer.innerHTML = '';
        
        artistProfiles.forEach(artist => {
            // Permission check
            let canEdit = true;
            if (currentUser && currentUser.role === 'artist') {
                if (artist.id !== currentUser.artist_id) {
                    canEdit = false;
                }
            }

            const artistReleases = getArtistReleaseCount(artist);
            const card = document.createElement('div');
            card.className = 'artist-card';
            
            const imageUrl = artist.image || 'images/placeholder.jpg';
            
            card.innerHTML = `
                <div class="artist-card-badge">
                    <i class="fas fa-compact-disc"></i> ${artistReleases} release${artistReleases !== 1 ? 's' : ''}
                </div>
                ${canEdit ? `
                <div class="artist-card-actions">
                    <button class="artist-action-btn edit-artist-btn" data-id="${escapeHtml(artist.id)}" title="Modifier">
                        <i class="fas fa-pencil-alt"></i>
                    </button>
                    <button class="artist-action-btn danger delete-artist-btn" data-id="${escapeHtml(artist.id)}" title="Supprimer">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                ` : ''}
                <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(artist.name)}" class="artist-card-image" onerror="this.src='images/placeholder.jpg'">
                <div class="artist-card-content">
                    <div class="artist-card-name">${escapeHtml(artist.name)}</div>
                    <div class="artist-card-location">
                        <i class="fas fa-map-marker-alt"></i> ${escapeHtml(artist.location || 'Non spécifié')}
                    </div>
                    <div class="artist-card-links">
                        ${artist.listenLink ? `<a href="${escapeHtml(artist.listenLink)}" target="_blank" class="artist-link-btn" title="Écouter"><i class="fas fa-headphones"></i></a>` : ''}
                        ${artist.watchLink ? `<a href="${escapeHtml(artist.watchLink)}" target="_blank" class="artist-link-btn" title="Regarder"><i class="fab fa-youtube"></i></a>` : ''}
                        ${artist.instagramLink ? `<a href="${escapeHtml(artist.instagramLink)}" target="_blank" class="artist-link-btn" title="Instagram"><i class="fab fa-instagram"></i></a>` : ''}
                    </div>
                </div>
            `;
            
            artistsManagementContainer.appendChild(card);
        });
    }

    async function saveArtistProfile(formData) {
        // Handle image upload first if present
        const imageFile = formData.get('image');
        let imagePath = formData.get('currentImage');

        if (imageFile && imageFile.size > 0) {
            if (imageFile.size > MAX_FILE_SIZE) {
                throw new Error(`L'image est trop volumineuse (Max: ${MAX_FILE_SIZE / 1024 / 1024}MB).`);
            }

            const uploadData = new FormData();
            uploadData.append('image', imageFile);
            try {
                const uploadRes = await fetch('upload_artist_image.php', { method: 'POST', body: uploadData });
                const uploadResult = await uploadRes.json();
                if (uploadResult.status === 'success') {
                    imagePath = uploadResult.filepath;
                } else {
                    throw new Error(uploadResult.message);
                }
            } catch (e) {
                throw new Error('Erreur upload image: ' + e.message);
            }
        }

        const artistData = {
            id: formData.get('editingArtistId') || ('artist_' + Date.now()),
            name: formData.get('name'),
            location: formData.get('location'),
            image: imagePath,
            listenLink: formData.get('listenLink'),
            watchLink: formData.get('watchLink'),
            instagramLink: formData.get('instagramLink')
        };

        // Update or Add
        const existingIndex = artistProfiles.findIndex(a => a.id === artistData.id);
        if (existingIndex >= 0) {
            artistProfiles[existingIndex] = artistData;
        } else {
            artistProfiles.push(artistData);
        }

        await saveProfilesToServer();
        closeArtistModal();
    }

    async function saveProfilesToServer() {
        try {
            const response = await fetch('save_artist_profiles.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(artistProfiles)
            });
            const result = await response.json();
            if (result.status !== 'success') throw new Error(result.message);
            fetchArtistProfiles();
            populateArtistDropdown(); // Refresh dropdowns
            populateArtistFilterDropdown(); // Refresh filters
            artistFormMessage.textContent = 'Sauvegardé !';
            artistFormMessage.style.color = 'lightgreen';
            setTimeout(() => artistFormMessage.textContent = '', 3000);
        } catch (error) {
            artistFormMessage.textContent = 'Erreur: ' + error.message;
            artistFormMessage.style.color = 'var(--accent-danger)';
        }
    }

    function deleteArtistProfile(id) {
        if (!confirm('Supprimer cet artiste ?')) return;
        artistProfiles = artistProfiles.filter(a => a.id !== id);
        saveProfilesToServer();
    }

    function editArtistProfile(id) {
        const artist = artistProfiles.find(a => a.id === id);
        if (!artist) return;

        openArtistModal(artist);
    }

    function resetArtistForm() {
        adminArtistForm.reset();
        document.getElementById('editingArtistId').value = '';
        document.getElementById('currentArtistImage').value = '';
        artistImagePreview.innerHTML = '';
        cancelArtistEditBtn.style.display = 'none';
        adminArtistForm.querySelector('button[type="submit"]').innerHTML = '<i class="fas fa-plus"></i> Enregistrer l\'artiste';
    }

    // Event Listeners
    if (adminArtistForm) {
        adminArtistForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(adminArtistForm);
            try {
                await saveArtistProfile(formData);
            } catch (error) {
                artistFormMessage.textContent = error.message;
                artistFormMessage.style.color = 'var(--accent-danger)';
            }
        });
    }

    if (cancelArtistEditBtn) {
        cancelArtistEditBtn.addEventListener('click', resetArtistForm);
    }

    if (artistsManagementContainer) {
        artistsManagementContainer.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.edit-artist-btn');
            const deleteBtn = e.target.closest('.delete-artist-btn');
            if (editBtn) editArtistProfile(editBtn.dataset.id);
            if (deleteBtn) deleteArtistProfile(deleteBtn.dataset.id);
        });
    }

    // --- Event Listeners (Restored) ---
    
    // Timeline
    if (adminTimelineForm) {
        adminTimelineForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(adminTimelineForm);
            
            // Check file size
            const imageFile = formData.get('image');
            if (imageFile && imageFile.size > MAX_FILE_SIZE) {
                adminFormMessage.textContent = `L'image est trop volumineuse (Max: ${MAX_FILE_SIZE / 1024 / 1024}MB).`;
                adminFormMessage.style.color = 'var(--accent-danger)';
                return;
            }

            const editingId = formData.get('editingPostId');
            if (editingId) {
                formData.append('id', editingId);
                updatePost(formData);
            } else {
                addPost(formData);
            }
        });
    }

    if (postsManagementContainer) {
        postsManagementContainer.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.edit-post-btn');
            const deleteBtn = e.target.closest('.delete-post-btn');
            
            if (editBtn) editPost(editBtn.dataset.id);
            if (deleteBtn) deletePost(deleteBtn.dataset.id);
        });
    }

    if (postArtistFilter) {
        postArtistFilter.addEventListener('change', (e) => {
            renderAdminPosts(e.target.value);
        });
    }

    // Posts View Toggle
    const viewGridBtn = document.getElementById('viewGridBtn');
    const viewListBtn = document.getElementById('viewListBtn');
    
    if (viewGridBtn) {
        viewGridBtn.addEventListener('click', () => {
            currentPostsView = 'grid';
            viewGridBtn.classList.add('active');
            viewListBtn.classList.remove('active');
            renderAdminPosts(postArtistFilter ? postArtistFilter.value : 'all');
        });
    }
    
    if (viewListBtn) {
        viewListBtn.addEventListener('click', () => {
            currentPostsView = 'list';
            viewListBtn.classList.add('active');
            viewGridBtn.classList.remove('active');
            renderAdminPosts(postArtistFilter ? postArtistFilter.value : 'all');
        });
    }

    // Music - YouTube
    if (youtubeDownloadForm) {
        youtubeDownloadForm.addEventListener('submit', (e) => {
            e.preventDefault();
            downloadYoutube(youtubeUrlInput.value);
        });
    }

    // Music - Spotify
    if (spotifyDownloadForm) {
        spotifyDownloadForm.addEventListener('submit', (e) => {
            e.preventDefault();
            downloadSpotify(spotifyUrlInput.value);
        });
    }

    // Bulk Download
    if (bulkDownloadForm) {
        bulkDownloadForm.addEventListener('submit', (e) => {
            e.preventDefault();
            bulkDownloadYoutube(bulkYoutubeUrls.value);
        });
    }

    if (musicSearchInput) {
        musicSearchInput.addEventListener('input', (e) => {
            renderMusicFiles(e.target.value);
        });
    }

    if (musicManagementContainer) {
        musicManagementContainer.addEventListener('click', (e) => {
            const renameBtn = e.target.closest('.rename-music-btn');
            const deleteBtn = e.target.closest('.delete-music-btn');
            if (renameBtn) renameMusicFile(renameBtn.dataset.filename);
            if (deleteBtn) deleteMusicFile(deleteBtn.dataset.filename);
        });
    }

    if (skipSongBtn) {
        skipSongBtn.addEventListener('click', async () => {
            await fetch('skip_song.php');
        });
    }

    // Playlists - Legacy listener removed, using new system in playlist editor section

    if (existingPlaylistsContainer) {
        existingPlaylistsContainer.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('.delete-playlist-btn');
            const editBtn = e.target.closest('.edit-playlist-btn');
            const activateBtn = e.target.closest('.activate-playlist-btn');
            const deactivateBtn = e.target.closest('.deactivate-playlist-btn');

            if (deleteBtn) deletePlaylist(deleteBtn.dataset.playlistName);
            if (editBtn) openPlaylistEditor(editBtn.dataset.playlistName);
            if (activateBtn) setActivePlaylist(activateBtn.dataset.playlistName);
            if (deactivateBtn) setActivePlaylist(null);
        });
    }

    // Playlist Editor
    if (songSearchInput) {
        songSearchInput.addEventListener('input', (e) => {
            renderAllAvailableSongsForEdit(e.target.value);
        });
    }

    if (savePlaylistChangesBtn) {
        savePlaylistChangesBtn.addEventListener('click', savePlaylistChanges);
    }

    if (cancelPlaylistEditBtn) {
        cancelPlaylistEditBtn.addEventListener('click', cancelPlaylistEdit);
    }

    // --- Modal Management ---
    function openPostModal(post = null) {
        if (!postModal) return;
        
        const modalTitle = document.getElementById('postModalTitle');
        const submitBtn = postModal.querySelector('button[type="submit"]');
        
        if (post) {
            // Edit mode
            if (modalTitle) modalTitle.textContent = 'Modifier le post';
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Enregistrer';
            
            document.getElementById('postTitle').value = post.title;
            document.getElementById('postArtist').value = post.artist;
            document.getElementById('postDate').value = post.date;
            document.getElementById('postLink').value = post.link;
            
            let editingIdField = adminTimelineForm.querySelector('input[name="editingPostId"]');
            if (!editingIdField) {
                editingIdField = document.createElement('input');
                editingIdField.type = 'hidden';
                editingIdField.name = 'editingPostId';
                adminTimelineForm.appendChild(editingIdField);
            }
            editingIdField.value = post.id;
        } else {
            // Add mode
            if (modalTitle) modalTitle.textContent = 'Nouveau post';
            submitBtn.innerHTML = '<i class="fas fa-plus"></i> Ajouter';
            adminTimelineForm.reset();
            
            const editingIdField = adminTimelineForm.querySelector('input[name="editingPostId"]');
            if (editingIdField) editingIdField.value = '';
        }
        
        postModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    function closePostModal() {
        if (!postModal) return;
        postModal.classList.remove('active');
        document.body.style.overflow = '';
        adminTimelineForm.reset();
        
        const editingIdField = adminTimelineForm.querySelector('input[name="editingPostId"]');
        if (editingIdField) editingIdField.value = '';
        
        if (adminFormMessage) adminFormMessage.textContent = '';
    }
    
    function openArtistModal(artist = null) {
        if (!artistModal) return;
        
        const modalTitle = document.getElementById('artistModalTitle');
        const submitBtn = artistModal.querySelector('button[type="submit"]');
        
        if (artist) {
            // Edit mode
            if (modalTitle) modalTitle.textContent = 'Modifier l\'artiste';
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Enregistrer';
            
            document.getElementById('editingArtistId').value = artist.id;
            document.getElementById('artistName').value = artist.name;
            document.getElementById('artistLocation').value = artist.location;
            document.getElementById('artistListenLink').value = artist.listenLink || '';
            document.getElementById('artistWatchLink').value = artist.watchLink || '';
            document.getElementById('artistInstagramLink').value = artist.instagramLink || '';
            document.getElementById('currentArtistImage').value = artist.image || '';
            
            if (artist.image && artistImagePreview) {
                artistImagePreview.innerHTML = `<img src="${artist.image}" style="width: 100px; border-radius: 8px;">`;
            } else if (artistImagePreview) {
                artistImagePreview.innerHTML = '';
            }
        } else {
            // Add mode
            if (modalTitle) modalTitle.textContent = 'Nouvel artiste';
            submitBtn.innerHTML = '<i class="fas fa-plus"></i> Ajouter';
            resetArtistForm();
        }
        
        artistModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    function closeArtistModal() {
        if (!artistModal) return;
        artistModal.classList.remove('active');
        document.body.style.overflow = '';
        resetArtistForm();
        
        if (artistFormMessage) artistFormMessage.textContent = '';
    }
    
    // Post Modal event listeners
    const openAddPostModalBtn = document.getElementById('openAddPostModal');
    if (openAddPostModalBtn) {
        openAddPostModalBtn.addEventListener('click', () => openPostModal(null));
    }
    
    const closePostModalBtn = document.getElementById('closePostModal');
    if (closePostModalBtn) {
        closePostModalBtn.addEventListener('click', closePostModal);
    }
    
    const cancelPostModalBtn = document.getElementById('cancelPostModal');
    if (cancelPostModalBtn) {
        cancelPostModalBtn.addEventListener('click', closePostModal);
    }
    
    // Artist Modal event listeners
    const openAddArtistModalBtn = document.getElementById('openAddArtistModal');
    if (openAddArtistModalBtn) {
        openAddArtistModalBtn.addEventListener('click', () => openArtistModal(null));
    }
    
    const closeArtistModalBtn = document.getElementById('closeArtistModal');
    if (closeArtistModalBtn) {
        closeArtistModalBtn.addEventListener('click', closeArtistModal);
    }
    
    const cancelArtistModalBtn = document.getElementById('cancelArtistModal');
    if (cancelArtistModalBtn) {
        cancelArtistModalBtn.addEventListener('click', closeArtistModal);
    }
    
    // Close modals on overlay click
    if (postModal) {
        postModal.addEventListener('click', (e) => {
            if (e.target === postModal) closePostModal();
        });
    }
    
    if (artistModal) {
        artistModal.addEventListener('click', (e) => {
            if (e.target === artistModal) closeArtistModal();
        });
    }
    
    // Close modals on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (postModal && postModal.classList.contains('active')) closePostModal();
            if (artistModal && artistModal.classList.contains('active')) closeArtistModal();
        }
    });

    // --- Analytics Section ---
    let audienceChartInstance = null;
    let heatmapChartInstance = null;
    let previousAnalyticsData = null;

    async function loadAnalyticsHeader() {
        try {
            const res = await fetch('api_analytics.php?type=stats_header');
            const json = await res.json();
            if (json.status === 'success') {
                const data = json.data;
                
                // Update values
                document.getElementById('statPeak').textContent = data.peak_30d;
                document.getElementById('statAvg').textContent = data.avg_24h;
                document.getElementById('statTracks').textContent = data.tracks_24h;
                
                // Update comparisons if we have previous data
                updateKpiComparison('statPeakComparison', data.peak_30d, data.peak_prev_30d, 'vs mois dernier');
                updateKpiComparison('statAvgComparison', data.avg_24h, data.avg_prev_24h, 'vs hier');
                updateKpiComparison('statTracksComparison', data.tracks_24h, data.tracks_prev_24h, 'vs hier');
            }
        } catch (e) { console.error(e); }
    }
    
    function updateKpiComparison(elementId, current, previous, label) {
        const el = document.getElementById(elementId);
        if (!el) return;
        
        const currentVal = parseFloat(current) || 0;
        const previousVal = parseFloat(previous) || 0;
        
        if (previousVal === 0) {
            el.className = 'analytics-kpi-comparison neutral';
            el.innerHTML = `<i class="fas fa-minus"></i> <span>${label}</span>`;
            return;
        }
        
        const diff = currentVal - previousVal;
        const percentChange = ((diff / previousVal) * 100).toFixed(0);
        
        if (diff > 0) {
            el.className = 'analytics-kpi-comparison up';
            el.innerHTML = `<i class="fas fa-arrow-up"></i> <span>+${percentChange}% ${label}</span>`;
        } else if (diff < 0) {
            el.className = 'analytics-kpi-comparison down';
            el.innerHTML = `<i class="fas fa-arrow-down"></i> <span>${percentChange}% ${label}</span>`;
        } else {
            el.className = 'analytics-kpi-comparison neutral';
            el.innerHTML = `<i class="fas fa-equals"></i> <span>= ${label}</span>`;
        }
    }

    window.loadAudienceChart = async function(range) {
        try {
            const res = await fetch(`api_analytics.php?type=audience&range=${range}`);
            const json = await res.json();
            
            if (json.status !== 'success') return;

            const ctx = document.getElementById('audienceChart').getContext('2d');
            
            if (audienceChartInstance) audienceChartInstance.destroy();

            const labels = json.data.map(d => {
                // La date est déjà stockée en local (Europe/Paris) dans la BDD
                // On la parse directement sans ajouter 'Z' (qui forcerait UTC)
                // Remplacement de l'espace par T pour compatibilité Safari/iOS : "2023-12-29 02:00:00" -> "2023-12-29T02:00:00"
                const dateStr = d.timestamp.replace(' ', 'T');
                const date = new Date(dateStr); 
                
                return range === '24h' 
                    ? date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                    : date.toLocaleDateString() + ' ' + date.getHours() + 'h';
            });
            
            const values = json.data.map(d => d.listeners);

            audienceChartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Auditeurs',
                        data: values,
                        borderColor: '#007bff',
                        backgroundColor: 'rgba(0, 123, 255, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: { beginAtZero: true, grid: { color: '#333' } },
                        x: { grid: { display: false } }
                    },
                    interaction: {
                        intersect: false,
                        mode: 'index',
                    },
                }
            });
        } catch (e) { console.error(e); }
    };

    async function loadTopLists() {
        // Top Tracks
        try {
            const res = await fetch('api_analytics.php?type=top_tracks');
            const json = await res.json();
            const list = document.getElementById('topTracksList');
            list.innerHTML = '';
            if (json.status === 'success') {
                json.data.forEach((item, index) => {
                    const li = document.createElement('li');
                    li.innerHTML = `
                        <div style="display:flex; justify-content:space-between; width:100%;">
                            <span><strong>${index+1}.</strong> ${escapeHtml(item.title)} <small style="color:#666">(${escapeHtml(item.artist)})</small></span>
                            <span class="badge" style="background:#333; padding:2px 6px; border-radius:4px;">${item.count} plays</span>
                        </div>
                    `;
                    list.appendChild(li);
                });
            }
        } catch (e) {}

        // Top Artists
        try {
            const res = await fetch('api_analytics.php?type=top_artists');
            const json = await res.json();
            const list = document.getElementById('topArtistsList');
            list.innerHTML = '';
            if (json.status === 'success') {
                json.data.forEach((item, index) => {
                    const li = document.createElement('li');
                    li.innerHTML = `
                        <div style="display:flex; justify-content:space-between; width:100%;">
                            <span><strong>${index+1}.</strong> ${escapeHtml(item.artist)}</span>
                            <span class="badge" style="background:#333; padding:2px 6px; border-radius:4px;">${item.count} plays</span>
                        </div>
                    `;
                    list.appendChild(li);
                });
            }
        } catch (e) {}
    }

    async function loadHeatmap() {
        try {
            const res = await fetch('api_analytics.php?type=heatmap');
            const json = await res.json();
            if (json.status !== 'success') return;

            // Transform data for chart (Group by Hour)
            // We want to see which hour of the day is busiest on average
            const hours = new Array(24).fill(0);
            const counts = new Array(24).fill(0);

            json.data.forEach(d => {
                const h = parseInt(d.hour_of_day);
                hours[h] += parseFloat(d.avg_listeners);
                counts[h]++;
            });

            const avgByHour = hours.map((total, i) => counts[i] ? total / counts[i] : 0);

            const ctx = document.getElementById('heatmapChart').getContext('2d');
            if (heatmapChartInstance) heatmapChartInstance.destroy();

            heatmapChartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: Array.from({length: 24}, (_, i) => i + 'h'),
                    datasets: [{
                        label: 'Auditeurs Moyens',
                        data: avgByHour,
                        backgroundColor: avgByHour.map(v => {
                            // Color scale based on value
                            const max = Math.max(...avgByHour);
                            const opacity = max > 0 ? (v / max) : 0.5;
                            return `rgba(220, 53, 69, ${opacity})`; // Red scale
                        }),
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, grid: { color: '#333' } },
                        x: { grid: { display: false } }
                    }
                }
            });

        } catch (e) {}
    }

    // =============================================
    // NEW PLAYLIST MANAGEMENT SYSTEM
    // =============================================
    
    const playlistsGrid = document.getElementById('playlistsGrid');
    const playlistEditorPanel = document.getElementById('playlistEditorPanel');
    const createPlaylistBtn = document.getElementById('createPlaylistBtn');
    const createPlaylistModal = document.getElementById('createPlaylistModal');
    const closeCreateModal = document.getElementById('closeCreateModal');
    const cancelCreatePlaylist = document.getElementById('cancelCreatePlaylist');
    const newCreatePlaylistForm = document.getElementById('createPlaylistForm');
    const backToPlaylistsBtn = document.getElementById('backToPlaylistsBtn');
    
    // Render playlists as cards
    function renderPlaylistsGrid() {
        if (!playlistsGrid) return;
        
        playlistsGrid.innerHTML = '';
        
        // Add playlist cards
        allPlaylists.forEach(playlist => {
            const isLive = playlist.name === currentActivePlaylist;
            const color = playlist.color || '#00ff68';
            const icon = playlist.icon || 'music';
            
            // Calculate total duration (estimate ~3min per song if no metadata)
            const songCount = playlist.songs.length;
            const estimatedMinutes = songCount * 3;
            const hours = Math.floor(estimatedMinutes / 60);
            const mins = estimatedMinutes % 60;
            const durationStr = hours > 0 ? `${hours}h ${mins}min` : `${mins} min`;
            
            // Get first 3-4 tracks for preview
            const previewTracks = playlist.songs.slice(0, 4);
            
            const card = document.createElement('div');
            card.className = `playlist-card ${isLive ? 'is-live' : ''}`;
            card.style.setProperty('--card-color', color);
            card.dataset.playlistName = playlist.name;
            
            card.innerHTML = `
                ${isLive ? `
                <div class="playlist-now-playing-indicator">
                    <span></span><span></span><span></span>
                </div>
                ` : ''}
                <div class="playlist-card-icon" style="color: ${color}">
                    <i class="fas fa-${icon}"></i>
                </div>
                <div class="playlist-card-name">${escapeHtml(playlist.name)}</div>
                <div class="playlist-card-meta">
                    <span>${songCount} morceaux</span>
                    ${isLive ? '<span class="live-badge">LIVE</span>' : ''}
                </div>
                <div class="playlist-card-duration">
                    <i class="far fa-clock"></i> ~${durationStr}
                </div>
                ${previewTracks.length > 0 ? `
                <div class="playlist-tracks-preview">
                    ${previewTracks.map(song => {
                        const songName = song.split('/').pop().replace(/\.[^/.]+$/, '').substring(0, 30);
                        return `<div class="playlist-track-mini"><i class="fas fa-music"></i><span>${escapeHtml(songName)}</span></div>`;
                    }).join('')}
                    ${songCount > 4 ? `<div class="playlist-track-mini" style="opacity: 0.5;"><i class="fas fa-ellipsis-h"></i><span>+${songCount - 4} autres</span></div>` : ''}
                </div>
                ` : ''}
            `;
            
            card.addEventListener('click', () => openNewPlaylistEditor(playlist));
            playlistsGrid.appendChild(card);
        });
        
        // Add "create" card at the end
        const createCard = document.createElement('div');
        createCard.className = 'playlist-card create-card';
        createCard.innerHTML = `
            <i class="fas fa-plus"></i>
            <span>Nouvelle Playlist</span>
        `;
        createCard.addEventListener('click', () => {
            if (createPlaylistModal) createPlaylistModal.style.display = 'flex';
        });
        playlistsGrid.appendChild(createCard);
    }
    
    // Open the new playlist editor
    function openNewPlaylistEditor(playlist) {
        currentEditingPlaylist = JSON.parse(JSON.stringify(playlist));
        
        // Hide grid, show editor
        const grid = document.getElementById('playlistsGrid');
        const editor = document.getElementById('playlistEditorPanel');
        
        if (grid) grid.style.display = 'none';
        if (editor) editor.style.display = 'block';
        
        // Populate editor
        const nameInput = document.getElementById('editPlaylistNameInput');
        const songCountEl = document.getElementById('editorSongCount');
        const statusEl = document.getElementById('editorPlaylistStatus');
        const activateBtn = document.getElementById('activatePlaylistBtn');
        
        if (nameInput) nameInput.value = playlist.name;
        if (songCountEl) songCountEl.textContent = `${playlist.songs.length} morceaux`;
        
        const isLive = playlist.name === currentActivePlaylist;
        if (statusEl) {
            statusEl.textContent = isLive ? 'LIVE' : '';
            statusEl.className = `status-badge ${isLive ? 'live' : ''}`;
        }
        if (activateBtn) {
            activateBtn.disabled = isLive;
            activateBtn.innerHTML = isLive ? '<i class="fas fa-broadcast-tower"></i> En LIVE' : '<i class="fas fa-broadcast-tower"></i> Mettre en LIVE';
        }
        
        renderNewPlaylistSongs();
        renderNewLibrarySongs();
        renderNewSuggestions();
    }
    
    // Close editor, back to grid
    function closePlaylistEditor() {
        if (playlistsGrid) playlistsGrid.style.display = 'grid';
        if (playlistEditorPanel) playlistEditorPanel.style.display = 'none';
        currentEditingPlaylist = null;
        fetchPlaylists().then(() => renderPlaylistsGrid());
    }
    
    // Render songs in the playlist (left column)
    function renderNewPlaylistSongs() {
        const listEl = document.getElementById('playlistSongsList');
        const countEl = document.getElementById('playlistSongsCount');
        const hintEl = document.getElementById('playlistDropHint');
        
        if (!listEl || !currentEditingPlaylist) return;
        
        listEl.innerHTML = '';
        
        if (countEl) countEl.textContent = currentEditingPlaylist.songs.length;
        if (hintEl) hintEl.style.display = currentEditingPlaylist.songs.length === 0 ? 'block' : 'none';
        
        currentEditingPlaylist.songs.forEach((songPath, index) => {
            const li = document.createElement('li');
            li.className = 'song-item';
            li.draggable = true;
            li.dataset.index = index;
            li.dataset.path = songPath;
            
            li.innerHTML = `
                <span class="drag-handle"><i class="fas fa-grip-vertical"></i></span>
                <span class="song-title">${formatSongPathToTitle(songPath)}</span>
                <div class="song-actions">
                    <button class="btn-icon btn-remove" title="Retirer"><i class="fas fa-times"></i></button>
                </div>
            `;
            
            // Remove button
            li.querySelector('.btn-remove').addEventListener('click', (e) => {
                e.stopPropagation();
                currentEditingPlaylist.songs.splice(index, 1);
                renderNewPlaylistSongs();
                renderNewSuggestions();
                autoSavePlaylist();
            });
            
            // Drag events
            li.addEventListener('dragstart', handleDragStart);
            li.addEventListener('dragend', handleDragEnd);
            li.addEventListener('dragover', handleDragOver);
            li.addEventListener('drop', handleDrop);
            
            listEl.appendChild(li);
        });
    }
    
    // Drag & Drop handlers
    let draggedItem = null;
    
    function handleDragStart(e) {
        draggedItem = this;
        this.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    }
    
    function handleDragEnd() {
        this.classList.remove('dragging');
        draggedItem = null;
    }
    
    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }
    
    function handleDrop(e) {
        e.preventDefault();
        if (!draggedItem || draggedItem === this) return;
        
        const fromIndex = parseInt(draggedItem.dataset.index);
        const toIndex = parseInt(this.dataset.index);
        
        // Reorder array
        const [removed] = currentEditingPlaylist.songs.splice(fromIndex, 1);
        currentEditingPlaylist.songs.splice(toIndex, 0, removed);
        
        renderNewPlaylistSongs();
        autoSavePlaylist();
    }
    
    // Render library songs (right column)
    function renderNewLibrarySongs(filter = '', genreFilter = '') {
        const listEl = document.getElementById('librarySongsList');
        if (!listEl) return;
        
        listEl.innerHTML = '';
        
        const playlistSongs = currentEditingPlaylist ? currentEditingPlaylist.songs : [];
        const filteredSongs = allAvailableSongs.filter(songPath => {
            const filename = songPath.split('/').pop();
            const meta = metadataCache[filename];
            const matchesFilter = formatSongPathToTitle(songPath).toLowerCase().includes(filter.toLowerCase());
            const matchesGenre = !genreFilter || (meta && meta.genre && meta.genre.toLowerCase().includes(genreFilter.toLowerCase()));
            const notInPlaylist = !playlistSongs.includes(songPath);
            return matchesFilter && matchesGenre && notInPlaylist;
        });
        
        if (filteredSongs.length === 0) {
            listEl.innerHTML = '<li class="song-item" style="justify-content: center; color: var(--text-secondary);">Aucun morceau trouvé</li>';
            return;
        }
        
        filteredSongs.forEach(songPath => {
            const filename = songPath.split('/').pop();
            const meta = metadataCache[filename];
            
            const li = document.createElement('li');
            li.className = 'song-item';
            
            // Build metadata badges
            let metaBadges = '';
            if (meta) {
                if (meta.bpm) metaBadges += `<span class="song-badge badge-bpm">${meta.bpm}</span>`;
                if (meta.camelot) metaBadges += `<span class="song-badge badge-key">${meta.camelot}</span>`;
                if (meta.genre) metaBadges += `<span class="song-badge badge-genre">${meta.genre}</span>`;
            }
            
            li.innerHTML = `
                <div class="song-info">
                    <span class="song-title">${formatSongPathToTitle(songPath)}</span>
                    ${metaBadges ? `<div class="song-badges">${metaBadges}</div>` : ''}
                </div>
                <div class="song-actions" style="opacity: 1;">
                    <button class="btn-icon btn-add" title="Ajouter"><i class="fas fa-plus"></i></button>
                </div>
            `;
            
            li.querySelector('.btn-add').addEventListener('click', async () => {
                if (!currentEditingPlaylist.songs.includes(songPath)) {
                    currentEditingPlaylist.songs.push(songPath);
                    renderNewPlaylistSongs();
                    renderNewLibrarySongs(filter, genreFilter);
                    renderNewSuggestions();
                    autoSavePlaylist();
                }
            });
            
            listEl.appendChild(li);
        });
    }
    
    // Render suggestions with filters and sorting
    let currentSuggestions = [];
    let suggestionSortBy = 'score';
    let suggestionGenreFilter = '';
    
    async function renderNewSuggestions() {
        const containerEl = document.getElementById('harmonicSuggestionsList');
        const basedOnEl = document.getElementById('suggestionsBasedOn');
        const genreFilterEl = document.getElementById('suggestionsGenreFilter');
        
        if (!containerEl) return;
        
        if (!currentEditingPlaylist || currentEditingPlaylist.songs.length === 0) {
            containerEl.innerHTML = `
                <div class="suggestion-empty">
                    <i class="fas fa-music"></i>
                    <p>Ajoutez des morceaux pour voir des suggestions harmoniques</p>
                </div>`;
            if (basedOnEl) basedOnEl.textContent = '-';
            return;
        }
        
        containerEl.innerHTML = `
            <div class="suggestion-empty">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Analyse en cours...</p>
            </div>`;
        
        const lastSongPath = currentEditingPlaylist.songs[currentEditingPlaylist.songs.length - 1];
        const lastSongFilename = lastSongPath.split('/').pop();
        
        if (basedOnEl) basedOnEl.textContent = formatSongPathToTitle(lastSongPath);
        
        const lastSongMeta = await getMusicMetadata(lastSongFilename);
        
        // Check if we have valid metadata
        const hasValidMeta = lastSongMeta && !lastSongMeta.error && lastSongMeta.camelot && lastSongMeta.camelot !== 'Unknown' && lastSongMeta.bpm > 0;
        
        if (!hasValidMeta) {
            containerEl.innerHTML = `
                <div style="padding: 15px; background: rgba(255,165,0,0.1); border-radius: 10px; margin-bottom: 10px;">
                    <p style="color: #ffa500; margin: 0 0 10px 0; font-size: 0.85rem;">
                        <i class="fas fa-exclamation-triangle"></i> 
                        Métadonnées non disponibles pour ce morceau
                    </p>
                    <button class="btn btn-sm" onclick="getMusicMetadata('${lastSongFilename}', true).then(() => renderNewSuggestions())">
                        <i class="fas fa-sync"></i> Analyser maintenant
                    </button>
                </div>
            `;
            
            // Show some random songs as fallback
            renderFallbackSuggestions(containerEl);
            return;
        }
        
        const targetBpm = lastSongMeta.bpm;
        const targetKey = lastSongMeta.camelot;
        const targetGenre = lastSongMeta.genre;
        const targetEnergy = lastSongMeta.energy;
        const compatibleKeys = camelotWheel[targetKey]?.compatible || [];
        
        // Find compatible songs with scoring
        currentSuggestions = [];
        for (const songPath of allAvailableSongs) {
            if (currentEditingPlaylist.songs.includes(songPath)) continue;
            
            const filename = songPath.split('/').pop();
            const meta = metadataCache[filename];
            if (!meta || !meta.camelot || meta.camelot === 'Unknown') continue;
            
            // Calculate compatibility score
            let score = 0;
            let keyMatch = false;
            
            // Key compatibility (primary - 50 pts)
            if (meta.camelot === targetKey) {
                score += 60; // Same key = perfect
                keyMatch = true;
            } else if (compatibleKeys.includes(meta.camelot)) {
                score += 50;
                keyMatch = true;
            }
            
            // BPM proximity (40 pts max)
            const bpmDiff = Math.abs(meta.bpm - targetBpm);
            const bpmRatio = bpmDiff / targetBpm;
            if (bpmRatio <= 0.03) score += 40;
            else if (bpmRatio <= 0.06) score += 30;
            else if (bpmRatio <= 0.10) score += 20;
            else if (bpmRatio <= 0.15) score += 10;
            
            // Genre match (20 pts)
            if (targetGenre && meta.genre && meta.genre.toLowerCase() === targetGenre.toLowerCase()) {
                score += 20;
            }
            
            // Energy proximity (10 pts)
            if (targetEnergy && meta.energy) {
                const energyDiff = Math.abs(meta.energy - targetEnergy);
                if (energyDiff <= 0.15) score += 10;
                else if (energyDiff <= 0.25) score += 5;
            }
            
            if (score >= 40) { // Minimum threshold
                currentSuggestions.push({ 
                    path: songPath, 
                    meta, 
                    score, 
                    bpmDiff: Math.round(bpmDiff),
                    keyMatch,
                    targetBpm,
                    targetKey
                });
            }
        }
        
        // Apply genre filter if set
        suggestionGenreFilter = genreFilterEl?.value || '';
        
        displaySuggestions(containerEl);
    }
    
    function displaySuggestions(containerEl) {
        if (!containerEl) containerEl = document.getElementById('harmonicSuggestionsList');
        if (!containerEl) return;
        
        let filtered = [...currentSuggestions];
        
        // Apply genre filter
        if (suggestionGenreFilter) {
            filtered = filtered.filter(s => s.meta.genre === suggestionGenreFilter);
        }
        
        // Sort
        if (suggestionSortBy === 'score') {
            filtered.sort((a, b) => b.score - a.score);
        } else if (suggestionSortBy === 'bpm') {
            filtered.sort((a, b) => a.bpmDiff - b.bpmDiff);
        } else if (suggestionSortBy === 'key') {
            filtered.sort((a, b) => (a.keyMatch === b.keyMatch) ? b.score - a.score : (a.keyMatch ? -1 : 1));
        }
        
        containerEl.innerHTML = '';
        
        if (filtered.length === 0) {
            containerEl.innerHTML = `
                <div class="suggestion-empty">
                    <i class="fas fa-search"></i>
                    <p>${suggestionGenreFilter ? 'Aucune suggestion pour ce genre' : 'Aucune suggestion trouvée'}</p>
                </div>`;
            return;
        }
        
        filtered.slice(0, 15).forEach(({ path, meta, score, bpmDiff, keyMatch }) => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            
            // Score class
            const scoreClass = score >= 90 ? 'perfect' : score >= 65 ? 'good' : 'okay';
            const scoreIcon = score >= 90 ? 'crown' : score >= 65 ? 'check' : 'minus';
            
            // BPM difference display
            const bpmDisplay = bpmDiff === 0 ? '=' : (meta.bpm > currentSuggestions[0]?.targetBpm ? `+${bpmDiff}` : `-${bpmDiff}`);
            
            item.innerHTML = `
                <div class="suggestion-score ${scoreClass}" title="Score: ${score}">
                    <i class="fas fa-${scoreIcon}"></i>
                </div>
                <div class="suggestion-content">
                    <div class="song-title">${formatSongPathToTitle(path)}</div>
                    <div class="song-meta">
                        <span class="suggestion-badge badge-bpm">
                            <i class="fas fa-drum"></i> ${meta.bpm} BPM
                        </span>
                        <span class="suggestion-badge badge-key ${keyMatch ? 'key-match' : ''}">
                            <i class="fas fa-key"></i> ${meta.camelot}
                        </span>
                        ${meta.genre ? `<span class="suggestion-badge badge-genre">${meta.genre}</span>` : ''}
                    </div>
                </div>
                <button class="btn-add-suggestion" title="Ajouter à la playlist">
                    <i class="fas fa-plus"></i>
                </button>
            `;
            
            item.querySelector('.btn-add-suggestion').addEventListener('click', async (e) => {
                e.stopPropagation();
                if (!currentEditingPlaylist.songs.includes(path)) {
                    currentEditingPlaylist.songs.push(path);
                    renderNewPlaylistSongs();
                    renderNewLibrarySongs();
                    renderNewSuggestions();
                    autoSavePlaylist();
                }
            });
            
            containerEl.appendChild(item);
        });
    }
    
    function renderFallbackSuggestions(containerEl) {
        const fallbackSongs = allAvailableSongs
            .filter(p => !currentEditingPlaylist.songs.includes(p))
            .slice(0, 6);
        
        fallbackSongs.forEach(path => {
            const filename = path.split('/').pop();
            const meta = metadataCache[filename] || {};
            
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.innerHTML = `
                <div class="suggestion-score okay"><i class="fas fa-question"></i></div>
                <div class="suggestion-content">
                    <div class="song-title">${formatSongPathToTitle(path)}</div>
                    <div class="song-meta">
                        ${meta.bpm ? `<span class="suggestion-badge badge-bpm"><i class="fas fa-drum"></i> ${meta.bpm}</span>` : ''}
                        ${meta.camelot && meta.camelot !== 'Unknown' ? `<span class="suggestion-badge badge-key"><i class="fas fa-key"></i> ${meta.camelot}</span>` : ''}
                        ${meta.genre ? `<span class="suggestion-badge badge-genre">${meta.genre}</span>` : ''}
                    </div>
                </div>
                <button class="btn-add-suggestion" title="Ajouter"><i class="fas fa-plus"></i></button>
            `;
            
            item.querySelector('.btn-add-suggestion').addEventListener('click', (e) => {
                e.stopPropagation();
                currentEditingPlaylist.songs.push(path);
                renderNewPlaylistSongs();
                renderNewLibrarySongs();
                renderNewSuggestions();
                autoSavePlaylist();
            });
            
            containerEl.appendChild(item);
        });
    }
    
    // Sort button handlers
    document.querySelectorAll('.suggestions-section .sort-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.suggestions-section .sort-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            suggestionSortBy = btn.dataset.sort;
            displaySuggestions();
        });
    });
    
    // Genre filter handler for suggestions
    const suggestionsGenreFilterEl = document.getElementById('suggestionsGenreFilter');
    if (suggestionsGenreFilterEl) {
        suggestionsGenreFilterEl.addEventListener('change', (e) => {
            suggestionGenreFilter = e.target.value;
            displaySuggestions();
        });
    }
    
    // Auto-save playlist changes
    let saveTimeout = null;
    async function autoSavePlaylist() {
        if (!currentEditingPlaylist) return;
        
        // Update song count
        const countEl = document.getElementById('editorSongCount');
        if (countEl) countEl.textContent = `${currentEditingPlaylist.songs.length} morceaux`;
        
        // Debounced save
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(async () => {
            try {
                await fetch('update_playlist.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: currentEditingPlaylist.name,
                        songs: currentEditingPlaylist.songs
                    })
                });
            } catch (e) {
                console.error('Auto-save failed:', e);
            }
        }, 1000);
    }
    
    // Event listeners for new playlist system
    if (createPlaylistBtn) {
        createPlaylistBtn.addEventListener('click', () => {
            if (createPlaylistModal) createPlaylistModal.style.display = 'flex';
        });
    }
    
    if (closeCreateModal) {
        closeCreateModal.addEventListener('click', () => {
            if (createPlaylistModal) createPlaylistModal.style.display = 'none';
        });
    }
    
    if (cancelCreatePlaylist) {
        cancelCreatePlaylist.addEventListener('click', () => {
            if (createPlaylistModal) createPlaylistModal.style.display = 'none';
        });
    }
    
    if (backToPlaylistsBtn) {
        backToPlaylistsBtn.addEventListener('click', closePlaylistEditor);
    }
    
    // Color picker
    document.querySelectorAll('.color-option').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.color-option').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const colorInput = document.getElementById('newPlaylistColor');
            if (colorInput) colorInput.value = btn.dataset.color;
        });
    });
    
    // Icon picker
    document.querySelectorAll('.icon-option').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.icon-option').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const iconInput = document.getElementById('newPlaylistIcon');
            if (iconInput) iconInput.value = btn.dataset.icon;
        });
    });
    
    // Create playlist form (new)
    if (newCreatePlaylistForm) {
        newCreatePlaylistForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('newPlaylistName').value.trim();
            const color = document.getElementById('newPlaylistColor').value;
            const icon = document.getElementById('newPlaylistIcon').value;
            
            if (!name) return;
            
            try {
                const response = await fetch('create_playlist.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, color, icon })
                });
                const result = await response.json();
                
                if (result.status !== 'success') {
                    throw new Error(result.message || 'Erreur inconnue');
                }
                
                // Success! Close modal and refresh
                if (createPlaylistModal) createPlaylistModal.style.display = 'none';
                document.getElementById('newPlaylistName').value = '';
                
                // Reset color/icon selection
                document.querySelectorAll('.color-option').forEach(b => b.classList.remove('active'));
                document.querySelector('.color-option[data-color="#00ff68"]')?.classList.add('active');
                document.getElementById('newPlaylistColor').value = '#00ff68';
                
                document.querySelectorAll('.icon-option').forEach(b => b.classList.remove('active'));
                document.querySelector('.icon-option[data-icon="music"]')?.classList.add('active');
                document.getElementById('newPlaylistIcon').value = 'music';
                
                await fetchPlaylists();
                renderPlaylistsGrid();
                
            } catch (error) {
                console.error('Create playlist error:', error);
                alert('Erreur: ' + error.message);
            }
        });
    }
    
    // Library search
    const librarySearchInput = document.getElementById('librarySearchInput');
    const libraryGenreFilter = document.getElementById('libraryGenreFilter');
    
    if (librarySearchInput) {
        librarySearchInput.addEventListener('input', (e) => {
            const genreValue = libraryGenreFilter ? libraryGenreFilter.value : '';
            renderNewLibrarySongs(e.target.value, genreValue);
        });
    }
    
    if (libraryGenreFilter) {
        libraryGenreFilter.addEventListener('change', (e) => {
            const searchValue = librarySearchInput ? librarySearchInput.value : '';
            renderNewLibrarySongs(searchValue, e.target.value);
        });
    }
    
    // Activate playlist button
    const activatePlaylistBtn = document.getElementById('activatePlaylistBtn');
    if (activatePlaylistBtn) {
        activatePlaylistBtn.addEventListener('click', async () => {
            if (!currentEditingPlaylist) return;
            await setActivePlaylist(currentEditingPlaylist.name);
            
            // Update UI
            currentActivePlaylist = currentEditingPlaylist.name;
            const statusEl = document.getElementById('editorPlaylistStatus');
            if (statusEl) {
                statusEl.textContent = 'LIVE';
                statusEl.className = 'status-badge live';
            }
            activatePlaylistBtn.disabled = true;
            activatePlaylistBtn.innerHTML = '<i class="fas fa-broadcast-tower"></i> En LIVE';
        });
    }
    
    // Delete playlist button
    const deletePlaylistBtn = document.getElementById('deletePlaylistBtn');
    if (deletePlaylistBtn) {
        deletePlaylistBtn.addEventListener('click', async () => {
            if (!currentEditingPlaylist) return;
            if (!confirm(`Supprimer la playlist "${currentEditingPlaylist.name}" ?`)) return;
            
            await deletePlaylist(currentEditingPlaylist.name);
            closePlaylistEditor();
        });
    }
    
    // Override fetchPlaylists to also render the grid
    const originalFetchPlaylists = fetchPlaylists;
    fetchPlaylists = async function() {
        await originalFetchPlaylists();
        renderPlaylistsGrid();
    };

    // --- Initial Load ---
    async function initializeAdminPanel() {
        // Load posts first so allPosts is available for artist release counts
        await renderAdminPosts();
        
        // Then load artist profiles (which uses allPosts for release counts)
        await fetchArtistProfiles();

        populateArtistDropdown();
        populateArtistFilterDropdown();
        renderMusicFiles();
        fetchAllSongs();
        fetchPlaylists();
        
        // Set initial view
        const timelineLink = document.querySelector('.nav-link[data-section="timeline"]');
        if (timelineLink) timelineLink.click();
    }

    initializeAdminPanel();

    function openPlaylistEditor(playlistName) {
        const playlist = allPlaylists.find(p => p.name === playlistName);
        if (!playlist) return;

        currentEditingPlaylist = JSON.parse(JSON.stringify(playlist)); // Deep copy
        editingPlaylistNameSpan.textContent = playlist.name;
        
        renderCurrentPlaylistSongs();
        renderAllAvailableSongsForEdit();
        
        playlistEditModal.style.display = 'block';
    }
});