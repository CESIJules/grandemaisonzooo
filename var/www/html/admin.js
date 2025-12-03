document.addEventListener('DOMContentLoaded', () => {
    // --- New Sidebar Navigation ---
    const navLinks = document.querySelectorAll('.nav-link');
    const adminSections = document.querySelectorAll('.admin-section');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = link.getAttribute('data-section');
            
            // Update active link
            navLinks.forEach(navLink => navLink.classList.remove('active'));
            link.classList.add('active');

            // Show active section
            adminSections.forEach(section => {
                section.style.display = section.id === sectionId ? 'block' : 'none';
            });
        });
    });

    // --- General Element Selectors ---
    const logoutBtn = document.getElementById('logoutBtn');

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

    // --- State ---
    let allAvailableSongs = [];
    let allMusicFiles = [];
    let currentActivePlaylist = null;
    let currentEditingPlaylist = null;

    // --- Utility Functions ---
    function formatSongPathToTitle(songPath) {
        if (!songPath) return '';
        const filename = songPath.split('/').pop();
        return filename.replace(/\.[^/.]+$/, "").replace(/_/g, ' ').replace(/\s*-\s*/g, ' - ').toUpperCase();
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

    async function getMusicMetadata(filename) {
        if (metadataCache[filename]) return metadataCache[filename];
        
        try {
            const response = await fetch('get_music_metadata.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: filename })
            });
            const result = await response.json();
            if (result.status === 'success') {
                metadataCache[filename] = result.data;
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
            return;
        }

        const targetBpm = lastSongMeta.bpm;
        const targetKey = lastSongMeta.camelot;
        const compatibleKeys = camelotWheel[targetKey]?.compatible || [];

        suggestionsUl.innerHTML = `<p>Basé sur: <strong>${formatSongPathToTitle(lastSongPath)}</strong> (${targetBpm} BPM, ${targetKey})</p>`;

        // Filter candidates
        const candidates = [];
        
        // We need to check metadata for other songs. This might be slow if we do it one by one.
        // Ideally, we should fetch all metadata at once, but for now let's iterate.
        // To avoid freezing, we'll check only the first 20 available songs or implement a bulk fetch later.
        // For this demo, we will iterate through allAvailableSongs but limit the number of API calls if not cached.
        
        let matchCount = 0;
        
        for (const songPath of allAvailableSongs) {
            if (currentEditingPlaylist.songs.includes(songPath)) continue; // Skip already in playlist
            if (matchCount >= 5) break; // Limit suggestions

            const filename = songPath.split('/').pop();
            // Optimistic check: if not in cache, we might skip to avoid heavy load, 
            // OR we just analyze on demand. Let's analyze on demand but show a loading state.
            
            const meta = await getMusicMetadata(filename);
            if (!meta) continue;

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

        if (candidates.length === 0) {
            suggestionsUl.innerHTML += '<p>Aucune suggestion trouvée pour le moment.</p>';
            return;
        }

        const list = document.createElement('ul');
        candidates.forEach(cand => {
            const li = document.createElement('li');
            li.className = 'suggestion-item';
            li.innerHTML = `
                <div class="suggestion-info">
                    <span>${formatSongPathToTitle(cand.path)}</span>
                    <span class="suggestion-badge badge-bpm">${cand.meta.bpm} BPM</span>
                    <span class="suggestion-badge badge-key">${cand.meta.camelot}</span>
                </div>
            `;
            const addBtn = document.createElement('button');
            addBtn.innerHTML = '<i class="fas fa-plus"></i>';
            addBtn.className = 'btn btn-primary';
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
                const option = document.createElement('option');
                option.value = artist;
                option.textContent = artist;
                postArtistSelect.appendChild(option);
            });
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
    async function renderAdminPosts(artistFilter = 'all') {
        try {
            const response = await fetch('get_posts.php', { cache: 'no-store' });
            if (!response.ok) throw new Error(`Erreur serveur: ${response.statusText}`);
            let posts = await response.json();
            posts.sort((a, b) => new Date(b.date) - new Date(a.date));

            if (artistFilter !== 'all') {
                posts = posts.filter(post => post.artist === artistFilter);
            }

            if (posts.length === 0) {
                postsManagementContainer.innerHTML = '<p>Aucun post à gérer.</p>';
                return;
            }

            const table = document.createElement('table');
            table.className = 'item-list';
            table.innerHTML = `<thead><tr><th>Titre</th><th>Artiste</th><th>Date</th><th class="actions">Actions</th></tr></thead>`;
            const tbody = document.createElement('tbody');
            posts.forEach(post => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${post.subtitle}</td>
                    <td>${post.artist}</td>
                    <td>${new Date(post.date).toLocaleDateString('fr-FR')}</td>
                    <td class="actions">
                        <button class="btn edit-post-btn" data-id="${post.id}"><i class="fas fa-pencil-alt"></i></button>
                        <button class="btn btn-danger delete-post-btn" data-id="${post.id}"><i class="fas fa-trash"></i></button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
            table.appendChild(tbody);
            postsManagementContainer.innerHTML = '';
            postsManagementContainer.appendChild(table);

        } catch (error) {
            postsManagementContainer.innerHTML = `<p style="color: var(--accent-danger);">Impossible de charger les posts: ${error.message}</p>`;
        }
    }

    async function addPost(formData) {
        try {
            const response = await fetch('add_post.php', { method: 'POST', body: formData });
            if (!response.ok) throw new Error(`Erreur serveur: ${response.statusText}`);
            const result = await response.json();
            if (result.status !== 'success') throw new Error(result.message || 'Erreur inconnue.');
            
            adminFormMessage.textContent = 'Post ajouté !';
            adminFormMessage.style.color = 'lightgreen';
            adminTimelineForm.reset();
            renderAdminPosts();
        } catch (error) {
            adminFormMessage.textContent = `Erreur: ${error.message}`;
            adminFormMessage.style.color = 'var(--accent-danger)';
        } finally {
            setTimeout(() => adminFormMessage.textContent = '', 3000);
        }
    }

    async function updatePost(formData) {
        try {
            const response = await fetch('update_post.php', { method: 'POST', body: formData });
            if (!response.ok) throw new Error(`Erreur serveur: ${response.statusText}`);
            const result = await response.json();
            if (result.status !== 'success') throw new Error(result.message || 'Erreur inconnue.');

            adminFormMessage.textContent = 'Post mis à jour !';
            adminFormMessage.style.color = 'lightgreen';
            adminTimelineForm.reset();
            renderAdminPosts();
            const editingIdField = adminTimelineForm.querySelector('input[name="editingPostId"]');
            if (editingIdField) editingIdField.remove();
            adminTimelineForm.querySelector('button[type="submit"]').innerHTML = '<i class="fas fa-plus"></i> Ajouter au Timeline';

        } catch (error) {
            adminFormMessage.textContent = `Erreur: ${error.message}`;
            adminFormMessage.style.color = 'var(--accent-danger)';
        } finally {
            setTimeout(() => adminFormMessage.textContent = '', 3000);
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

            const filteredFiles = allMusicFiles.filter(file => 
                formatSongPathToTitle(file).toLowerCase().includes(filter.toLowerCase())
            );

            if (filteredFiles.length === 0) {
                musicManagementContainer.innerHTML = `<p>${allMusicFiles.length === 0 ? 'Aucun fichier de musique trouvé.' : 'Aucun fichier ne correspond à votre recherche.'}</p>`;
                return;
            }
            
            const table = document.createElement('table');
            table.className = 'item-list';
            table.innerHTML = `<thead><tr><th>Titre</th><th class="actions">Actions</th></tr></thead>`;
            const tbody = document.createElement('tbody');
            filteredFiles.forEach(file => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${formatSongPathToTitle(file)}</td>
                    <td class="actions">
                        <button class="btn rename-music-btn" data-filename="${file}"><i class="fas fa-pencil-alt"></i></button>
                        <button class="btn btn-danger delete-music-btn" data-filename="${file}"><i class="fas fa-trash"></i></button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
            table.appendChild(tbody);
            musicManagementContainer.innerHTML = '';
            musicManagementContainer.appendChild(table);

        } catch (error) {
            musicManagementContainer.innerHTML = `<p style="color: var(--accent-danger);">Impossible de charger les fichiers: ${error.message}</p>`;
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
            const playlists = result.data.playlists;

            if (playlists.length === 0) {
                existingPlaylistsContainer.innerHTML = '<p>Aucune playlist créée.</p>';
                return;
            }

            const table = document.createElement('table');
            table.className = 'item-list';
            table.innerHTML = `<thead><tr><th>Nom</th><th>Titres</th><th class="actions">Actions</th></tr></thead>`;
            const tbody = document.createElement('tbody');
            playlists.forEach(playlist => {
                const tr = document.createElement('tr');
                if (playlist.name === currentActivePlaylist) {
                    tr.classList.add('playing');
                }
                tr.innerHTML = `
                    <td>${playlist.name}</td>
                    <td>${playlist.songs.length}</td>
                    <td class="actions">
                        <div class="action-buttons-container">
                            <button class="btn activate-playlist-btn" title="Activer" data-playlist-name="${playlist.name}" ${playlist.name === currentActivePlaylist ? 'disabled' : ''}><i class="fas fa-play-circle"></i></button>
                            <button class="btn deactivate-playlist-btn" title="Désactiver" data-playlist-name="${playlist.name}" ${playlist.name !== currentActivePlaylist ? 'disabled' : ''}><i class="fas fa-stop-circle"></i></button>
                            <button class="btn edit-playlist-btn" title="Modifier" data-playlist-name="${playlist.name}"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-danger delete-playlist-btn" title="Supprimer" data-playlist-name="${playlist.name}"><i class="fas fa-trash"></i></button>
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });
            table.appendChild(tbody);
            existingPlaylistsContainer.innerHTML = '';
            existingPlaylistsContainer.appendChild(table);

        } catch (error) {
            existingPlaylistsContainer.innerHTML = `<p style="color: var(--accent-danger);">Impossible de charger les playlists: ${error.message}</p>`;
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
                removeBtn.innerHTML = '<i class="fas fa-minus-circle"></i>';
                removeBtn.className = 'btn btn-danger';
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
            addBtn.innerHTML = '<i class="fas fa-plus-circle"></i>';
            addBtn.className = 'btn';
            addBtn.addEventListener('click', () => {
                if (!currentEditingPlaylist.songs.includes(songPath)) {
                    currentEditingPlaylist.songs.push(songPath);
                    renderCurrentPlaylistSongs();
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

    // --- Event Listeners ---
    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('loggedIn');
        window.location.href = 'login.html';
    });

    skipSongBtn.addEventListener('click', skipSong);

    adminTimelineForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(adminTimelineForm);
        const editingIdField = adminTimelineForm.querySelector('input[name="editingPostId"]');
        if (editingIdField && editingIdField.value) {
            formData.append('id', editingIdField.value);
            await updatePost(formData);
        } else {
            formData.append('id', Date.now());
            await addPost(formData);
        }
    });

    postsManagementContainer.addEventListener('click', async (e) => {
        const editButton = e.target.closest('.edit-post-btn');
        const deleteButton = e.target.closest('.delete-post-btn');

        if (editButton) {
            const postId = editButton.dataset.id;
            const response = await fetch('get_posts.php');
            const posts = await response.json();
            const postToEdit = posts.find(p => p.id == postId);
            if (postToEdit) {
                document.getElementById('postSubtitle').value = postToEdit.subtitle || '';
                document.getElementById('postLink').value = postToEdit.link || '';
                document.getElementById('postDate').value = new Date(postToEdit.date).toISOString().split('T')[0];
                document.getElementById('postArtist').value = postToEdit.artist;
                let editingIdField = adminTimelineForm.querySelector('input[name="editingPostId"]');
                if (!editingIdField) {
                    editingIdField = document.createElement('input');
                    editingIdField.type = 'hidden';
                    editingIdField.name = 'editingPostId';
                    adminTimelineForm.appendChild(editingIdField);
                }
                editingIdField.value = postId;
                adminTimelineForm.querySelector('button[type="submit"]').innerHTML = '<i class="fas fa-save"></i> Modifier le post';
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
        if (deleteButton) {
            deletePost(deleteButton.dataset.id);
        }
    });

    postArtistFilter.addEventListener('change', () => {
        renderAdminPosts(postArtistFilter.value);
    });

    youtubeDownloadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const url = youtubeUrlInput.value;
        if (!url) return;
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Téléchargement...';
        try {
            const response = await fetch('download_youtube.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: url }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Erreur inconnue.');
            youtubeFormMessage.textContent = result.message;
            youtubeFormMessage.style.color = 'lightgreen';
            youtubeDownloadForm.reset();
            renderMusicFiles(musicSearchInput.value, true); // Refresh list
        } catch (error) {
            youtubeFormMessage.textContent = `Erreur: ${error.message}`;
            youtubeFormMessage.style.color = 'var(--accent-danger)';
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fab fa-youtube"></i> Télécharger en MP3';
            setTimeout(() => youtubeFormMessage.textContent = '', 3000);
        }
    });

    musicManagementContainer.addEventListener('click', (e) => {
        const renameButton = e.target.closest('.rename-music-btn');
        const deleteButton = e.target.closest('.delete-music-btn');
        if (renameButton) renameMusicFile(renameButton.dataset.filename);
        if (deleteButton) deleteMusicFile(deleteButton.dataset.filename);
    });

    musicSearchInput.addEventListener('input', (e) => {
        renderMusicFiles(e.target.value);
    });

    createPlaylistForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const playlistName = newPlaylistNameInput.value.trim();
        if (playlistName) createPlaylist(playlistName);
    });

    existingPlaylistsContainer.addEventListener('click', (e) => {
        const activateBtn = e.target.closest('.activate-playlist-btn');
        const deactivateBtn = e.target.closest('.deactivate-playlist-btn');
        const editBtn = e.target.closest('.edit-playlist-btn');
        const deleteBtn = e.target.closest('.delete-playlist-btn');

        if (activateBtn) setActivePlaylist(activateBtn.dataset.playlistName);
        if (deactivateBtn) setActivePlaylist(null);
        if (deleteBtn) deletePlaylist(deleteBtn.dataset.playlistName);
        if (editBtn) {
            fetch('get_playlists.php').then(res => res.json()).then(result => {
                const playlist = result.data.playlists.find(p => p.name === editBtn.dataset.playlistName);
                if (playlist) editPlaylist(playlist);
            });
        }
    });

    savePlaylistChangesBtn.addEventListener('click', savePlaylistChanges);
    cancelPlaylistEditBtn.addEventListener('click', cancelPlaylistEdit);
    songSearchInput.addEventListener('input', (e) => renderAllAvailableSongsForEdit(e.target.value));

    // --- Initial Load ---
    function initializeAdminPanel() {
        populateArtistDropdown();
        populateArtistFilterDropdown();
        renderAdminPosts();
        renderMusicFiles();
        fetchAllSongs();
        fetchPlaylists();
        // Set initial view
        document.querySelector('.nav-link[data-section="timeline"]').click();
    }

    initializeAdminPanel();
});