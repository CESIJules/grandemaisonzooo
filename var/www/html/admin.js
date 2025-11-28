document.addEventListener('DOMContentLoaded', () => {
  const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

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
          <strong>${post.title}</strong> (${post.artist}) - <span>${new Date(post.date).toLocaleDateString('fr-FR')}</span>
        </div>
        <button class="delete-btn" data-id="${post.id}">Supprimer</button>
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
      } catch (error) {
      postsManagementContainer.innerHTML = `<p style="color: red;">Impossible de charger les posts: ${error.message}</p>`;
     }
  };

  // Admin form submission
  if (adminTimelineForm) {
    adminTimelineForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const postTitle = document.getElementById('postTitle').value;
      const postSubtitle = document.getElementById('postSubtitle').value;
      const postContent = document.getElementById('postContent').value;
      const postDate = document.getElementById('postDate').value;
      const postArtist = document.getElementById('postArtist').value;
      const postImage = document.getElementById('postImage').files[0];

      if (postImage && postImage.size > MAX_FILE_SIZE) {
        adminFormMessage.textContent = 'Le fichier est trop volumineux (max 2MB)';
        adminFormMessage.style.color = 'red';
        return;
      }

      if (!postTitle || !postDate || !postArtist) {
        adminFormMessage.textContent = 'Titre, Date et Artiste sont obligatoires!';
        adminFormMessage.style.color = 'red';
        return;
      }

      const formData = new FormData();
      formData.append('title', postTitle);
      formData.append('subtitle', postSubtitle);
      formData.append('content', postContent);
      formData.append('date', postDate);
      formData.append('artist', postArtist);
      formData.append('id', Date.now()); // Assign a temporary unique ID

      if (postImage) {
        formData.append('image', postImage);
      }
      
      await addPost(formData);
    });
  }

  // Initial load of posts for the management area
  if (postsManagementContainer) {
    renderAdminPosts();
  }

  // --- Music Management ---
  const musicManagementContainer = document.getElementById('musicManagementContainer');
  const refreshMusicBtn = document.getElementById('refreshMusicBtn');

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
        return;
      }

      // Sort files alphabetically
      result.files.sort((a, b) => a.localeCompare(b));

      const ul = document.createElement('ul');
      result.files.forEach(file => {
        const li = document.createElement('li');
        li.style.display = 'flex';
        li.style.justifyContent = 'space-between';
        li.style.alignItems = 'center';
        li.style.marginBottom = '8px';

        const formattedTitle = formatSongTitle(file);
        const span = document.createElement('span');
        span.textContent = formattedTitle;

        if (currentSong && formattedTitle === currentSong) {
          li.classList.add('playing');
        }

        const buttonsDiv = document.createElement('div');

        const queueBtn = document.createElement('button');
        queueBtn.textContent = '+ File';
        queueBtn.classList.add('queue-btn', 'queue-music-btn');
        queueBtn.dataset.filename = file;

        const renameBtn = document.createElement('button');
        renameBtn.textContent = 'Renommer';
        renameBtn.classList.add('rename-music-btn');
        renameBtn.dataset.filename = file;

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Supprimer';
        deleteBtn.classList.add('delete-btn', 'delete-music-btn'); // Reuse existing .delete-btn style
        deleteBtn.dataset.filename = file; // Store original filename

        li.appendChild(span);
        buttonsDiv.appendChild(queueBtn);
        buttonsDiv.appendChild(renameBtn);
        buttonsDiv.appendChild(deleteBtn);
        li.appendChild(buttonsDiv);
        ul.appendChild(li);
      });
      musicManagementContainer.appendChild(ul);

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

  // --- Radio Control ---
  const skipBtn = document.getElementById('skipBtn');
  const currentPlayingSong = document.getElementById('currentPlayingSong');
  const queueLength = document.getElementById('queueLength');
  const queueContainer = document.getElementById('queueContainer');

  // Fonction pour mettre a jour l'affichage du morceau en cours
  async function updateCurrentSong() {
    const currentSong = await fetchCurrentSong();
    if (currentPlayingSong) {
      currentPlayingSong.textContent = currentSong || 'Aucune lecture en cours';
    }
  }

  // Fonction pour mettre a jour la longueur de la file d'attente
  async function updateQueueLength() {
    try {
      const response = await fetch('radio_control.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'queue_length' }),
      });

      const result = await response.json();

      if (response.ok && result.status === 'success') {
        if (queueLength) {
          queueLength.textContent = result.length;
        }
        // Mettre a jour le conteneur si vide
        if (queueContainer && result.length === 0) {
          queueContainer.innerHTML = '<p>Aucune chanson en file d\'attente</p>';
        }
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de la file d\'attente:', error);
    }
  }

  // Fonction pour passer au morceau suivant
  async function skipSong() {
    try {
      skipBtn.disabled = true;
      skipBtn.textContent = 'Passage...';

      const response = await fetch('radio_control.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'skip' }),
      });

      const result = await response.json();

      if (response.ok && result.status === 'success') {
        // Attendre un peu et mettre a jour
        setTimeout(() => {
          updateCurrentSong();
          updateQueueLength();
        }, 1000);
      } else {
        alert('Erreur: ' + (result.message || 'Impossible de passer au morceau suivant'));
      }
    } catch (error) {
      alert('Erreur: ' + error.message);
    } finally {
      skipBtn.disabled = false;
      skipBtn.innerHTML = '<span>⏭️</span> Passer au suivant';
    }
  }

  // Fonction pour ajouter une chanson a la file d'attente
  async function queueSong(filename) {
    try {
      const response = await fetch('radio_control.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'queue', filename: filename }),
      });

      const result = await response.json();

      if (response.ok && result.status === 'success') {
        alert('Morceau ajouté à la file d\'attente: ' + formatSongTitle(filename));
        updateQueueLength();
      } else {
        alert('Erreur: ' + (result.message || 'Impossible d\'ajouter le morceau'));
      }
    } catch (error) {
      alert('Erreur: ' + error.message);
    }
  }

  // Event listener pour le bouton skip
  if (skipBtn) {
    skipBtn.addEventListener('click', skipSong);
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
      } else if (e.target.classList.contains('queue-music-btn')) {
        const filename = e.target.dataset.filename;
        if (filename) {
          queueSong(filename);
        }
      }
    });
  }

  // Initial and periodic load of music files
  if (musicManagementContainer) {
    renderMusicFiles(); // Initial load
    setInterval(renderMusicFiles, 20000); // Refresh every 20 seconds
  }

  // Initialisation et mise a jour periodique pour radio control
  if (currentPlayingSong) {
    updateCurrentSong();
    setInterval(updateCurrentSong, 10000); // Mise a jour toutes les 10 secondes
  }

  if (queueLength) {
    updateQueueLength();
    setInterval(updateQueueLength, 10000); // Mise a jour toutes les 10 secondes
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