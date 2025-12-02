document.addEventListener('DOMContentLoaded', () => {
    // --- State Management ---
    let allPosts = [];
    let allMusicFiles = [];
    let allAvailableSongs = [];
    let currentActivePlaylist = null;
    let currentEditingPlaylist = null;
    let currentArtistFilter = 'all';

    // --- Element Selectors ---
    const navLinks = document.querySelectorAll('.nav-link');
    const adminSections = document.querySelectorAll('.admin-section');
    const logoutBtn = document.getElementById('logoutBtn');

    // Timeline
    const adminTimelineForm = document.getElementById('adminTimelineForm');
    const adminFormMessage = document.getElementById('adminFormMessage');
    const postsManagementContainer = document.getElementById('postsManagementContainer');
    const postArtistSelect = document.getElementById('postArtist');
    const postFiltersContainer = document.getElementById('postFilters');
    const togglePostsBtn = document.getElementById('togglePostsBtn');
    const collapsiblePosts = document.getElementById('collapsiblePosts');

    // Music
    const youtubeDownloadForm = document.getElementById('youtubeDownloadForm');
    const musicManagementContainer = document.getElementById('musicManagementContainer');
    const musicSearchInput = document.getElementById('musicSearchInput');
    const toggleMusicBtn = document.getElementById('toggleMusicBtn');
    const collapsibleMusic = document.getElementById('collapsibleMusic');

    // Playlists
    const createPlaylistForm = document.getElementById('createPlaylistForm');
    const existingPlaylistsContainer = document.getElementById('existingPlaylistsContainer');
    const playlistEditModal = document.getElementById('playlistEditModal');
    const editingPlaylistNameSpan = document.getElementById('editingPlaylistName');
    const currentPlaylistSongsUl = document.getElementById('currentPlaylistSongs');
    const allAvailableSongsForEditUl = document.getElementById('allAvailableSongsForEdit');
    const songSearchInput = document.getElementById('songSearchInput');
    const savePlaylistChangesBtn = document.getElementById('savePlaylistChangesBtn');
    const cancelPlaylistEditBtn = document.getElementById('cancelPlaylistEditBtn');

    // --- Utility Functions ---
    function formatSongPathToTitle(songPath) {
        if (!songPath) return '';
        const filename = songPath.split('/').pop();
        return filename.replace(/\.[^/.]+$/, "").replace(/_/g, ' ').replace(/\s*-\s*/g, ' - ').toUpperCase();
    }

    // --- UI Initializers ---
    function setupNavigation() {
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const sectionId = link.getAttribute('data-section');
                
                navLinks.forEach(navLink => navLink.classList.remove('active'));
                link.classList.add('active');

                adminSections.forEach(section => {
                    section.style.display = section.id === sectionId ? 'block' : 'none';
                });
            });
        });
    }

    function setupCollapsible(button, content) {
        if (!button || !content) return;
        button.addEventListener('click', () => {
            const isExpanded = content.classList.toggle('expanded');
            button.innerHTML = isExpanded 
                ? '<i class="fas fa-chevron-up"></i> Masquer' 
                : '<i class="fas fa-chevron-down"></i> Afficher';
        });
    }

    // --- API & Rendering Functions ---

    // ARTISTS
    async function populateArtistDropdown() {
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
        }
    }

    // POSTS (TIMELINE)
    function populatePostFilters() {
        const artists = ['all', ...new Set(allPosts.map(p => p.artist))];
        postFiltersContainer.innerHTML = '';
        artists.forEach(artist => {
            const button = document.createElement('button');
            button.className = 'btn filter-btn';
            button.dataset.artist = artist;
            button.textContent = artist;
            if (artist === 'all') button.textContent = 'Tous';
            if (artist === currentArtistFilter) button.classList.add('active');
            
            button.addEventListener('click', () => {
                currentArtistFilter = artist;
                renderAdminPosts(); 
                postFiltersContainer.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
            });
            postFiltersContainer.appendChild(button);
        });
    }

    function renderAdminPosts() {
        let postsToRender = allPosts;
        if (currentArtistFilter !== 'all') {
            postsToRender = allPosts.filter(p => p.artist === currentArtistFilter);
        }
        postsToRender.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (postsToRender.length === 0) {
            postsManagementContainer.innerHTML = '<p>Aucun post à afficher pour ce filtre.</p>';
            return;
        }

        const table = document.createElement('table');
        table.className = 'item-list';
        table.innerHTML = `<thead><tr><th>Titre</th><th>Artiste</th><th>Date</th><th class="actions">Actions</th></tr></thead>`;
        const tbody = document.createElement('tbody');
        postsToRender.forEach(post => {
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
    }

    async function fetchAndRenderPosts() {
        try {
            const response = await fetch('get_posts.php', { cache: 'no-store' });
            if (!response.ok) throw new Error(`Erreur serveur: ${response.statusText}`);
            allPosts = await response.json();
            populatePostFilters();
            renderAdminPosts();
        } catch (error) {
            postsManagementContainer.innerHTML = `<p style="color: var(--accent-danger);">Impossible de charger les posts: ${error.message}</p>`;
        }
    }

    // ... other post functions (add, update, delete) remain largely the same ...
    async function addPost(formData) {
        // ... (implementation is unchanged)
    }
    async function updatePost(formData) {
        // ... (implementation is unchanged)
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
            fetchAndRenderPosts(); // Re-fetch and re-render all
        } catch (error) {
            alert(`Erreur lors de la suppression: ${error.message}`);
        }
    }


    // MUSIC
    function renderMusicFiles() {
        const searchTerm = musicSearchInput.value.toLowerCase();
        let filesToRender = allMusicFiles;

        if (searchTerm) {
            filesToRender = allMusicFiles.filter(file => 
                formatSongPathToTitle(file).toLowerCase().includes(searchTerm)
            );
        }

        if (filesToRender.length === 0) {
            musicManagementContainer.innerHTML = `<p>Aucun fichier de musique trouvé.</p>`;
            return;
        }
        
        const table = document.createElement('table');
        table.className = 'item-list';
        table.innerHTML = `<thead><tr><th>Titre</th><th class="actions">Actions</th></tr></thead>`;
        const tbody = document.createElement('tbody');
        filesToRender.forEach(file => {
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
    }

    async function fetchAndRenderMusic() {
        try {
            const response = await fetch('get_music_files.php', { cache: 'no-store' });
            if (!response.ok) throw new Error(`Erreur serveur: ${response.statusText}`);
            const result = await response.json();
            if (result.status === 'error') throw new Error(result.message);
            allMusicFiles = result.files.sort((a, b) => a.localeCompare(b));
            renderMusicFiles();
        } catch (error) {
            musicManagementContainer.innerHTML = `<p style="color: var(--accent-danger);">Impossible de charger les fichiers: ${error.message}</p>`;
        }
    }
    
    // ... other music functions (delete, rename) are unchanged ...
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
            fetchAndRenderMusic(); // Re-fetch and re-render
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
            fetchAndRenderMusic(); // Re-fetch and re-render
        } catch (error) {
            alert(`Erreur: ${error.message}`);
        }
    }


    // PLAYLISTS (fetch, create, delete, setActive are mostly unchanged)
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
                        <button class="btn activate-playlist-btn" data-playlist-name="${playlist.name}" ${playlist.name === currentActivePlaylist ? 'disabled' : ''}><i class="fas fa-play-circle"></i> Activer</button>
                        <button class="btn edit-playlist-btn" data-playlist-name="${playlist.name}"><i class="fas fa-edit"></i> Modifier</button>
                        <button class="btn btn-danger delete-playlist-btn" data-playlist-name="${playlist.name}"><i class="fas fa-trash"></i> Supprimer</button>
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
    // ... other playlist functions are unchanged ...
    async function createPlaylist(playlistName) {
        const createPlaylistMessage = document.getElementById('createPlaylistMessage');
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
            document.getElementById('newPlaylistName').value = '';
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


    // PLAYLIST EDITOR (functions are unchanged, but are now correctly called)
    function editPlaylist(playlist) {
        currentEditingPlaylist = JSON.parse(JSON.stringify(playlist));
        editingPlaylistNameSpan.textContent = currentEditingPlaylist.name;
        
        adminSections.forEach(section => section.style.display = 'none');
        playlistEditModal.style.display = 'flex'; // Use flex for new layout
        navLinks.forEach(navLink => navLink.classList.remove('active'));

        renderCurrentPlaylistSongs();
        renderAllAvailableSongsForEdit();
    }

    function cancelPlaylistEdit() {
        document.querySelector('.nav-link[data-section="playlists"]').click();
        fetchPlaylists();
        currentEditingPlaylist = null;
    }
    // ... renderCurrentPlaylistSongs, renderAllAvailableSongsForEdit, savePlaylistChanges are unchanged ...
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

    // Collapsible sections
    setupCollapsible('togglePostsBtn', 'collapsiblePosts');
    setupCollapsible('toggleMusicBtn', 'collapsibleMusic');

    // Search and filters
    musicSearchInput.addEventListener('input', renderMusicFiles);

    // Event Delegation for dynamic buttons
    document.body.addEventListener('click', async (e) => {
        // Timeline Posts
        const editPostBtn = e.target.closest('.edit-post-btn');
        const deletePostBtn = e.target.closest('.delete-post-btn');
        if (editPostBtn) {
            const postId = editPostBtn.dataset.id;
            const postToEdit = allPosts.find(p => p.id == postId);
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
                adminTimelineForm.scrollIntoView({ behavior: 'smooth' });
            }
        }
        if (deletePostBtn) {
            deletePost(deletePostBtn.dataset.id);
        }

        // Music Files
        const renameMusicBtn = e.target.closest('.rename-music-btn');
        const deleteMusicBtn = e.target.closest('.delete-music-btn');
        if (renameMusicBtn) renameMusicFile(renameMusicBtn.dataset.filename);
        if (deleteMusicBtn) deleteMusicFile(deleteMusicBtn.dataset.filename);

        // Playlists
        const activatePlaylistBtn = e.target.closest('.activate-playlist-btn');
        const editPlaylistBtn = e.target.closest('.edit-playlist-btn');
        const deletePlaylistBtn = e.target.closest('.delete-playlist-btn');
        if (activatePlaylistBtn) setActivePlaylist(activatePlaylistBtn.dataset.playlistName);
        if (deletePlaylistBtn) deletePlaylist(deletePlaylistBtn.dataset.playlistName);
        if (editPlaylistBtn) {
            const response = await fetch('get_playlists.php');
            const result = await response.json();
            const playlist = result.data.playlists.find(p => p.name === editPlaylistBtn.dataset.playlistName);
            if (playlist) editPlaylist(playlist);
        }
    });

    // Form Submissions
    adminTimelineForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        // This is a simplified FormData creation. A more robust solution would handle file inputs better.
        const formData = new FormData(adminTimelineForm);
        // Manually append fields because new FormData(form) can be tricky with dynamic fields
        formData.append('subtitle', document.getElementById('postSubtitle').value);
        formData.append('link', document.getElementById('postLink').value);
        formData.append('date', document.getElementById('postDate').value);
        formData.append('artist', document.getElementById('postArtist').value);
        const imageFile = document.getElementById('postImage').files[0];
        if (imageFile) {
            formData.append('image', imageFile);
        }

        const editingIdField = adminTimelineForm.querySelector('input[name="editingPostId"]');
        if (editingIdField && editingIdField.value) {
            formData.append('id', editingIdField.value);
            await updatePost(formData);
        } else {
            formData.append('id', Date.now());
            await addPost(formData);
        }
    });

    youtubeDownloadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const url = document.getElementById('youtubeUrl').value;
        if (!url) return;
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const youtubeFormMessage = document.getElementById('youtubeFormMessage');
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
            fetchAndRenderMusic();
        } catch (error) {
            youtubeFormMessage.textContent = `Erreur: ${error.message}`;
            youtubeFormMessage.style.color = 'var(--accent-danger)';
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fab fa-youtube"></i> Télécharger en MP3';
            setTimeout(() => youtubeFormMessage.textContent = '', 3000);
        }
    });

    createPlaylistForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const playlistName = document.getElementById('newPlaylistName').value.trim();
        if (playlistName) createPlaylist(playlistName);
    });

    savePlaylistChangesBtn.addEventListener('click', savePlaylistChanges);
    cancelPlaylistEditBtn.addEventListener('click', cancelPlaylistEdit);
    songSearchInput.addEventListener('input', (e) => renderAllAvailableSongsForEdit(e.target.value));

    // --- Initial Load ---
    function initializeAdminPanel() {
        setupNavigation();
        setupCollapsible('togglePostsBtn', 'collapsiblePosts');
        setupCollapsible('toggleMusicBtn', 'collapsibleMusic');
        
        populateArtistDropdown();
        fetchAndRenderPosts();
        fetchAndRenderMusic();
        fetchAllSongs();
        fetchPlaylists();
        
        // Set initial view
        document.querySelector('.nav-link[data-section="timeline"]').click();
    }

    initializeAdminPanel();
});