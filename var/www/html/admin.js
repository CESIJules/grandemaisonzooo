document.addEventListener('DOMContentLoaded', () => {
  // --- Tab Navigation ---
  const tabLinks = document.querySelectorAll('.tab-link');
  const tabContents = document.querySelectorAll('.tab-content');

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
  const musicFileSelect = document.getElementById('musicFileSelect');
  const musicStatus = document.getElementById('musicStatus');
  const refreshMusicBtn = document.getElementById('refreshMusicBtn');
  const renameMusicBtn = document.getElementById('renameMusicBtn');
  const deleteMusicBtn = document.getElementById('deleteMusicBtn');

  // Function to render music files in the management area
  async function renderMusicFiles() {
    if (!musicFileSelect) return;

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

      // Save current selection
      const currentSelection = musicFileSelect.value;

      musicFileSelect.innerHTML = '<option value="" disabled selected>Choisir un fichier...</option>'; // Clear existing files

      if (result.files.length === 0) {
        if (musicStatus) musicStatus.innerHTML = `<p>${result.message || 'Aucun fichier de musique trouvé.'}</p>`;
        return;
      } else {
        if (musicStatus) musicStatus.innerHTML = '';
      }

      // Sort files alphabetically
      result.files.sort((a, b) => a.localeCompare(b));

      result.files.forEach(file => {
        const option = document.createElement('option');
        option.value = file;
        
        const formattedTitle = formatSongTitle(file);
        let displayText = formattedTitle;
        
        if (currentSong && formattedTitle === currentSong) {
          displayText += ' (En cours)';
        }
        
        option.textContent = displayText;
        musicFileSelect.appendChild(option);
      });

      // Restore selection if it still exists
      if (currentSelection && result.files.includes(currentSelection)) {
          musicFileSelect.value = currentSelection;
      }

    } catch (error) {
      if (musicStatus) {
        musicStatus.innerHTML = `<p style="color: red;">Impossible de charger les fichiers de musique: ${error.message}</p>`;
      }
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

  // Rename button
  if (renameMusicBtn) {
      renameMusicBtn.addEventListener('click', () => {
          const filename = musicFileSelect.value;
          if (filename) {
              renameMusicFile(filename);
          } else {
              alert('Veuillez sélectionner un fichier à renommer.');
          }
      });
  }

  // Delete button
  if (deleteMusicBtn) {
      deleteMusicBtn.addEventListener('click', () => {
          const filename = musicFileSelect.value;
          if (filename) {
              deleteMusicFile(filename);
          } else {
              alert('Veuillez sélectionner un fichier à supprimer.');
          }
      });
  }

  // Initial and periodic load of music files
  if (musicFileSelect) {
    renderMusicFiles(); // Initial load
    setInterval(renderMusicFiles, 20000); // Refresh every 20 seconds
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