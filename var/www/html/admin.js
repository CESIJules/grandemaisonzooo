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
    const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

    // --- Music Section ---
    const youtubeDownloadForm = document.getElementById('youtubeDownloadForm');
    const youtubeUrlInput = document.getElementById('youtubeUrl');
    const youtubeFormMessage = document.getElementById('youtubeFormMessage');
    const musicManagementContainer = document.getElementById('musicManagementContainer');

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
    let currentActivePlaylist = null;
    let currentEditingPlaylist = null;

    // --- Utility Functions ---
    function formatSongPathToTitle(songPath) {
        if (!songPath) return '';
        const filename = songPath.split('/').pop();
        return filename.replace(/\.[^/.]+$/, "").replace(/_/g, ' ').replace(/\s*-\s*/g, ' - ').toUpperCase();
    }

    // --- API & Rendering Functions ---

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

    // POSTS (TIMELINE)
    async function renderAdminPosts() {
        try {
            const response = await fetch('get_posts.php', { cache: 'no-store' });
            if (!response.ok) throw new Error(`Erreur serveur: ${response.statusText}`);
            const posts = await response.json();
            posts.sort((a, b) => new Date(b.date) - new Date(a.date));

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
    async function renderMusicFiles() {
        try {
            const response = await fetch('get_music_files.php', { cache: 'no-store' });
            if (!response.ok) throw new Error(`Erreur serveur: ${response.statusText}`);
            const result = await response.json();
            if (result.status === 'error') throw new Error(result.message);

            if (result.files.length === 0) {
                musicManagementContainer.innerHTML = `<p>${result.message || 'Aucun fichier de musique trouvé.'}</p>`;
                return;
            }
            result.files.sort((a, b) => a.localeCompare(b));
            
            const table = document.createElement('table');
            table.className = 'item-list';
            table.innerHTML = `<thead><tr><th>Titre</th><th class="actions">Actions</th></tr></thead>`;
            const tbody = document.createElement('tbody');
            result.files.forEach(file => {
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
            renderMusicFiles();
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
            renderMusicFiles();
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
            alert('Playlist activée ! La radio changera de source dans les 30 secondes.');
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
                } else {
                    alert('Cette chanson est déjà dans la playlist.');
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
            renderMusicFiles();
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

    createPlaylistForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const playlistName = newPlaylistNameInput.value.trim();
        if (playlistName) createPlaylist(playlistName);
    });

    existingPlaylistsContainer.addEventListener('click', (e) => {
        const activateBtn = e.target.closest('.activate-playlist-btn');
        const editBtn = e.target.closest('.edit-playlist-btn');
        const deleteBtn = e.target.closest('.delete-playlist-btn');

        if (activateBtn) setActivePlaylist(activateBtn.dataset.playlistName);
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
        renderAdminPosts();
        renderMusicFiles();
        fetchAllSongs();
        fetchPlaylists();
        // Set initial view
        document.querySelector('.nav-link[data-section="timeline"]').click();
    }

    initializeAdminPanel();
});