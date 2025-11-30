document.addEventListener('DOMContentLoaded', () => {
  // --- Global Variables & Helpers ---
  const mainContainer = document.querySelector('main');
  const sections = document.querySelectorAll('section');
  let currentSectionIndex = 0;
  let isNavigating = false;
  
  // Timeline State
  let timelineTargetScroll = 0;
  let isAnimatingTimeline = false;

  let isScrolling;
  let isSnapping = false;
  let animationFrameId;

  // Custom smooth scroll function (Easing à balle: easeInOutQuint)
  function smoothScrollTo(targetPosition, duration, callback) {
    if (!mainContainer) return;
    const startPosition = mainContainer.scrollTop;
    const distance = targetPosition - startPosition;
    let startTime = null;
    
    // Cancel any previous animation
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    isSnapping = true;

    function animation(currentTime) {
      if (startTime === null) startTime = currentTime;
      const timeElapsed = currentTime - startTime;
      
      // Ease function (easeInOutQuint) - Accélération/Décélération très marquée
      const ease = (t, b, c, d) => {
        t /= d / 2;
        if (t < 1) return c / 2 * t * t * t * t * t + b;
        t -= 2;
        return c / 2 * (t * t * t * t * t + 2) + b;
      };

      const nextScrollTop = ease(timeElapsed, startPosition, distance, duration);
      mainContainer.scrollTop = nextScrollTop;

      if (timeElapsed < duration) {
        animationFrameId = requestAnimationFrame(animation);
      } else {
        mainContainer.scrollTop = targetPosition;
        isSnapping = false;
        animationFrameId = null;
        if (callback) callback();
      }
    }

    animationFrameId = requestAnimationFrame(animation);
  }

  // --- Landing Video Overlay ---
  const videoOverlay = document.getElementById('videoOverlay');
  const landingVideo = document.getElementById('landingVideo');
  const backgroundVideo = document.getElementById('backgroundVideo');
  const burgerBtn = document.getElementById('burgerBtn');
  const titleAccueil = document.getElementById('titleAccueil');

  // Flag pour s'assurer que l'intro ne se joue qu'une fois par session
  const hasPlayedIntro = sessionStorage.getItem('introPlayed');

  // Fonction pour démarrer la vidéo de fond
  function startBackgroundVideo() {
    if (backgroundVideo) {
      backgroundVideo.muted = true;
      backgroundVideo.play().catch(err => {
        console.log('Background video autoplay prevented:', err);
      });
    }
  }

  // Fonction pour afficher les éléments UI
  function showUI() {
    if (burgerBtn) burgerBtn.style.opacity = '1';
    if (titleAccueil) titleAccueil.style.opacity = '1';
  }

  // Fonction pour terminer l'intro
  function endIntro() {
    videoOverlay.classList.add('fade-out');
    sessionStorage.setItem('introPlayed', 'true');
    
    setTimeout(() => {
      startBackgroundVideo();
      videoOverlay.style.display = 'none';
    }, 300);
  }

  if (landingVideo && videoOverlay && backgroundVideo) {
    if (hasPlayedIntro) {
      // L'intro a déjà été jouée dans cette session, skip directement
      videoOverlay.style.display = 'none';
      showUI();
      startBackgroundVideo();
    } else {
      // Première visite de la session : essayer de jouer l'intro avec son
      
      // Tenter la lecture avec son
      const playPromise = landingVideo.play();
      
      if (playPromise !== undefined) {
        playPromise.then(() => {
          // Lecture réussie avec son
          console.log('Video playing with sound');
          
          // Afficher le burger et le titre après 4 secondes
          setTimeout(() => {
            showUI();
          }, 4000);

          // Quand la vidéo se termine
          landingVideo.addEventListener('ended', endIntro);
          
        }).catch(err => {
          // Autoplay bloqué (souvent sur mobile ou navigateurs stricts)
          console.log('Autoplay with sound blocked:', err);
          
          // Essayer en mode muet
          landingVideo.muted = true;
          landingVideo.play().then(() => {
            console.log('Video playing muted as fallback');
            
            setTimeout(() => {
              showUI();
            }, 4000);

            landingVideo.addEventListener('ended', endIntro);
            
          }).catch(mutedErr => {
            // Même le mode muet échoue, skip l'intro
            console.log('Even muted autoplay failed:', mutedErr);
            showUI();
            endIntro();
          });
        });
      }

      // Fallback en cas d'erreur de chargement
      landingVideo.addEventListener('error', (e) => {
        console.error('Video loading error:', e);
        showUI();
        endIntro();
      });
      
      // Timeout de sécurité : si la vidéo ne démarre pas après 2 secondes
      setTimeout(() => {
        if (landingVideo.paused && landingVideo.readyState < 2) {
          console.log('Video loading timeout, skipping intro');
          showUI();
          endIntro();
        }
      }, 2000);
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
  const vinylDisc = document.getElementById('vinyl-disc');
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
        const w = circularVisualizer.width;
        const h = circularVisualizer.height;
        const cx = w / 2;
        const cy = h / 2;

        circularCtx.clearRect(0, 0, w, h);

        const numPoints = 120; // More points for a smoother curve
        const innerRadius = 110;
        const maxBarHeight = 60; // Increased max height slightly

        const points = [];
        for (let i = 0; i < numPoints; i++) {
          const angle = (i / numPoints) * 2 * Math.PI;
          
          // --- UPDATED FREQUENCY MAPPING ---
          // Use a wider spectrum (up to 60%) and less aggressive power curve (0.8)
          // This will make high frequencies more visible
          const percent = i / numPoints;
          const frequencyIndex = Math.floor(Math.pow(percent, 0.8) * (bufferLength * 0.6));
          const freqData = dataArray[frequencyIndex];
          const normalizedValue = freqData / 255.0;

          // Use a different power curve for the height to make it feel more reactive
          const barHeight = Math.pow(normalizedValue, 1.5) * maxBarHeight;

          const radius = innerRadius + barHeight;
          points.push({
            x: cx + Math.cos(angle) * radius,
            y: cy + Math.sin(angle) * radius
          });
        }

        // Draw the curved path
        if (points.length > 0) {
          circularCtx.beginPath();
          circularCtx.moveTo((points[0].x + points[points.length - 1].x) / 2, (points[0].y + points[points.length - 1].y) / 2);

          for (let i = 0; i < points.length - 1; i++) {
            const xc = (points[i].x + points[i + 1].x) / 2;
            const yc = (points[i].y + points[i + 1].y) / 2;
            circularCtx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
          }
          // Curve back to the start
          circularCtx.quadraticCurveTo(points[points.length - 1].x, points[points.length - 1].y, (points[points.length - 1].x + points[0].x) / 2, (points[points.length - 1].y + points[0].y) / 2);

          circularCtx.closePath();
          
          // --- STYLING (WITH NEW GRADIENT FILL) ---
          
          // 1. Subtle Gradient Fill
          const fillGradient = circularCtx.createRadialGradient(cx, cy, innerRadius, cx, cy, innerRadius + maxBarHeight);
          fillGradient.addColorStop(0, 'rgba(255, 255, 255, 0.0)');   // Transparent near center
          fillGradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.15)');// Visible in the middle
          fillGradient.addColorStop(1, 'rgba(255, 255, 255, 0.0)');   // Fades out at the peaks
          circularCtx.fillStyle = fillGradient;
          circularCtx.fill();

          // 2. Glow effect using shadow
          circularCtx.shadowBlur = 12;
          circularCtx.shadowColor = 'rgba(255, 255, 255, 0.5)';
          
          // 3. Main line
          circularCtx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
          circularCtx.lineWidth = 2;
          circularCtx.stroke();

          // 4. A thinner, brighter inner line for more definition
          circularCtx.shadowBlur = 0; // Turn off shadow for this line
          circularCtx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
          circularCtx.lineWidth = 0.8;
          circularCtx.stroke();
        }
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

  // --- ASCII Background Effect ---
  const asciiCanvas = document.getElementById('asciiBg');
  
  function initAsciiBackground() {
    if (!asciiCanvas) return;
    const ctx = asciiCanvas.getContext('2d');
    let width, height;
    let cols, rows;
    const charSize = 14; 
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$#@%&?!<>"; 
    
    let mouse = { x: -1000, y: -1000 };
    
    // Grid state
    let grid = []; // grid[x][y] = char
    let offsets = []; // offsets[x] = float y shift
    let speeds = []; // speeds[x] = float speed

    window.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    });

    function initGrid() {
      grid = [];
      offsets = [];
      speeds = [];
      for (let x = 0; x < cols; x++) {
        let col = [];
        for (let y = 0; y < rows + 2; y++) { 
          col.push(chars[Math.floor(Math.random() * chars.length)]);
        }
        grid.push(col);
        offsets.push(Math.random() * charSize);
        speeds.push(Math.random() * 0.8 + 0.2); 
      }
    }

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      asciiCanvas.width = width;
      asciiCanvas.height = height;
      cols = Math.ceil(width / charSize);
      rows = Math.ceil(height / charSize);
      ctx.font = `${charSize}px 'Courier New', monospace`;
      initGrid();
    }
    window.addEventListener('resize', resize);
    resize();

    function draw() {
      requestAnimationFrame(draw);
      
      const time = Date.now() * 0.001;
      
      ctx.fillStyle = '#050505'; 
      ctx.fillRect(0, 0, width, height);
      
      ctx.textBaseline = 'top';
      
      for (let x = 0; x < cols; x++) {
        offsets[x] += speeds[x];
        
        if (offsets[x] >= charSize) {
           offsets[x] -= charSize;
           grid[x].pop();
           grid[x].unshift(chars[Math.floor(Math.random() * chars.length)]);
        }

        for (let y = 0; y < rows; y++) {
          const px = x * charSize;
          const py = y * charSize + offsets[x] - charSize; 
          
          if (py > height) continue;

          const char = grid[x][y];
          
          // Mouse interaction
          const dx = mouse.x - (px + charSize/2);
          const dy = mouse.y - (py + charSize/2);
          
          // Organic/Anarchic Shape (Wobbly distortion)
          const angle = Math.atan2(dy, dx);
          const distortion = Math.sin(angle * 3 + time * 2) * 20 
                           + Math.cos(angle * 5 - time * 1.5) * 10
                           + Math.sin(angle * 7 + time * 4) * 5;
          
          const dist = Math.sqrt(dx*dx + dy*dy) + distortion;
          
          const maxRadius = 100; // Reduced radius
          let intensity = 0;
          
          if (dist < maxRadius) {
             intensity = 1 - (dist / maxRadius);
             // Tighter highlight
             intensity = Math.pow(intensity, 6); 
          }
          
          if (intensity > 0.01) {
             const scale = 1 + intensity * 1.2; 
             
             // Color interpolation (Dark Grey -> White)
             const val = Math.floor(26 + intensity * (255 - 26));
             ctx.fillStyle = `rgb(${val}, ${val}, ${val})`;
             
             ctx.font = `${charSize * scale}px 'Courier New', monospace`;
             
             if (intensity > 0.6) { // Glow only for core
                 ctx.shadowBlur = 15 * intensity;
                 ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
             } else {
                 ctx.shadowBlur = 0;
             }
             
             const offset = (charSize * scale - charSize) / 2;
             ctx.fillText(char, px - offset, py - offset);
             
             // Reset
             ctx.shadowBlur = 0;
             ctx.font = `${charSize}px 'Courier New', monospace`;
          } else {
             ctx.fillStyle = '#1a1a1a';
             if (Math.random() < 0.0005) ctx.fillStyle = '#333';
             ctx.fillText(char, px, py);
          }
        }
      }
    }
    draw();
  }
  
  initAsciiBackground();

  // --- Circular Volume Control Logic ---
  const circularVolumeContainer = document.getElementById('circularVolume');
  const ringProgress = document.querySelector('.ring-progress');
  const volumeIcon = document.getElementById('volumeIcon');
  
  // Note: volumeControl is now a hidden input, but we still use it for state
  // volumeToggle is removed from HTML, so we check if it exists before using
  
  // Function to update volume button position
  function updateVolumeButtonPosition() {
      if (!circularVolumeContainer) return;
      const currentSection = sections[currentSectionIndex];
      const isRadioPlaying = audio && !audio.paused;
      const isRadioSection = currentSection && currentSection.id === 'radio';
      
      if (isRadioPlaying && !isRadioSection) {
          circularVolumeContainer.classList.add('volume-floating');
      } else {
          circularVolumeContainer.classList.remove('volume-floating');
      }
  }

  if (audio && playBtn && status && volumeControl && circularVolumeContainer) {
    // Volume initial (Load from localStorage)
    const savedVolume = localStorage.getItem('radioVolume');
    let currentVolume = savedVolume !== null ? parseFloat(savedVolume) : 1;
    
    // Clamp volume
    currentVolume = Math.max(0, Math.min(1, currentVolume));

    audio.volume = currentVolume;
    volumeControl.value = currentVolume;

    // Update Ring UI
    const radius = 26;
    const circumference = 2 * Math.PI * radius;
    // Arc length is 270 degrees (3/4 of circle)
    const arcLength = circumference * 0.75;
    
    // stroke-dasharray: arcLength, circumference
    // stroke-dashoffset: arcLength * (1 - volume)
    
    function updateVolumeUI(vol) {
        // Invert volume for offset calculation because we want it to fill up
        // Offset = arcLength means empty
        // Offset = 0 means full
        const offset = arcLength * (1 - vol);
        ringProgress.style.strokeDashoffset = offset;
        
        // Update Icon
        if (vol === 0) {
            volumeIcon.className = 'fas fa-volume-mute';
        } else if (vol < 0.5) {
            volumeIcon.className = 'fas fa-volume-down';
        } else {
            volumeIcon.className = 'fas fa-volume-up';
        }
    }
    
    updateVolumeUI(currentVolume);

    // Interaction
    let isDraggingVolume = false;
    let startY = 0;
    let startVolume = 0;

    function setVolume(vol) {
        // Clamp
        vol = Math.max(0, Math.min(1, vol));
        
        audio.volume = vol;
        volumeControl.value = vol;
        localStorage.setItem('radioVolume', vol);
        updateVolumeUI(vol);
    }

    circularVolumeContainer.addEventListener('mousedown', (e) => {
        isDraggingVolume = true;
        circularVolumeContainer.classList.add('dragging');
        startY = e.clientY;
        startVolume = parseFloat(volumeControl.value);
        e.preventDefault(); // Prevent text selection
    });

    window.addEventListener('mousemove', (e) => {
        if (isDraggingVolume) {
            e.preventDefault();
            const deltaY = startY - e.clientY; // Up is positive delta
            const sensitivity = 0.005; // Adjust for speed
            
            let newVol = startVolume + (deltaY * sensitivity);
            setVolume(newVol);
        }
    });

    window.addEventListener('mouseup', () => {
        if (isDraggingVolume) {
            isDraggingVolume = false;
            circularVolumeContainer.classList.remove('dragging');
        }
    });

    
    // Touch support
    circularVolumeContainer.addEventListener('touchstart', (e) => {
        isDraggingVolume = true;
        circularVolumeContainer.classList.add('dragging');
        startY = e.touches[0].clientY;
        startVolume = parseFloat(volumeControl.value);
        e.preventDefault();
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
        if (isDraggingVolume) {
            e.preventDefault();
            const deltaY = startY - e.touches[0].clientY;
            const sensitivity = 0.005;
            
            let newVol = startVolume + (deltaY * sensitivity);
            setVolume(newVol);
        }
    }, { passive: false });

    window.addEventListener('touchend', () => {
        isDraggingVolume = false;
        circularVolumeContainer.classList.remove('dragging');
    });


    // Statuts
    audio.addEventListener('playing', () => { 
      status.textContent = ''; 
      document.getElementById('radio').classList.add('playing');
      
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
          if (vinylDisc) vinylDisc.classList.add('playing');
          updateVolumeButtonPosition();
        } else {
          audio.pause();
          playBtn.innerHTML = '<i class="fas fa-play"></i>';
          if (vinylDisc) vinylDisc.classList.remove('playing');
          updateVolumeButtonPosition();
        }
      } catch (err) {
        status.textContent = 'Lecture bloquée';
        console.error(err);
      }
    });

    // Fader de volume (Old listener removed, logic handled above)
    // volumeControl.addEventListener('input', ...);

    // Toggle volume control visibility (Removed)
    // volumeToggle.addEventListener('click', ...);

    // Hide volume control when clicking outside (Removed)
    // document.addEventListener('click', ...);

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

      // Sort Ascending (Oldest -> Newest) so Newest is at the Right (End)
      posts.sort((a, b) => new Date(a.date) - new Date(b.date));
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
          ? `<h4><a href="${post.link}" target="_blank" rel="noopener noreferrer" class="timeline-subtitle-link">${post.subtitle}</a></h4>`
          : post.subtitle
            ? `<h4>${post.subtitle}</h4>`
            : '';

        const imageElement = post.image
          ? (post.link 
              ? `<a href="${post.link}" target="_blank" rel="noopener noreferrer" class="timeline-image-link"><img src="${post.image}" alt="${post.title}" class="timeline-image"></a>`
              : `<img src="${post.image}" alt="${post.title}" class="timeline-image">`)
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
        
        const timelineIndex = Array.from(sections).findIndex(s => s.id === 'timeline');
        if (timelineIndex !== -1) {
            scrollToSection(timelineIndex);
        }
      });
    });
  }

  handleArtistTimelineLinks();

  // Intercept all anchor clicks for smooth scrolling
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
          const targetId = this.getAttribute('href').substring(1);
          const targetSection = document.getElementById(targetId);
          if (targetSection) {
              e.preventDefault();
              const index = Array.from(sections).findIndex(s => s === targetSection);
              if (index !== -1) {
                  scrollToSection(index);
              }
          }
      });
  });

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

  // --- Custom Smooth Snap Scrolling (Global Wheel Hijack) ---
  
  // Initialize current section index based on scroll position
  function updateCurrentSectionIndex() {
    let minDistance = Infinity;
    sections.forEach((section, index) => {
      const rect = section.getBoundingClientRect();
      if (Math.abs(rect.top) < minDistance) {
        minDistance = Math.abs(rect.top);
        currentSectionIndex = index;
      }
    });
  }
  
  // Initial check
  updateCurrentSectionIndex();

  // Timeline Animation Loop
  const animateTimeline = () => {
    if (!timelineContainer) return;
    
    const currentScrollLeft = timelineContainer.scrollLeft;
    const diff = timelineTargetScroll - currentScrollLeft;
    
    if (Math.abs(diff) > 0.5) {
      timelineContainer.scrollLeft = currentScrollLeft + diff * 0.08;
      requestAnimationFrame(animateTimeline);
      isAnimatingTimeline = true;
    } else {
      timelineContainer.scrollLeft = timelineTargetScroll;
      isAnimatingTimeline = false;
    }
  };

  function scrollToSection(index) {
      if (index < 0 || index >= sections.length) return;
      
      // Handle Timeline Entry Position (Right-to-Left Flow)
      const targetSection = sections[index];
      if (targetSection && targetSection.id === 'timeline' && timelineContainer) {
          if (index > currentSectionIndex) {
              // Coming from above (scrolling down) -> Start at Right (End)
              const maxScroll = timelineContainer.scrollWidth - timelineContainer.clientWidth;
              timelineContainer.scrollLeft = maxScroll;
              timelineTargetScroll = maxScroll;
          } else if (index < currentSectionIndex) {
              // Coming from below (scrolling up) -> Start at Left (Start)
              timelineContainer.scrollLeft = 0;
              timelineTargetScroll = 0;
          }
      }

      isNavigating = true;
      const target = sections[index].offsetTop;
      
      smoothScrollTo(target, 1000, () => {
          isNavigating = false;
          currentSectionIndex = index;
          if (typeof updateVolumeButtonPosition === 'function') updateVolumeButtonPosition();
      });
  }

  // Global Wheel Handler
  window.addEventListener('wheel', (e) => {
    e.preventDefault();
    
    if (isNavigating) return;

    // Determine direction
    const direction = e.deltaY > 0 ? 1 : -1;
    
    // Check if we are in Timeline
    const currentSection = sections[currentSectionIndex];
    
    if (currentSection && currentSection.id === 'timeline' && timelineContainer) {
        const maxScroll = timelineContainer.scrollWidth - timelineContainer.clientWidth;
        
        // Sync target if not animating to ensure we start from current position
        if (!isAnimatingTimeline) {
            timelineTargetScroll = timelineContainer.scrollLeft;
        }
        
        // Check if we are effectively at the boundaries based on TARGET
        // This allows "scroll to end" then "next scroll exits" behavior
        // Use a small epsilon for float comparison safety
        const isAtEnd = timelineTargetScroll >= maxScroll - 1;
        const isAtStart = timelineTargetScroll <= 1;
        
        // Logic: If we are pushing against the wall (target is at wall AND direction pushes further)
        // INVERTED LOGIC: Scroll Down (1) moves Left (towards Start). Scroll Up (-1) moves Right (towards End).
        
        if (direction === 1 && isAtStart) {
             // Go to next section (Radio)
             if (currentSectionIndex < sections.length - 1) {
                 scrollToSection(currentSectionIndex + 1);
             }
             return;
        }
        
        if (direction === -1 && isAtEnd) {
             // Go to prev section (Artists)
             if (currentSectionIndex > 0) {
                 scrollToSection(currentSectionIndex - 1);
             }
             return;
        }
        
        // Otherwise, scroll timeline
        // Invert direction: Subtract deltaY
        timelineTargetScroll -= e.deltaY * 2.5; 
        timelineTargetScroll = Math.max(0, Math.min(timelineTargetScroll, maxScroll));
        
        if (!isAnimatingTimeline) {
            requestAnimationFrame(animateTimeline);
        }
        
    } else {
        // Normal Section Navigation
        // Use a threshold to avoid accidental triggers
        if (Math.abs(e.deltaY) > 10) {
            const nextIndex = currentSectionIndex + direction;
            if (nextIndex >= 0 && nextIndex < sections.length) {
                scrollToSection(nextIndex);
            }
        }
    }
  }, { passive: false });

  // --- Touch Support (Mobile) ---
  let touchStartY = 0;
  let touchStartX = 0;
  let isTouchTriggered = false;
  
  window.addEventListener('touchstart', (e) => {
      touchStartY = e.touches[0].clientY;
      touchStartX = e.touches[0].clientX;
      isTouchTriggered = false;
  }, { passive: false });
  
  window.addEventListener('touchmove', (e) => {
      e.preventDefault(); // Prevent native scroll
      
      if (isNavigating) return;
      
      const touchY = e.touches[0].clientY;
      const touchX = e.touches[0].clientX;
      
      const deltaY = touchStartY - touchY;
      const deltaX = touchStartX - touchX;
      
      // Determine dominant axis
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
          // Horizontal Swipe
          const currentSection = sections[currentSectionIndex];
          if (currentSection && currentSection.id === 'timeline' && timelineContainer) {
               // Scroll timeline directly
               timelineContainer.scrollLeft += deltaX;
               timelineTargetScroll = timelineContainer.scrollLeft;
               touchStartX = touchX; // Continuous scroll
          }
      } else {
          // Vertical Swipe
          if (!isTouchTriggered && Math.abs(deltaY) > 50) { // Threshold
              const direction = deltaY > 0 ? 1 : -1;
              const nextIndex = currentSectionIndex + direction;
              
              // Check if we are in timeline and trying to exit
              const currentSection = sections[currentSectionIndex];
              if (currentSection && currentSection.id === 'timeline' && timelineContainer) {
                  // Allow exit regardless of horizontal position on mobile vertical swipe?
                  // Yes, usually better UX.
              }

              if (nextIndex >= 0 && nextIndex < sections.length) {
                  scrollToSection(nextIndex);
                  isTouchTriggered = true;
              }
          }
      }
  }, { passive: false });
  
}); // End DOMContentLoaded