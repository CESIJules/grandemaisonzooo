document.addEventListener('DOMContentLoaded', () => {
  // --- Tab Navigation ---
  const tabLinks = document.querySelectorAll('.tab-link');
  const tabContents = document.querySelectorAll('.tab-content');

  // New elements for Playlist Management
  const createPlaylistForm = document.getElementById('createPlaylistForm');
  const newPlaylistNameInput = document.getElementById('newPlaylistName');
  const createPlaylistMessage = document.getElementById('createPlaylistMessage');
  const existingPlaylistsContainer = document.getElementById('existingPlaylistsContainer');
  const allSongsListContainer = document.getElementById('allSongsList');

  // New elements for Playlist Editing Modal
  const playlistEditModal = document.getElementById('playlistEditModal');
  const editingPlaylistNameSpan = document.getElementById('editingPlaylistName');
  const currentPlaylistSongsUl = document.getElementById('currentPlaylistSongs');
  const allAvailableSongsForEditUl = document.getElementById('allAvailableSongsForEdit');
  const songSearchInput = document.getElementById('songSearchInput');
  const savePlaylistChangesBtn = document.getElementById('savePlaylistChangesBtn');
  const cancelPlaylistEditBtn = document.getElementById('cancelPlaylistEditBtn');

  // Array to hold all available songs (full paths)
  let allAvailableSongs = [];

  // --- Song Path to Title Formatter ---
  function formatSongPathToTitle(songPath) {
    if (!songPath) return '';
    const parts = songPath.split('/');
    const filename = parts[parts.length - 1]; // Get the last part (filename)
    return filename.replace(/\.[^/.]+$/, "").replace(/_/g, ' ').replace(/\s*-\s*/g, ' - ').toUpperCase();
  }

  tabLinks.forEach(link => {
    link.addEventListener('click', () => {
      const tabId = link.getAttribute('data-tab');

      // Update active state for links
      tabLinks.forEach(innerLink => {
        innerLink.classList.remove('active');
      });
      link.classList.add('active');

      // Show/hide content
      tabContents.forEach(content => {
        if (content.id === tabId) {
          content.classList.add('active');
        } else {
          content.classList.remove('active');
        }
      });
    });
  });

  const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

  // --- Song Title Formatter ---
  function formatSongTitle(title) {
    if (!title) return '';
    return title.replace(/\.[^/.]+$/, "").replace(/_/g, ' ').replace(/\s*-\s*/g, ' - ').toUpperCase();
  }

  // --- Current Song Fetcher ---
  async function fetchCurrentSong() {
    try {
      const response = await fetch("https://grandemaisonzoo.com/status-json.xsl", { cache: 'no-store' });
      if (!response.ok) {
        console.error("Impossible de récupérer les infos Icecast");
        return null;
      }

      const data = await response.json();
      let title = null;

      if (data.icestats && data.icestats.source) {
        const source = data.icestats.source;
        if (Array.isArray(source)) {
          const stream = source.find(s => s.mount === "/stream");
          if (stream && stream.title) title = stream.title;
        } else {
          if (source.title) title = source.title;
        }
      }

      return title ? formatSongTitle(title) : null;

    } catch (err) {
      console.error("Erreur:", err);
      return null;
    }
  }

  // --- Artist Dropdown ---
  const postArtistSelect = document.getElementById('postArtist');

  async function populateArtistDropdown() {
    if (!postArtistSelect) return;

    try {
      const response = await fetch('get_artists.php');
      if (!response.ok) {
        throw new Error('Could not fetch artists');
      }
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
      postArtistSelect.innerHTML = '<option value="" disabled>Erreur de chargement</option>';
    }
  }

  // Populate artist dropdown on page load
  populateArtistDropdown();

  // Variable to store the currently active playlist name
  let currentActivePlaylist = null;

  // --- All Songs Fetcher and Renderer (for playlist building) ---
  async function fetchAllSongs() {
    try {
      const response = await fetch('get_all_songs.php', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Could not fetch all songs');
      }
      const result = await response.json();
      if (result.status === 'success') {
        allAvailableSongs = result.files;
        renderAllSongs();
      } else {
        throw new Error(result.message || 'Error fetching all songs.');
      }
    } catch (error) {
      console.error('Failed to fetch all songs:', error);
      allSongsListContainer.innerHTML = `<p style="color: red;">Erreur: Impossible de charger toutes les musiques disponibles.</p>`;
    }
  }

  function renderAllSongs() {
    allSongsListContainer.innerHTML = '';
    if (allAvailableSongs.length === 0) {
      allSongsListContainer.innerHTML = '<p>Aucune musique disponible sur le serveur.</p>';
      return;
    }

    const ul = document.createElement('ul');
    ul.classList.add('all-songs-list'); // Add a class for styling/drag-drop
    allAvailableSongs.forEach(songPath => {
      const li = document.createElement('li');
      li.textContent = formatSongPathToTitle(songPath);
      li.dataset.songPath = songPath; // Store full path
      li.draggable = true; // Make songs draggable
      li.classList.add('draggable-song'); // Add class for drag-drop styling
      ul.appendChild(li);
    });
    allSongsListContainer.appendChild(ul);
  }

  // --- Post Management ---
   const adminTimelineForm = document.getElementById('adminTimelineForm');
   const adminFormMessage = document.getElementById('adminFormMessage');
   const postsManagementContainer = document.getElementById('postsManagementContainer');

  // Function to add a post
  async function addPost(formData) {
    try {
      const response = await fetch('add_post.php', {
        method: 'POST',
        body: formData,
       });
      if (!response.ok) {
        throw new Error(`Erreur du serveur: ${response.statusText}`);
       }

     const result = await response.json();

      if (result.status === 'success') {
        adminFormMessage.textContent = 'Post ajouté avec succès!';
        adminFormMessage.style.color = 'green';
        adminTimelineForm.reset();
        renderAdminPosts(); // Refresh admin list
      } else {
        throw new Error(result.message || 'Une erreur inconnue est survenue.');
       }
    } catch (error) {
      adminFormMessage.textContent = `Erreur: ${error.message}`;
      adminFormMessage.style.color = 'red';
    } finally {
      setTimeout(() => {
        adminFormMessage.textContent = '';
      }, 3000);
    }
  }

  // Function to update a post
  async function updatePost(formData) {
    try {
      const response = await fetch('update_post.php', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Erreur du serveur: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.status === 'success') {
        adminFormMessage.textContent = 'Post mis à jour avec succès!';
        adminFormMessage.style.color = 'green';
        adminTimelineForm.reset();
        renderAdminPosts(); // Refresh admin list

        // Remove the hidden field and reset button text
        const editingIdField = adminTimelineForm.querySelector('input[name="editingPostId"]');
        if (editingIdField) {
          editingIdField.remove();
        }
        adminTimelineForm.querySelector('button[type="submit"]').textContent = 'Ajouter au Timeline';

      } else {
        throw new Error(result.message || 'Une erreur inconnue est survenue.');
      }
    } catch (error) {
      adminFormMessage.textContent = `Erreur: ${error.message}`;
      adminFormMessage.style.color = 'red';
    } finally {
      setTimeout(() => {
        adminFormMessage.textContent = '';
      }, 3000);
    }
  }

  // Function to delete a post
  async function deletePost(postId) {
    // Confirmation dialog to prevent accidental deletion
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce post ?')) {
      return;
    }

    try {
      const response = await fetch('delete_post.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: postId }),
      });

      if (!response.ok) {
        throw new Error(`Erreur du serveur: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.status === 'success') {
        // Refresh the posts list to show the change
        renderAdminPosts();
      } else {
        throw new Error(result.message || 'Une erreur inconnue est survenue lors de la suppression.');
      }
    } catch (error) {
      // Display a more user-friendly error message
      alert(`Erreur lors de la suppression du post: ${error.message}`);
    }
  }

  // Function to render posts in the management area
  async function renderAdminPosts() {
    try {
      const response = await fetch('get_posts.php', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Erreur du serveur: ${response.statusText}`);
      }
      const posts = await response.json();
      
    posts.sort((a, b) => new Date(b.date) - new Date(a.date));

    postsManagementContainer.innerHTML = ''; // Clear existing posts

    if (posts.length === 0) {
        postsManagementContainer.innerHTML = '<p>Aucun post à gérer pour le moment.</p>';
        return;
    }

    posts.forEach(post => {
      const postElement = document.createElement('div');
      postElement.classList.add('post-management');
      
      postElement.innerHTML = `
        <div class="post-info">
          <strong>${post.subtitle}</strong> (${post.artist}) - <span>${new Date(post.date).toLocaleDateString('fr-FR')}</span>
        </div>
        <div>
          <button class="edit-btn" data-id="${post.id}">Modifier</button>
          <button class="delete-btn" data-id="${post.id}">Supprimer</button>
        </div>
      `;
      postsManagementContainer.appendChild(postElement);
    });

    // Add event listeners to delete buttons
    document.querySelectorAll('.delete-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const postIdToDelete = e.target.getAttribute('data-id');
        deletePost(postIdToDelete);     
      });
    });

    // Add event listeners to edit buttons
    document.querySelectorAll('.edit-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const postIdToEdit = e.target.getAttribute('data-id');
            const postToEdit = posts.find(p => p.id == postIdToEdit);

            if (postToEdit) {
                document.getElementById('postSubtitle').value = postToEdit.subtitle || '';
                document.getElementById('postLink').value = postToEdit.link || '';
                document.getElementById('postDate').value = new Date(postToEdit.date).toISOString().split('T')[0];
                document.getElementById('postArtist').value = postToEdit.artist;

                // Add a hidden field to store the ID of the post being edited
                let editingIdField = document.querySelector('input[name="editingPostId"]');
                if (!editingIdField) {
                    editingIdField = document.createElement('input');
                    editingIdField.type = 'hidden';
                    editingIdField.name = 'editingPostId';
                    adminTimelineForm.appendChild(editingIdField);
                }
                editingIdField.value = postIdToEdit;

                // Change button text and scroll to form
                adminTimelineForm.querySelector('button[type="submit"]').textContent = 'Modifier le post';
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    });
      } catch (error) {
      postsManagementContainer.innerHTML = `<p style="color: red;">Impossible de charger les posts: ${error.message}</p>`;
     }
  };

  // --- Playlist Management ---
  async function fetchPlaylists() {
    try {
      const response = await fetch('get_playlists.php', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Erreur du serveur (playlists): ${response.statusText}`);
      }
      const result = await response.json();
      if (result.status === 'success') {
        currentActivePlaylist = result.data.active_playlist;
        renderPlaylists(result.data.playlists);
      } else {
        throw new Error(result.message || 'Erreur lors de la récupération des playlists.');
      }
    } catch (error) {
      console.error('Failed to fetch playlists:', error);
      existingPlaylistsContainer.innerHTML = `<p style="color: red;">Erreur: Impossible de charger les playlists.</p>`;
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

      if (result.status === 'success') {
        createPlaylistMessage.textContent = 'Playlist créée avec succès!';
        createPlaylistMessage.style.color = 'green';
        newPlaylistNameInput.value = ''; // Clear input
        fetchPlaylists(); // Refresh the list of playlists
      } else {
        throw new Error(result.message || 'Erreur lors de la création de la playlist.');
      }
    } catch (error) {
      createPlaylistMessage.textContent = `Erreur: ${error.message}`;
      createPlaylistMessage.style.color = 'red';
    } finally {
      setTimeout(() => {
        createPlaylistMessage.textContent = '';
      }, 3000);
    }
  }

  function renderPlaylists(playlists) {
    existingPlaylistsContainer.innerHTML = ''; // Clear existing playlists

    if (playlists.length === 0) {
      existingPlaylistsContainer.innerHTML = '<p>Aucune playlist créée pour le moment.</p>';
      return;
    }

    const ul = document.createElement('ul');
    playlists.forEach(playlist => {
      const li = document.createElement('li');
      li.style.display = 'flex';
      li.style.justifyContent = 'space-between';
      li.style.alignItems = 'center';
      li.style.marginBottom = '10px';
      li.style.border = '1px solid #333';
      li.style.padding = '10px';
      li.style.borderRadius = '5px';

      const playlistInfo = document.createElement('div');
      playlistInfo.innerHTML = `
        <strong>${playlist.name}</strong> (${playlist.songs.length} titres)
        ${playlist.name === currentActivePlaylist ? '<span class="playing" style="margin-left: 10px;">(ACTIVE)</span>' : ''}
      `;

      const buttonsDiv = document.createElement('div');

      const editBtn = document.createElement('button');
      editBtn.textContent = 'Modifier';
      editBtn.classList.add('edit-btn');
      editBtn.dataset.playlistName = playlist.name;
      buttonsDiv.appendChild(editBtn);

      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Supprimer';
      deleteBtn.classList.add('delete-btn');
      deleteBtn.dataset.playlistName = playlist.name;
      buttonsDiv.appendChild(deleteBtn);

      if (playlist.name !== currentActivePlaylist) {
        const setActiveBtn = document.createElement('button');
        setActiveBtn.textContent = 'Activer';
        setActiveBtn.classList.add('btn');
        setActiveBtn.dataset.playlistName = playlist.name;
        setActiveBtn.style.marginLeft = '5px';
        buttonsDiv.appendChild(setActiveBtn);
      }
      
      li.appendChild(playlistInfo);
      li.appendChild(buttonsDiv);
      ul.appendChild(li);
    });
    existingPlaylistsContainer.appendChild(ul);

    // Add event listeners for new buttons
    document.querySelectorAll('#existingPlaylistsContainer .delete-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const playlistName = e.target.dataset.playlistName;
        deletePlaylist(playlistName);
      });
    });

    document.querySelectorAll('#existingPlaylistsContainer .edit-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const playlistName = e.target.dataset.playlistName;
        // Find the full playlist object to pass to editPlaylist
        const playlistToEdit = playlists.find(p => p.name === playlistName);
        if (playlistToEdit) {
          editPlaylist(playlistToEdit);
        }
      });
    });

    document.querySelectorAll('#existingPlaylistsContainer .btn').forEach(button => {
      if (button.textContent === 'Activer') {
        button.addEventListener('click', (e) => {
          const playlistName = e.target.dataset.playlistName;
          setActivePlaylist(playlistName);
        });
      }
    });
  }

  // --- Playlist Editing ---
  let currentEditingPlaylist = null; // To hold the playlist object being edited

  function editPlaylist(playlist) {
    currentEditingPlaylist = { ...playlist }; // Create a copy to edit
    editingPlaylistNameSpan.textContent = currentEditingPlaylist.name;
    
    // Hide other tabs and show edit modal
    tabContents.forEach(content => content.classList.remove('active'));
    playlistEditModal.classList.add('active');

    renderCurrentPlaylistSongs();
    renderAllAvailableSongsForEdit();
  }

  function renderCurrentPlaylistSongs() {
    currentPlaylistSongsUl.innerHTML = '';
    if (currentEditingPlaylist && currentEditingPlaylist.songs.length > 0) {
      currentEditingPlaylist.songs.forEach((songPath, index) => {
        const li = document.createElement('li');
        li.textContent = formatSongPathToTitle(songPath);
        li.dataset.songPath = songPath;

        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Supprimer';
        removeBtn.classList.add('delete-btn');
        removeBtn.style.marginLeft = '10px';
        removeBtn.addEventListener('click', () => {
          currentEditingPlaylist.songs.splice(index, 1);
          renderCurrentPlaylistSongs(); // Re-render to reflect removal
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
      li.dataset.songPath = songPath;

      const addBtn = document.createElement('button');
      addBtn.textContent = 'Ajouter';
      addBtn.classList.add('btn');
      addBtn.style.marginLeft = '10px';
      addBtn.addEventListener('click', () => {
        // Add only if not already in the playlist
        if (!currentEditingPlaylist.songs.includes(songPath)) {
          currentEditingPlaylist.songs.push(songPath);
          renderCurrentPlaylistSongs(); // Re-render current playlist
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

      if (result.status === 'success') {
        alert('Playlist mise à jour avec succès!');
        cancelPlaylistEdit(); // Close modal and refresh
      } else {
        throw new Error(result.message || 'Erreur lors de la mise à jour de la playlist.');
      }
    } catch (error) {
      alert(`Erreur: ${error.message}`);
    }
  }

  function cancelPlaylistEdit() {
    playlistEditModal.classList.remove('active');
    // Re-activate the playlists tab and refresh data
    document.querySelector('.tab-link[data-tab="playlists"]').click();
    fetchPlaylists();
    currentEditingPlaylist = null;
  }

  // Event Listeners for Playlist Edit Modal
  if (savePlaylistChangesBtn) {
    savePlaylistChangesBtn.addEventListener('click', savePlaylistChanges);
  }
  if (cancelPlaylistEditBtn) {
    cancelPlaylistEditBtn.addEventListener('click', cancelPlaylistEdit);
  }
  if (songSearchInput) {
    songSearchInput.addEventListener('input', (e) => {
      renderAllAvailableSongsForEdit(e.target.value);
    });
  }

  // Event listener for Create Playlist Form
  if (createPlaylistForm) {
    createPlaylistForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const playlistName = newPlaylistNameInput.value.trim();
      if (playlistName) {
        await createPlaylist(playlistName);
      }
    });
  }

  // Admin form submission
  if (adminTimelineForm) {
    adminTimelineForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const postSubtitle = document.getElementById('postSubtitle').value;
      const postDate = document.getElementById('postDate').value;
      const postArtist = document.getElementById('postArtist').value;
      const postImage = document.getElementById('postImage').files[0];
      const postLink = document.getElementById('postLink').value;

      if (postImage && postImage.size > MAX_FILE_SIZE) {
        adminFormMessage.textContent = 'Le fichier est trop volumineux (max 20MB)';
        adminFormMessage.style.color = 'red';
        return;
      }

      if (!postDate || !postArtist) {
        adminFormMessage.textContent = 'Date et Artiste sont obligatoires!';
        adminFormMessage.style.color = 'red';
        return;
      }

      const formData = new FormData();
      formData.append('title', postArtist);
      formData.append('subtitle', postSubtitle);
      formData.append('date', postDate);
      formData.append('artist', postArtist);
      formData.append('link', postLink);

      if (postImage) {
        formData.append('image', postImage);
      }
      
      const editingIdField = adminTimelineForm.querySelector('input[name="editingPostId"]');
      if (editingIdField && editingIdField.value) {
        formData.append('id', editingIdField.value);
        await updatePost(formData);
      } else {
        formData.append('id', Date.now()); // Assign a temporary unique ID
        await addPost(formData);
      }
    });
  }

  // Initial load of posts for the management area
  if (postsManagementContainer) {
    renderAdminPosts();
  }

  // --- Music Management ---
  const musicManagementContainer = document.getElementById('musicManagementContainer');
  const refreshMusicBtn = document.getElementById('refreshMusicBtn');
  const showMoreMusicBtn = document.getElementById('showMoreMusicBtn');

  // Function to render music files in the management area
  async function renderMusicFiles() {
    try {
      // Fetch current song and music files in parallel
      const [currentSong, musicFilesResponse] = await Promise.all([
        fetchCurrentSong(),
        fetch('get_music_files.php', { cache: 'no-store' })
      ]);

      if (!musicFilesResponse.ok) {
        throw new Error(`Erreur du serveur (fichiers de musique): ${musicFilesResponse.statusText}`);
      }
      const result = await musicFilesResponse.json();

      if (result.status === 'error') {
        throw new Error(result.message);
      }

      musicManagementContainer.innerHTML = ''; // Clear existing files

      if (result.files.length === 0) {
        musicManagementContainer.innerHTML = `<p>${result.message || 'Aucun fichier de musique trouvé.'}</p>`;
        if (showMoreMusicBtn) showMoreMusicBtn.style.display = 'none';
        return;
      }

      // Sort files alphabetically
      result.files.sort((a, b) => a.localeCompare(b));

      const ul = document.createElement('ul');
      result.files.forEach((file, index) => {
        const li = document.createElement('li');
        li.style.display = 'flex';
        li.style.justifyContent = 'space-between';
        li.style.alignItems = 'center';
        li.style.marginBottom = '8px';
        
        // Hide items beyond the first 8
        if (index >= 8) {
            li.classList.add('hidden-music-item');
            li.style.display = 'none';
        }

        const formattedTitle = formatSongTitle(file);
        const span = document.createElement('span');
        span.textContent = formattedTitle;

        if (currentSong && formattedTitle === currentSong) {
          li.classList.add('playing');
        }

        const buttonsDiv = document.createElement('div');

        const renameBtn = document.createElement('button');
        renameBtn.textContent = 'Renommer';
        renameBtn.classList.add('rename-music-btn');
        renameBtn.dataset.filename = file;

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Supprimer';
        deleteBtn.classList.add('delete-btn', 'delete-music-btn'); // Reuse existing .delete-btn style
        deleteBtn.dataset.filename = file; // Store original filename

        li.appendChild(span);
        buttonsDiv.appendChild(renameBtn);
        buttonsDiv.appendChild(deleteBtn);
        li.appendChild(buttonsDiv);
        ul.appendChild(li);
      });
      musicManagementContainer.appendChild(ul);

      // Show/Hide "Show More" button
      if (result.files.length > 8) {
          if (showMoreMusicBtn) {
              showMoreMusicBtn.style.display = 'inline-block';
              showMoreMusicBtn.textContent = 'Voir plus ▼';
              showMoreMusicBtn.setAttribute('data-expanded', 'false');
          }
      } else {
          if (showMoreMusicBtn) showMoreMusicBtn.style.display = 'none';
      }

    } catch (error) {
      musicManagementContainer.innerHTML = `<p style="color: red;">Impossible de charger les fichiers de musique: ${error.message}</p>`;
    }
  }

  // --- Rename Music File ---
  async function renameMusicFile(oldFilename) {
      const newFilename = prompt(`Entrez le nouveau nom pour "${oldFilename}":`, oldFilename);

      if (newFilename === null || newFilename.trim() === '') {
          alert('Le renommage a été annulé.');
          return;
      }

      if (newFilename === oldFilename) {
          alert('Le nouveau nom est identique à l\'ancien. Aucune modification n\'a été apportée.');
          return;
      }

      try {
          const response = await fetch('rename_music.php', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify({ old_name: oldFilename, new_name: newFilename }),
          });

          const result = await response.json();

          if (response.ok && result.status === 'success') {
              alert(result.message);
              renderMusicFiles(); // Refresh the list
          } else {
              throw new Error(result.message || 'Une erreur est survenue lors du renommage.');
          }
      } catch (error) {
          alert(`Erreur: ${error.message}`);
      }
  }


  // --- Delete Music File ---
  async function deleteMusicFile(filename) {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le fichier "${filename}" ? Cette action est irréversible.`)) {
      return;
    }

    try {
      const response = await fetch('delete_music.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filename: filename }),
      });

      const result = await response.json();

      if (response.ok) {
        alert(result.message); // Show success message
        renderMusicFiles(); // Refresh the list
      } else {
        throw new Error(result.message || 'Une erreur est survenue lors de la suppression.');
      }
    } catch (error) {
      alert(`Erreur: ${error.message}`);
    }
  }

  // --- Event Listeners ---
  // Refresh button for music files
  if (refreshMusicBtn) {
    refreshMusicBtn.addEventListener('click', renderMusicFiles);
  }

  // Show More button
  if (showMoreMusicBtn) {
      showMoreMusicBtn.addEventListener('click', () => {
          const isExpanded = showMoreMusicBtn.getAttribute('data-expanded') === 'true';
          const hiddenItems = document.querySelectorAll('.hidden-music-item');
          
          if (!isExpanded) {
              // Expand
              hiddenItems.forEach(item => {
                  item.style.display = 'flex';
              });
              showMoreMusicBtn.textContent = 'Voir moins ▲';
              showMoreMusicBtn.setAttribute('data-expanded', 'true');
          } else {
              // Collapse
              hiddenItems.forEach(item => {
                  item.style.display = 'none';
              });
              showMoreMusicBtn.textContent = 'Voir plus ▼';
              showMoreMusicBtn.setAttribute('data-expanded', 'false');
              
              // Scroll back to the top of the list or button to keep context
              musicManagementContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
      });
  }

  // Delegated listener for music file delete buttons
  if (musicManagementContainer) {
    musicManagementContainer.addEventListener('click', (e) => {
      if (e.target.classList.contains('delete-music-btn')) {
        const filename = e.target.dataset.filename;
        if (filename) {
          deleteMusicFile(filename);
        }
      } else if (e.target.classList.contains('rename-music-btn')) {
        const filename = e.target.dataset.filename;
        if (filename) {
          renameMusicFile(filename);
        }
      }
    });
  }

  // Initial and periodic load of music files
  if (musicManagementContainer) {
    renderMusicFiles(); // Initial load
    setInterval(renderMusicFiles, 20000); // Refresh every 20 seconds
  }

  // --- Initial loads for Playlists ---
  if (existingPlaylistsContainer && allSongsListContainer) {
    fetchAllSongs();
    fetchPlaylists();
  }

  // --- YouTube Downloader ---
  const youtubeDownloadForm = document.getElementById('youtubeDownloadForm');
  const youtubeUrlInput = document.getElementById('youtubeUrl');
  const youtubeFormMessage = document.getElementById('youtubeFormMessage');
  const youtubeSubmitBtn = youtubeDownloadForm.querySelector('button[type="submit"]');

  if (youtubeDownloadForm) {
    youtubeDownloadForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const url = youtubeUrlInput.value;

      if (!url) {
        youtubeFormMessage.textContent = 'Veuillez entrer une URL.';
        youtubeFormMessage.style.color = 'red';
        return;
      }

      // Disable form and show loading state
      youtubeSubmitBtn.disabled = true;
      youtubeSubmitBtn.textContent = 'Téléchargement en cours...';
      youtubeFormMessage.textContent = '';
      youtubeFormMessage.style.color = 'inherit';

      try {
        const response = await fetch('download_youtube.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url: url }),
        });

        const result = await response.json();

        if (response.ok) {
          youtubeFormMessage.textContent = result.message;
          youtubeFormMessage.style.color = 'green';
          youtubeDownloadForm.reset();
          renderMusicFiles(); // Refresh the music list
        } else {
          throw new Error(result.message || 'Une erreur inconnue est survenue.');
        }
      } catch (error) {
        youtubeFormMessage.textContent = `Erreur: ${error.message}`;
        youtubeFormMessage.style.color = 'red';
      } finally {
        // Re-enable form
        youtubeSubmitBtn.disabled = false;
        youtubeSubmitBtn.textContent = 'Télécharger et convertir en MP3';
      }
    });
  }

  const logoutBtn = document.getElementById('logoutBtn');

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      sessionStorage.removeItem('loggedIn');
      window.location.href = 'login.html';
    });
  }
});