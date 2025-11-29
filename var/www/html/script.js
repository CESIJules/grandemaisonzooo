document.addEventListener('DOMContentLoaded', () => {
  // --- Landing Video Overlay ---
  const videoOverlay = document.getElementById('videoOverlay');
  const landingVideo = document.getElementById('landingVideo');
  const backgroundVideo = document.getElementById('backgroundVideo');
  const burgerBtn = document.getElementById('burgerBtn');
  const titleAccueil = document.getElementById('titleAccueil');

  // Flag pour s'assurer que l'intro ne se joue qu'une fois par session
  const hasPlayedIntro = sessionStorage.getItem('introPlayed');

  if (landingVideo && videoOverlay && backgroundVideo && burgerBtn && titleAccueil) {
    if (hasPlayedIntro) {
      // L'intro a déjà été jouée dans cette session, skip directement
      videoOverlay.style.display = 'none';
      burgerBtn.style.opacity = '1';
      titleAccueil.style.opacity = '1';
      backgroundVideo.play();
    } else {
      // Première visite de la session : jouer l'intro avec son
      
      // Afficher le burger et le titre après 4 secondes
      setTimeout(() => {
        burgerBtn.style.opacity = '1';
        titleAccueil.style.opacity = '1';
      }, 4000);

      // Quand la vidéo se termine
      landingVideo.addEventListener('ended', () => {
        videoOverlay.classList.add('fade-out');
        
        // Marquer l'intro comme jouée
        sessionStorage.setItem('introPlayed', 'true');
        
        // Démarrer la vidéo de fond (sans son) après la transition
        setTimeout(() => {
          backgroundVideo.play();
          videoOverlay.style.display = 'none';
        }, 300); // Transition rapide
      });

      // Fallback en cas d'erreur de chargement
      landingVideo.addEventListener('error', () => {
        videoOverlay.classList.add('fade-out');
        burgerBtn.style.opacity = '1';
        titleAccueil.style.opacity = '1';
        sessionStorage.setItem('introPlayed', 'true');
        setTimeout(() => {
          backgroundVideo.play();
          videoOverlay.style.display = 'none';
        }, 300);
      });
    }
  }

  // Burger menu (ne pas toucher)
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
  const visualizerCanvas = document.getElementById('visualizer');
  const circularVisualizer = document.getElementById('circularVisualizer');
  // --- Progress Bar Elements ---
  const progressInfo = document.getElementById('progress-info');
  const progressBar = document.getElementById('progress-bar');
  const elapsedTimeEl = document.getElementById('elapsed-time');
  const remainingTimeEl = document.getElementById('remaining-time');

  let audioContext;
  let analyser;
  let source;
  let visualizerInitialized = false;
  let fetchInterval;
  // --- Progress Bar State ---
  let progressInterval = null;
  let trackDuration = 0;
  let trackStartTime = 0;

  function setupVisualizer() {
    if (visualizerInitialized) return;
    
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    source = audioContext.createMediaElementSource(audio);

    source.connect(analyser);
    analyser.connect(audioContext.destination);

    analyser.fftSize = 2048;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const canvasCtx = visualizerCanvas.getContext('2d');
    const circularCtx = circularVisualizer ? circularVisualizer.getContext('2d') : null;
    let waveTime = 0;
    
    
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

        // Nombre de barres pour le visualiseur
        const numBars = 100;
        const barWidth = WIDTH / numBars;
        const maxBarHeight = HEIGHT * 0.45;
        
        // Utiliser une échelle logarithmique pour mieux représenter les fréquences musicales
        const logMax = Math.log(bufferLength);
        const logMin = Math.log(1); // Éviter log(0)

        // Dessiner les courbes avec effet symétrique vertical
        canvasCtx.beginPath();
        
        const points = [];
        for (let i = 0; i < numBars; i++) {
          // --- Same logic to calculate average and barHeight ---
          const lowPercent = i / numBars;
          const highPercent = (i + 1) / numBars;
          const logIndexLow = logMin + (logMax - logMin) * lowPercent;
          const logIndexHigh = logMin + (logMax - logMin) * highPercent;
          const frequencyIndex = Math.floor(Math.exp(logIndexLow));
          let nextFrequencyIndex = Math.floor(Math.exp(logIndexHigh));
          if (nextFrequencyIndex <= frequencyIndex) {
            nextFrequencyIndex = frequencyIndex + 1;
          }
          let dataSum = 0;
          const count = nextFrequencyIndex - frequencyIndex;
          for (let j = frequencyIndex; j < nextFrequencyIndex && j < bufferLength; j++) {
            dataSum += dataArray[j];
          }
          let average = count > 0 ? dataSum / count : 0;
          const normalizedValue = average / 255.0;
          const boostedValue = Math.pow(normalizedValue, 0.6);
          const barHeight = boostedValue * maxBarHeight * 1.2;
          // --- End of calculation ---

          points.push({
              x: i * barWidth + barWidth / 2, // Center of the bar
              y: HEIGHT / 2 - barHeight
          });
        }

        // --- Draw top curve ---
        canvasCtx.moveTo(0, HEIGHT / 2);
        if (points.length > 0) {
            // Get to the first point
            const firstXc = points[0].x / 2;
            const firstYc = (points[0].y + HEIGHT / 2) / 2;
            canvasCtx.quadraticCurveTo(0, HEIGHT / 2, firstXc, firstYc);

            for (let i = 0; i < points.length - 1; i++) {
                const xc = (points[i].x + points[i+1].x) / 2;
                const yc = (points[i].y + points[i+1].y) / 2;
                canvasCtx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
            }
            // Curve to the last point and then to the edge
            const lastPoint = points[points.length - 1];
            const lastXc = (lastPoint.x + WIDTH) / 2;
            const lastYc = (lastPoint.y + HEIGHT / 2) / 2;
            canvasCtx.quadraticCurveTo(lastPoint.x, lastPoint.y, lastXc, lastYc);
            canvasCtx.quadraticCurveTo(lastXc, lastYc, WIDTH, HEIGHT/2);

        }
        canvasCtx.lineTo(WIDTH, HEIGHT / 2); // Close path at right-middle

        // --- Draw bottom curve ---
        if (points.length > 0) {
            // Get to the first point
            const firstBottomY = HEIGHT - points[0].y;
            const firstXc = points[0].x / 2;
            const firstYc = (firstBottomY + HEIGHT / 2) / 2;
            canvasCtx.quadraticCurveTo(0, HEIGHT / 2, firstXc, firstYc);


            for (let i = 0; i < points.length - 1; i++) {
                const xc = (points[i].x + points[i+1].x) / 2;
                const yc = ( (HEIGHT - points[i].y) + (HEIGHT - points[i+1].y) ) / 2;
                canvasCtx.quadraticCurveTo(points[i].x, HEIGHT - points[i].y, xc, yc);
            }
            // Curve to the last point and then to the edge
            const lastPoint = points[points.length - 1];
            const lastBottomY = HEIGHT - lastPoint.y;
            const lastXc = (lastPoint.x + WIDTH) / 2;
            const lastYc = (lastBottomY + HEIGHT / 2) / 2;
            canvasCtx.quadraticCurveTo(lastPoint.x, lastBottomY, lastXc, lastYc);
            canvasCtx.quadraticCurveTo(lastXc, lastYc, WIDTH, HEIGHT/2);

        }
        canvasCtx.lineTo(0, HEIGHT / 2); // Close path at left-middle


        // --- Fill and Style ---
        const gradient = canvasCtx.createLinearGradient(0, 0, 0, HEIGHT);
        gradient.addColorStop(0.3, 'rgba(238, 238, 238, 0)');
        gradient.addColorStop(0.45, 'rgba(238, 238, 238, 0.4)');
        gradient.addColorStop(0.5, 'rgba(238, 238, 238, 0.5)');
        gradient.addColorStop(0.55, 'rgba(238, 238, 238, 0.4)');
        gradient.addColorStop(0.7, 'rgba(238, 238, 238, 0)');

        canvasCtx.fillStyle = gradient;
        canvasCtx.fill();

        // Also add a stroke for definition
        canvasCtx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        canvasCtx.lineWidth = 1.5;
        canvasCtx.stroke();
        
        // Ligne centrale pour marquer le centre
        canvasCtx.beginPath();
        canvasCtx.strokeStyle = 'rgba(238, 238, 238, 0.1)';
        canvasCtx.lineWidth = 1;
        canvasCtx.moveTo(0, HEIGHT / 2);
        canvasCtx.lineTo(WIDTH, HEIGHT / 2);
        canvasCtx.stroke();
      }

      // --- Circular Visualizer (Button) ---
      if (circularCtx && circularVisualizer.width > 0) {
        waveTime += 0.02; // Increment time for animation

        const w = circularVisualizer.width;
        const h = circularVisualizer.height;
        const cx = w / 2;
        const cy = h / 2;

        circularCtx.clearRect(0, 0, w, h);

        // Calculate average volume (bass focused)
        let sum = 0;
        const bassRange = Math.floor(bufferLength * 0.1); // Focus on lower bass
        for(let i = 0; i < bassRange; i++) {
            sum += dataArray[i];
        }
        let average = bassRange > 0 ? sum / bassRange : 0;
        const normalizedVol = average / 255;

        // Draw organic, wavy rings
        const baseRadius = 90;
        const segments = 100; // Number of segments for the curve
        const waveAmplitude = 5 + (normalizedVol * 20); // How much the wave moves
        const waveFrequency = 5; // How many waves

        // --- Ring 1 (Outer wave) ---
        circularCtx.beginPath();
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * 2 * Math.PI;
            const waveOffset = Math.sin(angle * waveFrequency + waveTime) * waveAmplitude;
            const radius = baseRadius + waveOffset;
            
            const x = cx + Math.cos(angle) * radius;
            const y = cy + Math.sin(angle) * radius;
            
            if (i === 0) {
                circularCtx.moveTo(x, y);
            } else {
                circularCtx.lineTo(x, y);
            }
        }
        circularCtx.closePath();
        circularCtx.strokeStyle = `rgba(255, 255, 255, ${0.3 + (normalizedVol * 0.4)})`;
        circularCtx.lineWidth = 1.5;
        circularCtx.stroke();

        // --- Ring 2 (Inner wave, slightly offset phase) ---
        const innerWaveAmplitude = 3 + (normalizedVol * 15);
        circularCtx.beginPath();
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * 2 * Math.PI;
            // Offset phase with waveTime and angle frequency
            const waveOffset = Math.sin(angle * (waveFrequency + 1) - waveTime * 1.2) * innerWaveAmplitude;
            const radius = baseRadius - 20 + waveOffset; // Smaller base radius
            
            const x = cx + Math.cos(angle) * radius;
            const y = cy + Math.sin(angle) * radius;
            
            if (i === 0) {
                circularCtx.moveTo(x, y);
            } else {
                circularCtx.lineTo(x, y);
            }
        }
        circularCtx.closePath();
        circularCtx.strokeStyle = `rgba(255, 255, 255, ${0.15 + (normalizedVol * 0.3)})`;
        circularCtx.lineWidth = 1;
        circularCtx.stroke();
      }
    }

    draw();
    visualizerInitialized = true;
  }

  // --- Fonctions pour la barre de progression ---
  function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
  }

  function updateProgressBar() {
    if (!trackDuration || !trackStartTime) return;

    const now = Date.now() / 1000;
    let elapsed = now - trackStartTime;

    // S'assurer que le temps écoulé ne dépasse pas la durée
    if (elapsed > trackDuration) elapsed = trackDuration;
    if (elapsed < 0) elapsed = 0;

    const remaining = trackDuration - elapsed;
    const percentage = (elapsed / trackDuration) * 100;

    progressBar.style.width = `${percentage}%`;
    elapsedTimeEl.textContent = formatTime(elapsed);
    remainingTimeEl.textContent = formatTime(remaining);
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

      // --- FIX: Relancer la barre de progression à la reprise de la lecture ---
      if (trackDuration > 0 && trackStartTime > 0) {
        if (progressInterval) clearInterval(progressInterval); // Sécurité
        updateProgressBar(); // Mettre à jour immédiatement
        progressInterval = setInterval(updateProgressBar, 250);
        if (progressInfo) progressInfo.classList.add('visible');
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
      // Arrêter la barre de progression
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }
      if(progressInfo) progressInfo.classList.remove('visible');
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
          }, 300);
      }
  }

  // Nouvelle fonction pour récupérer la durée et démarrer la progression
  async function fetchAndSetProgress(rawTitle) {
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }
    if (progressInfo) progressInfo.classList.remove('visible');

    try {
      const response = await fetch(`./get_duration.php?file=${encodeURIComponent(rawTitle)}`);
      const data = await response.json();

      if (response.ok && data.duration && data.duration > 0) {
        trackDuration = data.duration;
        trackStartTime = Date.now() / 1000; // Heure de début côté client

        updateProgressBar(); // Premier appel
        progressInterval = setInterval(updateProgressBar, 250);
        if (progressInfo) progressInfo.classList.add('visible');
      }
    } catch (e) {
      console.error("Erreur lors de la récupération de la durée:", e);
      if (progressInfo) progressInfo.classList.remove('visible');
    }
  }

  async function fetchCurrentSong() {
    if (!currentSong) return;
    try {
      const response = await fetch(`https://grandemaisonzoo.com/status-json.xsl?nocache=${new Date().getTime()}`);
      if (!response.ok) throw new Error("Impossible de récupérer les infos Icecast");

      const data = await response.json();
      let title = "Aucun morceau en cours";
      let rawTitle = "";
      let listeners = 0;

      if (data.icestats && data.icestats.source) {
        const source = Array.isArray(data.icestats.source) 
          ? data.icestats.source.find(s => s.listenurl.includes('/stream')) 
          : data.icestats.source;
        
        if (source && source.title) {
          rawTitle = source.title; // Garder le nom de fichier original
          title = rawTitle
            .replace(/\.[^/.]+$/, "")
            .replace(/_/g, ' ')
            .replace(/\s*-\s*/g, ' - ')
            .toUpperCase();
          if (source.listeners) listeners = source.listeners;
        }
      }

      const listenerCountEl = document.getElementById('listenerCount');
      if (listenerCountEl) {
        listenerCountEl.innerHTML = `<i class="fas fa-user"></i> ${listeners}`;
      }

      const currentTitle = currentSong.querySelector('.title').textContent;
      
      if (title !== currentTitle) {
        if (isFirstTitleLoad) {
            isFirstTitleLoad = false;
            updateTitleUI(title);
            if (rawTitle) fetchAndSetProgress(rawTitle);
            return;
        }

        if (pendingTitle === title) return;

        if (pendingTitleTimeout) clearTimeout(pendingTitleTimeout);

        pendingTitle = title;
        
        const SERVER_OFFSET = 12000; 
        let bufferDelay = 0;

        if (audio && !audio.paused && audio.buffered.length > 0) {
            const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
            const currentTime = audio.currentTime;
            bufferDelay = (bufferedEnd - currentTime) * 1000;
        }
        
        if (bufferDelay < 0 || bufferDelay > 60000) bufferDelay = 0;
        
        const totalDelay = bufferDelay + SERVER_OFFSET;
        
        pendingTitleTimeout = setTimeout(() => {
            updateTitleUI(title);
            if (rawTitle) fetchAndSetProgress(rawTitle); // Lancer la progression en même temps que le titre
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

        const titleElement = `<h3>${post.title}</h3>`;

        const subtitleElement = post.link && post.subtitle
          ? `<a href="${post.link}" target="_blank" rel="noopener noreferrer"><h4>${post.subtitle}</h4></a>`
          : post.subtitle
            ? `<h4>${post.subtitle}</h4>`
            : '';

        const imageElement = post.image
          ? `<img src="${post.image}" alt="${post.title}" class="timeline-image">`
          : '';

        contentDiv.innerHTML = `
          ${titleElement}
          ${subtitleElement}
          ${imageElement}
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