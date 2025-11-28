document.addEventListener('DOMContentLoaded', () => {
  // Burger menu (ne pas toucher)
  const burgerBtn = document.getElementById('burgerBtn');
  const menu = document.getElementById('menu');

  function toggleMenu() {
    const hidden = menu.classList.toggle('hidden');
    menu.setAttribute('aria-hidden', hidden ? 'true' : 'false');
  }
  if (burgerBtn && menu) {
    burgerBtn.addEventListener('click', toggleMenu);
    menu.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') toggleMenu();
    });
  }

  // Radio
  const audio = document.getElementById('radioPlayer');
  const playBtn = document.getElementById('playRadio');
  const status = document.getElementById('radioStatus');
  const volumeControl = document.getElementById('volumeControl');
  const volumeToggle = document.getElementById('volumeToggle');
  const volumeContainer = document.querySelector('.volume');
  const currentSong = document.getElementById('currentSong');
  const songTimer = document.getElementById('songTimer');
  const visualizerCanvas = document.getElementById('visualizer');
  const circularVisualizer = document.getElementById('circularVisualizer');

  let audioContext;
  let analyser;
  let source;
  let visualizerInitialized = false;
  let fetchInterval;
  let songTimerInterval = null;

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  }

  function startSongTimer(duration, startTime) {
    if (songTimerInterval) {
      clearInterval(songTimerInterval);
    }
    if (!songTimer) return;

    if (!duration || !startTime) {
      songTimer.innerHTML = '';
      songTimer.style.display = 'none';
      return;
    }

    songTimer.style.display = 'block';
    songTimer.innerHTML = `
        <div class="time-display">
            <span class="elapsed">0:00</span>
            <span class="total">${formatTime(duration)}</span>
        </div>
        <div class="progress-bar-container">
            <div class="progress-bar"></div>
        </div>
    `;

    const progressBar = songTimer.querySelector('.progress-bar');
    const elapsedEl = songTimer.querySelector('.elapsed');

    songTimerInterval = setInterval(() => {
      const elapsed = (Date.now() / 1000) - startTime;

      if (elapsed >= 0 && elapsed <= duration) {
        const progress = (elapsed / duration) * 100;
        progressBar.style.width = `${progress}%`;
        elapsedEl.textContent = formatTime(elapsed);
      } else {
        // Le temps est écoulé ou invalide, on arrête
        progressBar.style.width = '100%';
        elapsedEl.textContent = formatTime(duration);
        clearInterval(songTimerInterval);
        songTimerInterval = null;
        // On cache le timer après une seconde pour une transition douce
        setTimeout(() => {
            if (songTimer) {
                songTimer.innerHTML = '';
                songTimer.style.display = 'none';
            }
        }, 1500);
      }
    }, 1000);
  }

  async function fetchTrackDetailsAndStartTimer(title) {
    try {
        // On tente d'abord avec le fichier d'info principal
        const infoResponse = await fetch(`get_track_info.php?nocache=${new Date().getTime()}`);
        const trackInfo = await infoResponse.json();

        // On vérifie si les infos correspondent au titre actuel
        const normalizedInfoTitle = trackInfo.title.toUpperCase().replace(/_/g, ' ');
        const normalizedCurrentTitle = title.toUpperCase().replace(/_/g, ' ');

        if (normalizedInfoTitle.includes(normalizedCurrentTitle) || normalizedCurrentTitle.includes(normalizedInfoTitle)) {
            if (trackInfo.duration && trackInfo.started_at) {
                startSongTimer(trackInfo.duration, trackInfo.started_at);
                return; // Succès, on s'arrête là
            }
        }
        
        // Fallback: si la durée n'était pas dans le JSON, on la demande via get_duration.php
        console.log("Fallback: Durée non trouvée dans track_info.json, appel de get_duration.php pour le titre :", title);
        const durationResponse = await fetch(`get_duration.php?title=${encodeURIComponent(title)}`);
        const durationInfo = await durationResponse.json();

        if (durationInfo.duration) {
            // Pour l'heure de début, on ne l'a pas, donc on la considère comme "maintenant".
            // Ce sera moins précis, mais c'est mieux que rien.
            const estimatedStartTime = Date.now() / 1000;
            startSongTimer(durationInfo.duration, estimatedStartTime);
        } else {
            console.error("Impossible d'obtenir la durée pour le morceau:", title, durationInfo.error);
            startSongTimer(0, 0); // Cache le timer
        }

    } catch (error) {
        console.error("Erreur lors de la récupération des détails du morceau :", error);
        startSongTimer(0, 0); // Cache le timer
    }
  }


  function setupVisualizer() {
    if (visualizerInitialized) return;
    
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    source = audioContext.createMediaElementSource(audio);

    source.connect(analyser);
    analyser.connect(audioContext.destination);

    analyser.fftSize = 512;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const canvasCtx = visualizerCanvas.getContext('2d');
    const circularCtx = circularVisualizer ? circularVisualizer.getContext('2d') : null;
    
    function resizeCanvas() {
        visualizerCanvas.width = visualizerCanvas.offsetWidth;
        visualizerCanvas.height = visualizerCanvas.offsetHeight;
        if (circularVisualizer) {
          circularVisualizer.width = circularVisualizer.offsetWidth;
          circularVisualizer.height = circularVisualizer.offsetHeight;
        }
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);


    function draw() {
      requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray);
      
      // --- Linear Visualizer (Background) ---
      const WIDTH = visualizerCanvas.width;
      const HEIGHT = visualizerCanvas.height;

      if (WIDTH > 0 && HEIGHT > 0) {
        canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

        const barWidth = 3;
        let barHeight;
        let numBars = Math.floor(WIDTH / (barWidth + 1));
        
        if (numBars > bufferLength) {
          numBars = bufferLength;
        }

        const step = Math.floor(bufferLength / numBars);

        for (let i = 0; i < numBars; i++) {
          let dataSum = 0;
          for(let j = 0; j < step; j++) {
              dataSum += dataArray[(i * step) + j];
          }
          let average = dataSum / step;
          // Boost height for better visibility
          barHeight = (average / 255.0) * HEIGHT * 0.85;

          const x = i * (barWidth + 1);
          const y = HEIGHT / 2 - barHeight / 2;

          const gradient = canvasCtx.createLinearGradient(x, y, x, y + barHeight);
          gradient.addColorStop(0, 'rgba(204, 204, 204, 0.3)');
          gradient.addColorStop(1, 'rgba(204, 204, 204, 0.1)');

          canvasCtx.fillStyle = gradient;
          canvasCtx.fillRect(x, y, barWidth, barHeight);
        }
      }

      // --- Circular Visualizer (Button) ---
      if (circularCtx && circularVisualizer.width > 0) {
        const w = circularVisualizer.width;
        const h = circularVisualizer.height;
        const cx = w / 2;
        const cy = h / 2;

        circularCtx.clearRect(0, 0, w, h);

        // Calculate average volume (bass focused)
        let sum = 0;
        const bassRange = Math.floor(bufferLength * 0.15); // Low frequencies
        for(let i = 0; i < bassRange; i++) {
            sum += dataArray[i];
        }
        const average = sum / bassRange;
        const normalizedVol = average / 255;

        // Draw concentric pulsing rings
        const baseRadius = 88; // Increased size
        
        // Ring 1 (Main pulse)
        circularCtx.beginPath();
        // Increased reactivity
        circularCtx.arc(cx, cy, baseRadius + (normalizedVol * 40), 0, 2 * Math.PI);
        circularCtx.strokeStyle = `rgba(255, 255, 255, ${0.2 + (normalizedVol * 0.5)})`;
        circularCtx.lineWidth = 1.5;
        circularCtx.stroke();

        // Ring 2 (Echo pulse)
        circularCtx.beginPath();
        // Increased reactivity
        circularCtx.arc(cx, cy, baseRadius + 14 + (normalizedVol * 80), 0, 2 * Math.PI);
        circularCtx.strokeStyle = `rgba(255, 255, 255, ${0.1 + (normalizedVol * 0.2)})`;
        circularCtx.lineWidth = 1;
        circularCtx.stroke();
      }
    }

    draw();
    visualizerInitialized = true;
  }

  // Noise Effect (Canvas)
  const noiseCanvas = document.getElementById('noiseCanvas');
  let noiseCtx;
  let noiseAnimationId;
  let lastNoiseTime = 0;
  const noiseFps = 12; // 12 FPS for organic/stop-motion feel

  function resizeNoise() {
    if (noiseCanvas) {
      noiseCanvas.width = noiseCanvas.offsetWidth;
      noiseCanvas.height = noiseCanvas.offsetHeight;
    }
  }
  window.addEventListener('resize', resizeNoise);
  resizeNoise();

  function drawNoise(time) {
    noiseAnimationId = requestAnimationFrame(drawNoise);

    if (time - lastNoiseTime < 1000 / noiseFps) return;
    lastNoiseTime = time;

    if (!noiseCanvas) return;
    if (!noiseCtx) noiseCtx = noiseCanvas.getContext('2d');

    const w = noiseCanvas.width;
    const h = noiseCanvas.height;

    noiseCtx.clearRect(0, 0, w, h);

    // Settings for "scattered" and "glitchy"
    const numParticles = 15; // Very sparse
    noiseCtx.fillStyle = 'rgba(255, 255, 255, 0.15)'; // Low opacity

    for (let i = 0; i < numParticles; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const size = Math.random() * 3 + 1;

      if (Math.random() > 0.95) {
        // Vertical scratch line
        noiseCtx.fillRect(x, 0, 1, h);
      } else if (Math.random() > 0.9) {
        // Horizontal glitch block
        noiseCtx.fillRect(x, y, size * 20, size);
      } else {
        // Random dust speck
        noiseCtx.fillRect(x, y, size, size);
      }
    }
  }

  if (audio && playBtn && status && volumeControl && volumeToggle) {
    // Volume initial
    audio.volume = parseFloat(volumeControl.value || '1');

    // Statuts
    audio.addEventListener('playing', () => { 
      status.textContent = ''; 
      document.getElementById('radio').classList.add('playing');
      if (!noiseAnimationId) drawNoise(0); // Start noise
      
      if (!fetchInterval) {
          fetchCurrentSong(); // Fetch immediately on play
          fetchInterval = setInterval(fetchCurrentSong, 5000);
      }
    });
    audio.addEventListener('pause', () => { 
      status.textContent = ''; 
      document.getElementById('radio').classList.remove('playing');
      if (noiseAnimationId) {
        cancelAnimationFrame(noiseAnimationId);
        noiseAnimationId = null;
        if (noiseCtx) noiseCtx.clearRect(0, 0, noiseCanvas.width, noiseCanvas.height);
      }
      if (fetchInterval) {
          clearInterval(fetchInterval);
          fetchInterval = null;
      }
      // Arrêter et cacher le minuteur à la pause
      if (songTimerInterval) {
        clearInterval(songTimerInterval);
        songTimerInterval = null;
      }
      if (songTimer) {
        songTimer.innerHTML = '';
        songTimer.style.display = 'none';
      }
    });
    audio.addEventListener('waiting', () => { status.textContent = 'Connexion au flux…'; });
    audio.addEventListener('error', () => { status.textContent = 'Erreur de lecture'; });

    // Play/Pause (radio en direct)
    playBtn.addEventListener('click', async () => {
      // On iOS, AudioContext must be resumed after a user gesture.
      if (audioContext && audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      try {
        if (audio.paused) {
          if (!visualizerInitialized) {
            setupVisualizer(); // Setup visualizer on first play
          }
          audio.src = playBtn.dataset.src;
          audio.load();
          await audio.play();
          playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        } else {
          audio.pause();
          playBtn.innerHTML = '<i class="fas fa-play"></i>';
        }
      } catch (err) {
        status.textContent = 'Lecture bloquée';
        console.error(err);
      }
    });

    // Fader de volume
    volumeControl.addEventListener('input', () => {
      audio.volume = parseFloat(volumeControl.value || '1');
    });

    // Toggle volume control visibility
    volumeToggle.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent click from bubbling to the document
      volumeContainer.classList.toggle('hidden');
    });

    // Hide volume control when clicking outside
    document.addEventListener('click', (e) => {
      const volContainer = document.querySelector('.volume-container');
      if (volContainer && !volContainer.contains(e.target)) {
        volumeContainer.classList.add('hidden');
      }
    });

    // Initial fetch of song info and listeners
    fetchCurrentSong();
    // Initial hide of the timer
    if (songTimer) songTimer.style.display = 'none';
  }

  // 🔎 Récupération du titre depuis Icecast
  let pendingTitle = null;
  let pendingTitleTimeout = null;
  let isFirstTitleLoad = true;

  function updateTitleUI(title) {
      if (!currentSong) return;
      const currentTitle = currentSong.querySelector('.title').textContent;
      if (title !== currentTitle) {
          currentSong.classList.add("fade");
          setTimeout(() => {
              currentSong.querySelector('.title').textContent = title;
              currentSong.classList.remove("fade");
              // Une fois le titre mis à jour, on lance le minuteur
              if (title !== "Aucun morceau en cours" && title !== "Infos indisponibles") {
                fetchTrackDetailsAndStartTimer(title);
              } else {
                startSongTimer(0, 0); // Cache le timer s'il n'y a pas de morceau
              }
          }, 300);
      }
  }

  async function fetchCurrentSong() {
    if (!currentSong) return;
    try {
      // Add a cache-busting query parameter
      const response = await fetch(`https://grandemaisonzoo.com/status-json.xsl?nocache=${new Date().getTime()}`);
      if (!response.ok) throw new Error("Impossible de récupérer les infos Icecast");

      const data = await response.json();
      let title = "Aucun morceau en cours";
      let listeners = 0;

      if (data.icestats && data.icestats.source) {
        const source = Array.isArray(data.icestats.source) 
          ? data.icestats.source.find(s => s.listenurl.includes('/stream')) 
          : data.icestats.source;
        
        if (source) {
          if (source.title) title = source.title;
          if (source.listeners) listeners = source.listeners;
        }
      }

      // Update listener count (Always update this)
      const listenerCountEl = document.getElementById('listenerCount');
      if (listenerCountEl) {
        listenerCountEl.innerHTML = `<i class="fas fa-user"></i> ${listeners}`;
      }

      if (title && title !== "Aucun morceau en cours") {
        title = title
          .replace(/\.[^/.]+$/, "")
          .replace(/_/g, ' ')
          .replace(/\s*-\s*/g, ' - ')
          .toUpperCase();
      }

      // Only update if the title has changed
      const currentTitle = currentSong.querySelector('.title').textContent;
      
      if (title !== currentTitle) {
        // Si c'est le premier chargement de la page, on affiche immédiatement pour ne pas laisser vide
        if (isFirstTitleLoad) {
            updateTitleUI(title);
            isFirstTitleLoad = false;
            return;
        }

        // Si le titre détecté est déjà en attente d'affichage, on ne fait rien
        if (pendingTitle === title) return;

        // Si un autre titre était en attente, on l'annule
        if (pendingTitleTimeout) {
            clearTimeout(pendingTitleTimeout);
            pendingTitleTimeout = null;
        }

        pendingTitle = title;
        
        // Calcul du délai de synchronisation (Fallback logic)
        // Délai = Buffer Client (dynamique) + Latence Serveur (fixe estimée)
        const SERVER_OFFSET = 12000; // Reduced to 12s for better sync
        let bufferDelay = 0;

        if (audio && !audio.paused && audio.buffered.length > 0) {
            // Différence entre la fin du buffer (live) et la lecture actuelle
            const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
            const currentTime = audio.currentTime;
            bufferDelay = (bufferedEnd - currentTime) * 1000;
        }
        
        // Sécurité
        if (bufferDelay < 0 || bufferDelay > 60000) bufferDelay = 0;
        
        const totalDelay = bufferDelay + SERVER_OFFSET;
        
        // On attend le délai calculé avant d'afficher
        pendingTitleTimeout = setTimeout(() => {
            updateTitleUI(title);
            pendingTitle = null;
            pendingTitleTimeout = null;
        }, totalDelay);
      }

    } catch (err) {
      console.error("Erreur:", err);
      currentSong.querySelector('.title').textContent = "Infos indisponibles";
    }
  }

  // Formulaire de contact
  const contactForm = document.getElementById('contactForm');
  const formMessage = document.getElementById('formMessage');

  if (contactForm && formMessage) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const data = new FormData(form);
      
      try {
        const response = await fetch(form.action, {
          method: form.method,
          body: data,
          headers: { 'Accept': 'application/json' }
        });
        
        if (response.ok) {
          formMessage.textContent = 'Message envoyé. Vous serez recontacté sous peu.';
          form.reset();
          const submitButton = form.querySelector('button[type="submit"]');
          if (submitButton) submitButton.style.display = 'none';
          setTimeout(() => {
            formMessage.textContent = '';
            if (submitButton) submitButton.style.display = '';
          }, 5000);
        } else {
          formMessage.textContent = 'Erreur lors de l\'envoi';
        }
      } catch (error) {
        formMessage.textContent = 'Erreur réseau';
      }
    });
  }

  // --- Timeline Management ---
  const timelineContainer = document.querySelector('.timeline-container');
  const timelineFilters = document.querySelector('.timeline-filters');

  async function renderTimelinePosts(artist = 'Tous') {
    if (!timelineContainer) return;

    const fetchURL = `./get_posts.php?artist=${encodeURIComponent(artist)}`;

    try {
      const response = await fetch(fetchURL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Erreur du serveur: ${response.statusText}`);
      let posts = await response.json();

      if (!Array.isArray(posts)) {
        console.error("Les données reçues ne sont pas un tableau:", posts);
        posts = [];
      }

      posts.sort((a, b) => new Date(b.date) - new Date(a.date));
      timelineContainer.innerHTML = '';

      if (posts.length === 0) {
        timelineContainer.innerHTML = '<p style="text-align: center; color: white;">Aucun post sur la timeline pour le moment.</p>';
        return;
      }

      posts.forEach((post, index) => {
        const timelineItem = document.createElement('div');
        timelineItem.classList.add('timeline-item');

        const contentDiv = document.createElement('div');
        contentDiv.classList.add('timeline-content');
        contentDiv.classList.add(index % 2 === 0 ? 'timeline-content-left' : 'timeline-content-right');

        contentDiv.innerHTML = `
          <h3>${post.title}</h3>
          ${post.subtitle ? `<h4>${post.subtitle}</h4>` : ''}
          ${post.content.startsWith('uploads/') || (post.content.startsWith('http') && (post.content.endsWith('.jpg') || post.content.endsWith('.png') || post.content.endsWith('.webp') || post.content.endsWith('.gif')))
            ? `<img src="${post.content}" alt="${post.title}">`
            : post.content.startsWith('http')
              ? `<p><a href="${post.content}" target="_blank" rel="noopener noreferrer">${post.content}</a></p>`
              : `<p>${post.content}</p>`
          }
          <span class="timeline-date">${new Date(post.date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
        `;

        timelineItem.appendChild(contentDiv);
        timelineContainer.appendChild(timelineItem);
      });

    } catch (error) {
      console.error('Impossible de charger la timeline:', error);
      timelineContainer.innerHTML = '<p style="text-align: center; color: red;">Erreur: Impossible de charger la timeline.</p>';
    }
  }

  async function populateFilterButtons() {
    if (!timelineFilters) return;

    try {
      const response = await fetch('get_artists.php');
      if (!response.ok) {
        throw new Error('Could not fetch artists');
      }
      const artists = await response.json();

      timelineFilters.innerHTML = ''; // Clear existing buttons

      // "Tous" button
      const allButton = document.createElement('button');
      allButton.className = 'btn filter-btn active';
      allButton.dataset.artist = 'Tous';
      allButton.textContent = 'Tous';
      timelineFilters.appendChild(allButton);

      artists.forEach(artist => {
        const button = document.createElement('button');
        button.className = 'btn filter-btn';
        button.dataset.artist = artist;
        button.textContent = artist;
        timelineFilters.appendChild(button);
      });

      // Add event listeners to new buttons
      const filterButtons = document.querySelectorAll('.filter-btn');
      filterButtons.forEach(button => {
        button.addEventListener('click', () => {
          const artist = button.dataset.artist;

          filterButtons.forEach(btn => btn.classList.remove('active'));
          button.classList.add('active');

          renderTimelinePosts(artist);
        });
      });

    } catch (error) {
      console.error('Failed to populate filter buttons:', error);
      timelineFilters.innerHTML = '<p style="color: red;">Erreur de chargement des filtres.</p>';
    }
  }

  // Initial render
  populateFilterButtons();
  renderTimelinePosts();

  function handleArtistTimelineLinks() {
    const artistTimelineButtons = document.querySelectorAll('.artiste .btn[data-artist]');
    artistTimelineButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        const artist = button.dataset.artist;
        const filterButton = document.querySelector(`.filter-btn[data-artist="${artist}"]`);
        if (filterButton) {
          filterButton.click();
        }
        document.querySelector('#timeline').scrollIntoView({ behavior: 'smooth' });
      });
    });
  }

  handleArtistTimelineLinks();

  // Handle URL parameter for artist filter
  const urlParams = new URLSearchParams(window.location.search);
  const artistParam = urlParams.get('artist');
  if (artistParam) {
    // We need to wait for the filter buttons to be populated
    setTimeout(() => {
      const filterButton = document.querySelector(`.filter-btn[data-artist="${artistParam}"]`);
      if (filterButton) {
        filterButton.click();
        document.querySelector('#timeline').scrollIntoView({ behavior: 'smooth' });
      }
    }, 500); // Small delay to ensure buttons are rendered
  }
  
}); // End DOMContentLoaded