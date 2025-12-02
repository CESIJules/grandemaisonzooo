document.addEventListener('DOMContentLoaded', () => {
  // --- Global Variables & Helpers ---
  const mainContainer = document.querySelector('main');
  const sections = document.querySelectorAll('section');
  let currentSectionIndex = 0;
  let isNavigating = false;

  // --- START: Fullscreen height fix for mobile browsers ---
  function setMainHeight() {
    const vh = window.innerHeight;
    // Force html, body, and main to take the full visible height.
    document.documentElement.style.height = `${vh}px`;
    document.body.style.height = `${vh}px`;
    if (mainContainer) {
      mainContainer.style.height = `${vh}px`;
    }
  }
  // Set height on initial load and on resize/orientation change.
  setMainHeight();
  window.addEventListener('resize', setMainHeight);
  window.addEventListener('orientationchange', setMainHeight);
  // --- END: Fullscreen height fix for mobile browsers ---
  
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

  // --- Interactive Title Shadow (Accueil) ---
  if (titleAccueil) {
    document.addEventListener('mousemove', (e) => {
      // Only calculate if we are on the accueil section to save performance
      if (currentSectionIndex !== 0) return;

      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      
      // Calculate position relative to center (-1 to 1)
      const x = (clientX / innerWidth - 0.5) * 2; 
      const y = (clientY / innerHeight - 0.5) * 2;
      
      // Max shadow offset in pixels
      const maxOffset = 30; 
      
      // Invert direction for "light source" feel or keep same for "floating" feel
      // Here we invert to make the text feel like it's floating above the shadow
      const shadowX = x * maxOffset * -1; 
      const shadowY = y * maxOffset * -1;
      
      titleAccueil.style.textShadow = `
        0 0 20px rgba(255, 255, 255, 0.4),
        ${shadowX}px ${shadowY}px 40px rgba(0, 0, 0, 0.9)
      `;
    });
  }

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

  // --- Loading Screen Logic ---
  const loadingScreen = document.getElementById('loadingScreen');
  const marqueeContent = document.getElementById('marqueeContent');

  function updateLoaderText(percent) {
      if (!marqueeContent) return;
      const items = marqueeContent.querySelectorAll('.marquee-item');
      items.forEach(item => {
          item.innerHTML = `GRANDEMAISON <span class="marquee-separator">|</span> LOADING ${percent}%`;
      });
  }

  function playIntro() {
      // Réduire le volume de l'intro
      landingVideo.volume = 0.3; // 30% volume

      // Tenter la lecture avec son
      const playPromise = landingVideo.play();
      
      if (playPromise !== undefined) {
        playPromise.then(() => {
          console.log('Video playing with sound');
          setTimeout(() => { showUI(); }, 4000);
          landingVideo.addEventListener('ended', endIntro);
        }).catch(err => {
          console.log('Autoplay with sound blocked:', err);
          landingVideo.muted = true;
          landingVideo.play().then(() => {
            console.log('Video playing muted as fallback');
            setTimeout(() => { showUI(); }, 4000);
            landingVideo.addEventListener('ended', endIntro);
          }).catch(mutedErr => {
            console.log('Even muted autoplay failed:', mutedErr);
            showUI();
            endIntro();
          });
        });
      }

      landingVideo.addEventListener('error', (e) => {
        console.error('Video loading error:', e);
        showUI();
        endIntro();
      });
  }

  function finishLoading() {
      if (loadingScreen) {
          loadingScreen.classList.add('hidden');
          setTimeout(() => {
              loadingScreen.style.display = 'none';
          }, 500);
      }
      playIntro();
  }

  function initLoader() {
      if (!marqueeContent) {
          playIntro();
          return;
      }

      // Generate Marquee Text (6 copies)
      marqueeContent.innerHTML = '';
      for(let i=0; i<6; i++) {
          const span = document.createElement('span');
          span.className = 'marquee-item';
          span.innerHTML = `GRANDEMAISON <span class="marquee-separator">|</span> LOADING 0%`;
          marqueeContent.appendChild(span);
      }

      const xhr = new XMLHttpRequest();
      xhr.open('GET', 'vid/landing.mp4', true);
      xhr.responseType = 'blob';

      xhr.onprogress = (e) => {
          if (e.lengthComputable) {
              const percent = Math.round((e.loaded / e.total) * 100);
              updateLoaderText(percent);
          }
      };

      xhr.onload = () => {
          if (xhr.status === 200) {
              const blob = xhr.response;
              const url = URL.createObjectURL(blob);
              landingVideo.src = url;
              
              updateLoaderText(100);
              setTimeout(finishLoading, 500);
          } else {
              console.error("Video load failed, status:", xhr.status);
              finishLoading();
          }
      };
      
      xhr.onerror = () => {
          console.error("Video load error");
          finishLoading();
      };

      xhr.send();
  }

  if (landingVideo && videoOverlay && backgroundVideo) {
    if (hasPlayedIntro) {
      if (loadingScreen) loadingScreen.style.display = 'none';
      videoOverlay.style.display = 'none';
      showUI();
      startBackgroundVideo();
    } else {
      initLoader();
    }
  }

  // Burger menu 
  const menu = document.getElementById('menu');
  const menuCloseBtn = document.getElementById('menuCloseBtn');
  const menuItems = document.querySelectorAll('.menu-item');
  const menuLinks = document.querySelectorAll('.menu-link');
  
  // Lines for animation
  const lineV4 = document.querySelector('.line-v4');
  const lineV5 = document.querySelector('.line-v5');
  const lineH1 = document.querySelector('.line-h1');
  const lineH2 = document.querySelector('.line-h2');
  const allLines = document.querySelectorAll('.line-v, .line-h');

  // Open menu
  function openMenu() {
    menu.classList.add('open');
    menu.setAttribute('aria-hidden', 'false');
    document.body.classList.add('menu-open');
    burgerBtn.style.display = 'none';
  }

  // Close menu
  function closeMenu() {
    menu.classList.remove('open');
    menu.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('menu-open');
    burgerBtn.style.display = 'flex';
    resetLines();
  }

  // Toggle menu
  function toggleMenu() {
    if (menu.classList.contains('open')) {
      closeMenu();
    } else {
      openMenu();
    }
  }

  // Reset lines to neutral positions
  function resetLines() {
    allLines.forEach(line => {
      line.style.transform = '';
      line.classList.remove('active');
    });
  }

  // Line positioning constants for menu animation
  const LINE_POSITIONS = {
    H1_PERCENT: 0.30,           // H1 original position (35% from top)
    H2_PERCENT: 0.70,           // H2 original position (65% from top)
    V4_PERCENT: 0.596,           // V4 original position (59.6% from left)
    V5_PERCENT: 0.788,           // V5 original position (78.8% from left)
    HORIZONTAL_OFFSET: 10,       // Spacing above/below hovered item
    V4_OFFSET: 30,               // V4 offset from text left edge
    V5_OFFSET: 0                 // V5 offset (centered on number)
  };

  // Animate lines on menu item hover
  function animateLinesForItem(item) {
    if (!item) {
      resetLines();
      return;
    }

    const rect = item.getBoundingClientRect();
    const link = item.querySelector('.menu-link');
    const number = item.querySelector('.menu-number');
    
    const linkRect = link ? link.getBoundingClientRect() : rect;
    const numberRect = number ? number.getBoundingClientRect() : rect;

    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    // Get original line positions
    const h1Original = viewportHeight * LINE_POSITIONS.H1_PERCENT;
    const h2Original = viewportHeight * LINE_POSITIONS.H2_PERCENT;
    
    // Calculate target positions for H1 (above item) and H2 (below item)
    // Use linkRect to frame the text content, ignoring the container padding
    const h1Target = linkRect.top - LINE_POSITIONS.HORIZONTAL_OFFSET;
    const h2Target = linkRect.bottom + LINE_POSITIONS.HORIZONTAL_OFFSET;
    
    // Calculate translations
    const h1Translation = h1Target - h1Original;
    const h2Translation = h2Target - h2Original;
    
    // Animate H1 and H2 to frame the item
    if (lineH1) {
      lineH1.style.transform = `translateY(${h1Translation}px)`;
      lineH1.classList.add('active');
    }
    if (lineH2) {
      lineH2.style.transform = `translateY(${h2Translation}px)`;
      lineH2.classList.add('active');
    }
    
    // Animate V4 towards the text column (Left of text)
    if (lineV4) {
      const v4Original = viewportWidth * LINE_POSITIONS.V4_PERCENT;
      const v4Target = linkRect.left - LINE_POSITIONS.V4_OFFSET;
      const v4Translation = v4Target - v4Original;
      lineV4.style.transform = `translateX(${v4Translation}px)`;
      lineV4.classList.add('active');
    }
    
    // Animate V5 to the center of the number column
    if (lineV5) {
      const v5Original = viewportWidth * LINE_POSITIONS.V5_PERCENT;
      // Center of the number element
      const v5Target = numberRect.left + (numberRect.width / 2) + LINE_POSITIONS.V5_OFFSET;
      const v5Translation = v5Target - v5Original;
      lineV5.style.transform = `translateX(${v5Translation}px)`;
      lineV5.classList.add('active');
    }
  }

  // Event listeners for burger menu
  if (burgerBtn && menu) {
    burgerBtn.addEventListener('click', toggleMenu);
    
    // Close button
    if (menuCloseBtn) {
      menuCloseBtn.addEventListener('click', closeMenu);
    }
    
    // Close on link click
    menuLinks.forEach(link => {
      link.addEventListener('click', closeMenu);
    });
    
    // Escape key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu.classList.contains('open')) {
        closeMenu();
      }
    });
    
    // Line animations on hover
    let resetTimeout;

    menuItems.forEach(item => {
      item.addEventListener('mouseenter', () => {
        if (resetTimeout) {
          clearTimeout(resetTimeout);
          resetTimeout = null;
        }
        animateLinesForItem(item);
      });
      
      item.addEventListener('mouseleave', () => {
        resetTimeout = setTimeout(() => {
          resetLines();
        }, 200); // Small delay to allow moving to next item without reset
      });
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
  const radarCanvas = document.getElementById('radarPoints');
  const vinylDisc = document.getElementById('vinyl-disc');
  const vinylDiscContainer = document.getElementById('vinyl-disc-container');
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
  let radarStartTime = 0;

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
    const radarCtx = radarCanvas ? radarCanvas.getContext('2d') : null;
    let waveTime = 0;
    let smoothedBarHeight = 0;
    let radarActiveIntensity = 0;
    let currentRadarAngle = -Math.PI / 2; // Start at top
    let lastFrameTime = Date.now();
    
    // Radar Points Initialization
    const radarPoints = [];
    // --- CONFIGURATION RADAR ---
    const numRadarPoints = 9; // Nombre de points
    const fadeDuration = 7.0;  // Durée totale de visibilité (secondes)
    const fadeOutStart = 0;  // Délai avant le début du fade-out (secondes)
    // ---------------------------

    for (let i = 0; i < numRadarPoints; i++) {
        radarPoints.push({
            // Square root of random ensures uniform distribution over the area (avoids center clustering)
            r: Math.sqrt(Math.random()), 
            theta: Math.random() * 2 * Math.PI, 
            size: Math.random() * 2 + 1,
            // Assign a random frequency bin (0.0 to 0.8) to decouple position from frequency
            // This ensures points light up randomly across the disc, not just in the center (bass)
            freqFactor: Math.random() * 0.8 
        });
    }
    
    // Cache gradients
    let linearGradient = null;
    let circularGradient = null;

    function resizeCanvas() {
        visualizerCanvas.width = visualizerCanvas.offsetWidth;
        visualizerCanvas.height = visualizerCanvas.offsetHeight;
        if (circularVisualizer) {
          circularVisualizer.width = circularVisualizer.offsetWidth;
          circularVisualizer.height = circularVisualizer.offsetHeight;
        }
        if (radarCanvas) {
          radarCanvas.width = radarCanvas.offsetWidth;
          radarCanvas.height = radarCanvas.offsetHeight;
        }
        
        // Recreate gradients on resize
        if (visualizerCanvas.width > 0 && visualizerCanvas.height > 0) {
            const ctx = visualizerCanvas.getContext('2d');
            linearGradient = ctx.createLinearGradient(0, 0, 0, visualizerCanvas.height);
            linearGradient.addColorStop(0.3, 'rgba(238, 238, 238, 0)');
            linearGradient.addColorStop(0.45, 'rgba(238, 238, 238, 0.4)');
            linearGradient.addColorStop(0.5, 'rgba(238, 238, 238, 0.5)');
            linearGradient.addColorStop(0.55, 'rgba(238, 238, 238, 0.4)');
            linearGradient.addColorStop(0.7, 'rgba(238, 238, 238, 0)');
        }

        if (circularVisualizer && circularVisualizer.width > 0) {
             const ctx = circularVisualizer.getContext('2d');
             const cx = circularVisualizer.width / 2;
             const cy = circularVisualizer.height / 2;
             const innerRadius = 110;
             const maxBarHeight = 60;
             circularGradient = ctx.createRadialGradient(cx, cy, innerRadius, cx, cy, innerRadius + maxBarHeight);
             circularGradient.addColorStop(0, 'rgba(255, 255, 255, 0.0)');
             circularGradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.15)');
             circularGradient.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
        }
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);


    function draw() {
      requestAnimationFrame(draw);
      
      const now = Date.now();
      const deltaTime = (now - lastFrameTime) / 1000; // Seconds
      lastFrameTime = now;

      analyser.getByteFrequencyData(dataArray);

      // Smooth transition for radar activity
      if (!audio.paused) {
          // Fade In (Fast - 0.5s)
          radarActiveIntensity += deltaTime * 2.0;
          if (radarActiveIntensity > 1.0) radarActiveIntensity = 1.0;
      } else {
          // Fade Out (Slow - 3.0s)
          radarActiveIntensity -= deltaTime / 3.0;
          if (radarActiveIntensity < 0.0) radarActiveIntensity = 0.0;
      }
      
      // --- Reactivity for Radar ---
      if (vinylDisc) {
          let targetScale = 1.0;
          if (!audio.paused) {
              let sum = 0;
              // Use low frequencies for bass kick reactivity (first 1/8th of spectrum)
              const bassCount = Math.floor(bufferLength * 0.125); 
              for(let i = 0; i < bassCount; i++) {
                  sum += dataArray[i];
              }
              const average = sum / bassCount;
              
              // Scale between 1.0 and 1.15 based on bass (More reactive)
              // Use power curve to emphasize kicks
              const bassIntensity = Math.pow(average / 255, 1.2); 
              targetScale = 1 + bassIntensity * 0.15;
          }
          
          // Apply smooth start/stop transition to scale
          const currentScale = 1.0 + (targetScale - 1.0) * radarActiveIntensity;
          vinylDisc.style.transform = `scale(${currentScale})`;
      }

      // --- Radar Points ---
      if (radarCtx && radarCanvas.width > 0) {
          const w = radarCanvas.width;
          const h = radarCanvas.height;
          const cx = w / 2;
          const cy = h / 2;
          const maxRadius = w / 2;

          radarCtx.clearRect(0, 0, w, h);

          // --- Graduations (Animated) ---
          // They breathe slightly when active
          const numGrads = 48;
          const breathing = 1 + Math.sin(Date.now() * 0.002) * 0.05 * radarActiveIntensity;
          
          for (let i = 0; i < numGrads; i++) {
              const angle = (i / numGrads) * 2 * Math.PI;
              const isMajor = i % 4 === 0;
              
              // Animate length and opacity
              const baseLen = isMajor ? 15 : 8;
              const len = baseLen * (0.8 + 0.2 * radarActiveIntensity * breathing);
              
              const x1 = cx + Math.cos(angle) * (maxRadius - len);
              const y1 = cy + Math.sin(angle) * (maxRadius - len);
              const x2 = cx + Math.cos(angle) * (maxRadius - 2);
              const y2 = cy + Math.sin(angle) * (maxRadius - 2);
              
              radarCtx.beginPath();
              radarCtx.moveTo(x1, y1);
              radarCtx.lineTo(x2, y2);
              
              // Opacity transition
              const majorAlpha = 0.3 + 0.6 * radarActiveIntensity;
              const minorAlpha = 0.1 + 0.3 * radarActiveIntensity;
              
              radarCtx.strokeStyle = isMajor ? `rgba(0, 255, 104, ${majorAlpha})` : `rgba(0, 255, 104, ${minorAlpha})`;
              radarCtx.lineWidth = isMajor ? 3 : 1;
              
              // Glow for graduations
              radarCtx.shadowBlur = isMajor ? (5 + 5 * radarActiveIntensity) : 0;
              radarCtx.shadowColor = 'rgba(0, 255, 104, 0.5)';
              radarCtx.stroke();
          }
          radarCtx.shadowBlur = 0; // Reset

          if (radarActiveIntensity > 0.01) {
              // Update Angle (Continue rotating while fading out)
              const cycleDuration = 12.0; // Faster (was 15s)
              const speed = (2 * Math.PI) / cycleDuration;
              currentRadarAngle += speed * deltaTime;
              // Keep angle normalized 0..2PI for easier math? No, let it grow, use modulo for display

              // Normalize for calculations
              const normalizedAngle = currentRadarAngle % (2 * Math.PI);
              
              // Draw Sweep (JS Gradient)
              // We want a trail BEHIND the current angle.
              // Conic gradient starts at angle and goes clockwise.
              // So we want the gradient to end at currentAngle.
              // Gradient: Transparent -> White
              
              // Create gradient centered at cx, cy, starting at currentAngle - trailLength
              const trailLength = Math.PI / 2; // Longer trail (90 degrees)
              const startGrad = normalizedAngle - trailLength;
              
              // Note: createConicGradient startAngle is in radians.
              // We want the "white" part at the END of the trail (at currentAngle).
              // So gradient should go from transparent (at startGrad) to white (at currentAngle).
              
              try {
                  const gradient = radarCtx.createConicGradient(startGrad, cx, cy);
                  // Relative stops: 0 is startGrad, 1 is startGrad + 2PI (full circle)
                  // We only want to fill a sector.
                  // Actually, createConicGradient fills the whole circle. We need to mask it or set stops carefully.
                  // Easier: Set stops for the trail section.
                  // The trail is from 0 to trailLength relative to startGrad.
                  // 0 -> Transparent
                  // trailLength / (2PI) -> White
                  
                  const stopPos = trailLength / (2 * Math.PI);
                  gradient.addColorStop(0, 'transparent');
                  // Use radarActiveIntensity for opacity
                  gradient.addColorStop(Math.max(0, stopPos - 0.1), `rgba(0, 255, 104, ${0.01 * radarActiveIntensity})`); // Smooth start
                  gradient.addColorStop(stopPos, `rgba(0, 255, 104, ${0.5 * radarActiveIntensity})`); // Bright tip
                  gradient.addColorStop(stopPos + 0.001, 'transparent'); // Hard cut after tip
                  
                  radarCtx.fillStyle = gradient;
                  radarCtx.beginPath();
                  radarCtx.arc(cx, cy, maxRadius, 0, 2 * Math.PI);
                  radarCtx.fill();
              } catch (e) {
                  // Fallback if createConicGradient not supported (unlikely in modern browsers)
              }

              // Adjust to Canvas coordinates for dots
              // currentRadarAngle is 0 at 3 o'clock (Canvas default) if we didn't offset.
              // But we want to match the visual sweep.
              // The sweep tip is at `normalizedAngle`.
              const sweepAngle = normalizedAngle; 
              
              // Calculate speed and FOV based on time settings
              // cycleDuration and speed are already defined above
              const fov = speed * fadeDuration; // FOV matches the desired duration

              // Electric Effect Setup - Red & Shiny
              radarCtx.shadowColor = '#ff0000'; 
              radarCtx.fillStyle = '#ff0000';   

              radarPoints.forEach(p => {
                  // Normalize point angle to match sweepAngle range
                  let diff = sweepAngle - p.theta;
                  
                  // Normalize diff to -PI..PI or 0..2PI
                  while (diff < 0) diff += 2 * Math.PI;
                  while (diff >= 2 * Math.PI) diff -= 2 * Math.PI;
                  
                  // If diff is small positive, it means sweep passed it recently.
                  if (diff < fov) {
                      // It is in FOV!
                      p.seen = true; // Mark as seen
                      
                      // Calculate time since the sweep passed this point
                      const timeSincePass = diff / speed; // seconds

                      // Get frequency data for subtle pulsing (not visibility gating)
                      const freqIndex = Math.floor(p.freqFactor * bufferLength); 
                      const val = dataArray[freqIndex] || 0;
                      const rawAudioLevel = val / 255; // 0.0 to 1.0
                      
                      // Smooth audio level to prevent snapping when paused
                      if (typeof p.smoothedLevel === 'undefined') p.smoothedLevel = 0;
                      p.smoothedLevel += (rawAudioLevel - p.smoothedLevel) * 0.1;

                      // Position (Stable, no jitter)
                      const x = cx + Math.cos(p.theta) * (p.r * maxRadius);
                      const y = cy + Math.sin(p.theta) * (p.r * maxRadius);
                      
                      // Color Transition: White -> Red
                      // "Transition is quite short"
                      const transitionPoint = 0.2; // First 20% of the trail is the transition
                      let r, g, b;
                      
                      // Use time for color transition too (e.g. first 0.2s is white)
                      if (timeSincePass < 0.2) {
                          // Interpolate White (255,255,255) to Red (255,0,0)
                          const t = timeSincePass / 0.2; 
                          r = 255;
                          g = Math.floor(255 * (1 - t));
                          b = Math.floor(255 * (1 - t));
                      } else {
                          // Full Red
                          r = 255;
                          g = 0;
                          b = 0;
                      }

                      // Alpha: Fade out logic (Time based)
                      let alpha = 1.0;
                      if (timeSincePass > fadeOutStart) {
                          const fadeWindow = fadeDuration - fadeOutStart;
                          // Calculate progress from 0.0 to 1.0 over the fadeWindow
                          const fadeProgress = (timeSincePass - fadeOutStart) / fadeWindow;
                          alpha = Math.max(0, 1.0 - fadeProgress);
                      }
                      
                      // Size pulsing (Subtle)
                      const size = p.size * (1 + p.smoothedLevel * 0.5);

                      radarCtx.beginPath();
                      radarCtx.arc(x, y, size, 0, 2 * Math.PI);
                      
                      // Core color (White/Red)
                      radarCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha * radarActiveIntensity})`;
                      
                      // Glow enabled - Stronger & Brighter
                      // Use a lighter color for the shadow to make it "shine"
                      const glowR = Math.min(255, r + 50);
                      const glowG = Math.min(255, g + 50);
                      const glowB = Math.min(255, b + 50);
                      
                      // Use 'lighter' composite operation for intense glow effect
                      radarCtx.globalCompositeOperation = 'lighter';
                      
                      radarCtx.shadowBlur = (timeSincePass < transitionPoint) ? 80 : (40 + 50 * p.smoothedLevel);
                      radarCtx.shadowColor = `rgba(${glowR}, ${glowG}, ${glowB}, ${alpha})`;
                      
                      radarCtx.fill();
                      
                      // Reset composite operation
                      radarCtx.globalCompositeOperation = 'source-over';
                  } else if (p.seen) {
                      // Point has left the FOV (trail passed), respawn it for the next pass
                      // This creates a sense of randomness without reallocating objects
                      p.r = Math.sqrt(Math.random());
                      p.size = Math.random() * 2 + 1;
                      p.freqFactor = Math.random() * 0.8;
                      p.seen = false;

                      // Calculate a safe zone to spawn the point so it doesn't pop in
                      // The safe zone is the area NOT currently covered by the sweep trail (FOV)
                      // FOV covers [sweepAngle - fov, sweepAngle]
                      // We want to spawn in [sweepAngle, sweepAngle + (2PI - fov)]
                      
                      // Ensure we have at least a small gap
                      const safeMargin = 0.2; // radians
                      const safeZoneStart = fov + safeMargin;
                      const safeZoneEnd = 2 * Math.PI - safeMargin;
                      
                      if (safeZoneEnd > safeZoneStart) {
                          // Pick a random angle in the "invisible" sector
                          const randomOffset = safeZoneStart + Math.random() * (safeZoneEnd - safeZoneStart);
                          // diff = sweepAngle - theta  =>  theta = sweepAngle - diff
                          p.theta = sweepAngle - randomOffset;
                      } else {
                          // Fallback if FOV is huge (covers almost entire circle)
                          // Just place it directly ahead of the sweep
                          p.theta = sweepAngle + safeMargin;
                      }
                  }
              });
              radarCtx.globalAlpha = 1.0;
              radarCtx.shadowBlur = 0; // Reset
          }
      }
      
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
        // Use cached gradient
        canvasCtx.fillStyle = linearGradient || 'rgba(238, 238, 238, 0.2)';
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
          
          // 1. Subtle Gradient Fill - Use cached
          circularCtx.fillStyle = circularGradient || 'rgba(255, 255, 255, 0.1)';
          circularCtx.fill();

          // 2. Glow effect using shadow - PERFORMANCE: Removed
          // circularCtx.shadowBlur = 12;
          // circularCtx.shadowColor = 'rgba(255, 255, 255, 0.5)';
          
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

    // Update RC Progress
    if (rcProgressBar) rcProgressBar.style.width = `${percentage}%`;
    if (rcElapsed) rcElapsed.textContent = formatTime(elapsed);
    if (rcRemaining) rcRemaining.textContent = formatTime(remaining);
  }

  // --- ASCII Background Effect ---
  const asciiCanvas = document.getElementById('asciiBg');
  
  function initAsciiBackground() {
    if (!asciiCanvas) return;
    const ctx = asciiCanvas.getContext('2d');
    let width, height;
    let cols, rows;
    const charSize = 18; 
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$#@%&?!<>"; 
    
    let mouse = { x: -1000, y: -1000 };
    
    // Grid state
    let grid = []; 
    let offsets = []; 
    let speeds = []; 
    let rowNoise = []; // Pre-calculated noise for rows

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
      
      // Pre-calculate row noise
      rowNoise = [];
      for (let y = 0; y < rows; y++) {
          const noiseY = y * 0.025;
          // Combine the two static Y-dependent cosine terms
          // term1: Math.cos(noiseY * 0.8)
          // term2: Math.cos(noiseY * 1.7) * 0.5
          rowNoise.push(Math.cos(noiseY * 0.8) + Math.cos(noiseY * 1.7) * 0.5);
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

    // let frameCount = 0;
    function draw() {
      requestAnimationFrame(draw);
      
      // PERFORMANCE: Skip frames (30fps)
      // frameCount++;
      // if (frameCount % 2 !== 0) return;

      const time = Date.now() * 0.001;
      
      // Clear with transparency for trails
      ctx.fillStyle = 'rgba(5, 5, 5, 0.25)'; 
      ctx.fillRect(0, 0, width, height);
      
      ctx.textBaseline = 'top';
      // Default font
      ctx.font = `${charSize}px 'Courier New', monospace`;
      
      const maxRadius = 100; 

      for (let x = 0; x < cols; x++) {
        offsets[x] += speeds[x];
        
        if (offsets[x] >= charSize) {
           offsets[x] -= charSize;
           grid[x].pop();
           grid[x].unshift(chars[Math.floor(Math.random() * chars.length)]);
        }

        const px = x * charSize;
        const centerX = px + charSize/2;
        
        // Mouse calc (Pre-check x distance)
        const dxMouse = mouse.x - centerX;
        const absDxMouse = Math.abs(dxMouse);

        // Cloud Noise Calculation (Horizontal Movement)
        // Reduced frequency for wider, smoother gradients (0.04 -> 0.025)
        const noiseX = x * 0.025 + time * 0.15; 
        
        // Pre-calculate X noise parts
        const noisePartX1 = Math.sin(noiseX);
        const noisePartX2 = Math.sin(noiseX * 2.1 + time * 0.1) * 0.5;
        
        for (let y = 0; y < rows; y++) {
          const py = y * charSize + offsets[x] - charSize; 
          
          if (py > height) break;

          const centerY = py + charSize/2;
          
          // --- 1. Gas/Cloud Calculation (Optimized Noise) ---
          // Use pre-calculated Y noise
          // Original: let noise = noisePartX1 + Math.cos(noiseY * 0.8) + noisePartX2 + Math.cos(noiseY * 1.7) * 0.5;
          let noise = noisePartX1 + noisePartX2 + (rowNoise[y] || 0);
          
          // Normalize roughly to 0..1
          let gasIntensity = (noise + 3) / 6;
          
          // Ultra smooth thresholding
          // Higher threshold for more black space (0.1 -> 0.45)
          if (gasIntensity < 0.45) { 
              gasIntensity = 0;
          } else {
              // Remap 0.45..1.0 to 0..1.0
              gasIntensity = (gasIntensity - 0.45) / 0.55;
              // Squared curve for soft ease-in from black
              gasIntensity = gasIntensity * gasIntensity; 
          }

          // --- 2. Mouse Calculation (Restored "Animation d'avant") ---
          let mouseIntensity = 0;
          const dyMouse = mouse.y - centerY;
          const absDyMouse = Math.abs(dyMouse);

          if (absDxMouse < maxRadius && absDyMouse < maxRadius) {
              // Organic Distortion Logic
              const angle = Math.atan2(dyMouse, dxMouse);
              const distortion = Math.sin(angle * 3 + time * 2) * 20 
                               + Math.cos(angle * 5 - time * 1.5) * 10
                               + Math.sin(angle * 7 + time * 4) * 5;
              
              const dist = Math.sqrt(dxMouse*dxMouse + dyMouse*dyMouse) + distortion;
              
              if (dist < maxRadius) {
                 mouseIntensity = 1 - (dist / maxRadius);
                 // Softer falloff for mouse too
                 mouseIntensity = Math.pow(mouseIntensity, 1.5); 
              }
          }
          
          // --- Drawing ---
          
          // Blending: Avoid dark ring by taking max of mouse and gas
          // Gas is capped at ~75% brightness to keep mouse brighter
          const combinedIntensity = Math.max(mouseIntensity, gasIntensity * 0.75);

          if (combinedIntensity > 0.05) {
             
             // Scale: Only mouse affects scale
             const scale = 1 + mouseIntensity * 0.2; 
             
             // Color: Based on combined intensity (White/Gray)
             const val = Math.floor(26 + combinedIntensity * (255 - 26));
             ctx.fillStyle = `rgb(${val}, ${val}, ${val})`;
             
             ctx.font = `${charSize * scale}px 'Courier New', monospace`;
             
             // RGB Shift (Broken Orange Aberration)
             ctx.shadowBlur = 0;
             ctx.shadowColor = 'rgba(204, 85, 0, 0.6)'; // Broken orange shadow
             ctx.shadowOffsetX = 2;
             ctx.shadowOffsetY = 0;
             
             // --- Glitch & Words Logic (Mouse Only) ---
             let displayChar = grid[x][y];
             
             if (mouseIntensity > 0.01) {
                 // 1. Random Glitch (High intensity = more glitch)
                 if (mouseIntensity > 0.3 && Math.random() < 0.15) {
                     displayChar = chars[Math.floor(Math.random() * chars.length)];
                 }
                 
                 // 2. Words "GM" and "S&S"
                 if (mouseIntensity > 0.6) {
                     const mouseCol = Math.floor(mouse.x / charSize);
                     const mouseRow = Math.floor(mouse.y / charSize);
                     const relX = x - mouseCol;
                     const relY = y - mouseRow;
                     
                     // Longer cycle (8s) for longer display times
                     const cycle = time % 8; 
                     
                     // Show GM (2.5 seconds duration)
                     if (cycle > 1.0 && cycle < 3.5) {
                         if (relY === 0) {
                             if (relX === -1) displayChar = 'G';
                             if (relX === 0) displayChar = 'M';
                         }
                     }
                     // Show S&S (2.5 seconds duration)
                     else if (cycle > 5.0 && cycle < 7.5) {
                         if (relY === 0) {
                             if (relX === -1) displayChar = 'S';
                             if (relX === 0) displayChar = '&';
                             if (relX === 1) displayChar = 'S';
                         }
                     }
                     
                     // Very subtle glitch on words (reduced from 0.1 to 0.02)
                     // Makes them much more readable/stable
                     if (['G','M','S','&'].includes(displayChar) && Math.random() < 0.02) {
                         displayChar = chars[Math.floor(Math.random() * chars.length)];
                     }
                 }
             }
             
             const offset = (charSize * scale - charSize) / 2;
             ctx.fillText(displayChar, px - offset, py - offset);
             
             // Reset context
             ctx.shadowBlur = 0;
             ctx.shadowOffsetX = 0;
             ctx.font = `${charSize}px 'Courier New', monospace`;

          } else {
             // Background Rain
             ctx.fillStyle = '#111'; 
             if (Math.random() < 0.001) ctx.fillStyle = '#222';
             ctx.fillText(grid[x][y], px, py);
          }
        }
      }
    }
    draw();
  }
  
  initAsciiBackground();

  // --- Radio Controller (RC) Logic ---
  const rcContainer = document.getElementById('radioController');
  const rcHandle = document.getElementById('rcHandle');
  const rcToggleBtn = document.getElementById('rcToggleBtn');
  const rcPlayPause = document.getElementById('rcPlayPause');
  // const rcVolumeSlider = document.getElementById('rcVolumeSlider'); // Removed
  const rcCircularVolume = document.getElementById('rcCircularVolume'); // New
  const rcVolumeIcon = document.getElementById('rcVolumeIcon');
  const rcTitle = document.getElementById('rcTitle');
  const rcArtist = document.getElementById('rcArtist');
  const rcElapsed = document.getElementById('rcElapsed');
  const rcRemaining = document.getElementById('rcRemaining');
  const rcProgressBar = document.getElementById('rcProgressBar');
  const rcContent = document.querySelector('.rc-content');

  // Sync RC with Main Player
  function updateRCUI() {
      if (!rcContainer) return;
      
      // Play/Pause Icon
      if (audio.paused) {
          rcPlayPause.innerHTML = '<i class="fas fa-play"></i>';
      } else {
          rcPlayPause.innerHTML = '<i class="fas fa-pause"></i>';
      }
      
      // Volume Icon update is handled in updateVolumeUI
  }

  // Visibility Logic
  function updateRCVisibility() {
      if (!rcContainer) return;
      const currentSection = sections[currentSectionIndex];
      const isRadioSection = currentSection && currentSection.id === 'radio';
      
      if (isRadioSection) {
          rcContainer.classList.add('hidden');
      } else {
          rcContainer.classList.remove('hidden');
      }
  }

  // Docking Logic
  if (rcHandle) {
      rcHandle.addEventListener('click', () => {
          const isDocked = rcContainer.classList.contains('docked');
          
          if (!isDocked) {
             // Docking: Freeze vertical position, snap to right
             const rect = rcContainer.getBoundingClientRect();
             
             rcContainer.style.top = `${rect.top}px`;
             rcContainer.style.bottom = 'auto';
             rcContainer.style.left = 'auto';
             rcContainer.style.right = '20px';
             rcContainer.style.transform = ''; // Clear drag transform if any
             
             rcContainer.classList.add('docked');
          } else {
             // Undocking
             rcContainer.classList.remove('docked');
          }
      });
  }

  // Drag Logic
  if (rcContent) {
      let isDragging = false;
      let startX, startY, initialLeft, initialTop;

      rcContent.addEventListener('mousedown', (e) => {
          // Don't drag if clicking controls or meta info (title/artist)
          if (e.target.closest('button') || e.target.closest('.rc-volume-container') || e.target.closest('.rc-meta')) return;
          
          if (rcContainer.classList.contains('docked')) return; // Don't drag if docked

          isDragging = true;
          startX = e.clientX;
          startY = e.clientY;
          
          const rect = rcContainer.getBoundingClientRect();
          initialLeft = rect.left;
          initialTop = rect.top;
          
          rcContainer.style.transition = 'none'; // Disable transition for direct follow
          rcContainer.style.bottom = 'auto';
          rcContainer.style.right = 'auto';
          rcContainer.style.left = `${initialLeft}px`;
          rcContainer.style.top = `${initialTop}px`;
          
          e.preventDefault();
      });

      document.addEventListener('mousemove', (e) => {
          if (!isDragging) return;
          const dx = e.clientX - startX;
          const dy = e.clientY - startY;
          rcContainer.style.left = `${initialLeft + dx}px`;
          rcContainer.style.top = `${initialTop + dy}px`;
      });

      document.addEventListener('mouseup', () => {
          if (isDragging) {
              isDragging = false;
              rcContainer.style.transition = ''; // Re-enable transition
          }
      });
  }

  // Controls Events
  if (rcPlayPause) {
      rcPlayPause.addEventListener('click', () => {
          if (playBtn) playBtn.click();
          updateRCUI();
      });
  }

  // Click on Title/Artist to go to Radio
  function goToRadioSection() {
      const radioIndex = Array.from(sections).findIndex(s => s.id === 'radio');
      if (radioIndex !== -1) {
          scrollToSection(radioIndex);
      }
  }

  if (rcTitle) {
      rcTitle.style.cursor = 'pointer';
      rcTitle.addEventListener('click', goToRadioSection);
  }
  if (rcArtist) {
      rcArtist.style.cursor = 'pointer';
      rcArtist.addEventListener('click', goToRadioSection);
  }

  // --- Circular Volume Control Logic ---
  const circularVolumeContainer = document.getElementById('circularVolume');
  const volumeContainers = [circularVolumeContainer, rcCircularVolume].filter(Boolean);
  
  const ringProgresses = document.querySelectorAll('.ring-progress, .rc-ring-progress');
  const volumeIcons = document.querySelectorAll('.volume-icon-center i, #rcVolumeIcon');
  
  // Function to update volume button position (Now handles visibility of floating button)
  function updateVolumeButtonPosition() {
      updateRCVisibility();
  }

  if (audio && playBtn && status && volumeControl && volumeContainers.length > 0) {
    // Volume initial (Load from localStorage)
    const savedVolume = localStorage.getItem('radioVolume');
    // Default to 0.2 (20%) if no saved volume, otherwise use saved
    let currentVolume = savedVolume !== null ? parseFloat(savedVolume) : 0.2;
    
    // Clamp volume
    currentVolume = Math.max(0, Math.min(1, currentVolume));

    audio.volume = currentVolume;
    volumeControl.value = currentVolume;

    function updateVolumeUI(vol) {
        ringProgresses.forEach(ring => {
            const r = ring.getAttribute('r');
            const circumference = 2 * Math.PI * r;
            const arcLength = circumference * 0.75;
            const offset = arcLength * (1 - vol);
            ring.style.strokeDashoffset = offset;
        });
        
        volumeIcons.forEach(icon => {
            if (vol === 0) {
                icon.className = 'fas fa-volume-mute';
            } else if (vol < 0.5) {
                icon.className = 'fas fa-volume-down';
            } else {
                icon.className = 'fas fa-volume-up';
            }
        });
    }
    
    updateVolumeUI(currentVolume);
    updateRCVisibility();

    // Interaction
    let isDraggingVolume = false;
    let startY = 0;
    let startVolume = 0;
    let rafId = null;

    function setVolume(vol) {
        // Clamp
        vol = Math.max(0, Math.min(1, vol));
        
        audio.volume = vol;
        volumeControl.value = vol;
        // localStorage.setItem('radioVolume', vol); // Removed to prevent lag
        updateVolumeUI(vol);
    }

    function saveVolume() {
        localStorage.setItem('radioVolume', audio.volume);
    }

    volumeContainers.forEach(container => {
        container.addEventListener('mousedown', (e) => {
            isDraggingVolume = true;
            container.classList.add('dragging');
            startY = e.clientY;
            startVolume = parseFloat(volumeControl.value);
            e.preventDefault(); 
        });
        
        container.addEventListener('touchstart', (e) => {
            isDraggingVolume = true;
            container.classList.add('dragging');
            startY = e.touches[0].clientY;
            startVolume = parseFloat(volumeControl.value);
            e.preventDefault();
        }, { passive: false });
    });

    window.addEventListener('mousemove', (e) => {
        if (isDraggingVolume) {
            e.preventDefault();
            
            // Use requestAnimationFrame for smoother UI updates
            if (rafId) cancelAnimationFrame(rafId);
            
            rafId = requestAnimationFrame(() => {
                const deltaY = startY - e.clientY; 
                const sensitivity = 0.005; 
                let newVol = startVolume + (deltaY * sensitivity);
                setVolume(newVol);
            });
        }
    });

    window.addEventListener('mouseup', () => {
        if (isDraggingVolume) {
            isDraggingVolume = false;
            if (rafId) cancelAnimationFrame(rafId);
            volumeContainers.forEach(c => c.classList.remove('dragging'));
            saveVolume(); // Save on release
        }
    });

    window.addEventListener('touchmove', (e) => {
        if (isDraggingVolume) {
            e.preventDefault();
            
            if (rafId) cancelAnimationFrame(rafId);

            rafId = requestAnimationFrame(() => {
                const deltaY = startY - e.touches[0].clientY;
                const sensitivity = 0.005; 
                let newVol = startVolume + (deltaY * sensitivity);
                setVolume(newVol);
            });
        }
    }, { passive: false });

    window.addEventListener('touchend', () => {
        isDraggingVolume = false;
        if (rafId) cancelAnimationFrame(rafId);
        volumeContainers.forEach(c => c.classList.remove('dragging'));
        saveVolume(); // Save on release
    });

    // Statuts
    audio.addEventListener('playing', () => { 
      status.textContent = ''; 
      document.getElementById('radio').classList.add('playing');
      
      if (!fetchInterval) {
          // On attend 1.5s avant la première récupération d'infos.
          // Cela laisse le temps à Icecast de mettre à jour ses métadonnées après le début de la lecture.
          setTimeout(() => {
            fetchCurrentSong(); // Premier appel
            fetchInterval = setInterval(fetchCurrentSong, 5000); // On lance ensuite l'intervalle
          }, 1500);
      }

      // --- FIX: Relancer la barre de progression à la reprise de la lecture ---
      if (trackDuration > 0 && trackStartTime > 0) {
        if (progressInterval) clearInterval(progressInterval); // Sécurité
        updateProgressBar(); // Mettre à jour immédiatement
        progressInterval = setInterval(updateProgressBar, 250);
        if (progressInfo) progressInfo.classList.add('visible');
      }

      // Sync PiP state
      if (pipVideo && pipVideo.paused) {
          pipVideo.play().catch(e => console.log("PiP auto-play blocked", e));
      }
    });
        audio.addEventListener('pause', () => {
          status.textContent = '';
          document.getElementById('radio').classList.remove('playing');
          
          if (fetchInterval) {
              clearInterval(fetchInterval);
              fetchInterval = null;
          }
    
          // Sync PiP state
          if (pipVideo && !pipVideo.paused) {
              pipVideo.pause();
          }
        });    audio.addEventListener('waiting', () => { status.textContent = 'Connexion au flux…'; });
    audio.addEventListener('error', () => { status.textContent = 'Erreur de lecture'; });

    // Play/Pause (radio en direct)
    playBtn.addEventListener('click', () => { // REMOVED async
      // On iOS, AudioContext must be resumed after a user gesture.
      if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume(); // REMOVED await
      }

      try {
        if (audio.paused) {
          if (!visualizerInitialized) {
            setupVisualizer(); // Setup visualizer on first play
          }
          audio.src = playBtn.dataset.src;
          const playPromise = audio.play(); // REMOVED await, store promise

          if (playPromise !== undefined) {
            playPromise.then(() => {
              // Playback started successfully
              playBtn.innerHTML = '<i class="fas fa-pause"></i>';
              if (vinylDisc) {
                 vinylDisc.classList.add('playing');
                 if (vinylDiscContainer) vinylDiscContainer.classList.add('playing');
                 radarStartTime = Date.now();
              }
              updateVolumeButtonPosition();
            }).catch(err => {
              // Playback failed
              status.textContent = 'Lecture bloquée';
              console.error(err);
            });
          }
        } else {
          audio.pause();
          playBtn.innerHTML = '<i class="fas fa-play"></i>';
          if (vinylDisc) vinylDisc.classList.remove('playing');
          if (vinylDiscContainer) vinylDiscContainer.classList.remove('playing');
          updateVolumeButtonPosition();
        }
      } catch (err) {
        // This catch block is now less likely to be used,
        // the promise .catch() will handle play() errors.
        status.textContent = 'Erreur inattendue';
        console.error(err);
      }
    });

    // Fader de volume (Old listener removed, logic handled above)
    // volumeControl.addEventListener('input', ...);

    // Toggle volume control visibility (Removed)
    // volumeToggle.addEventListener('click', ...);

    // Hide volume control when clicking outside (Removed)
    // document.addEventListener('click', ...);

    // --- Media Session API Handlers ---
    if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', () => {
            if (audio.paused) playBtn.click();
        });
        navigator.mediaSession.setActionHandler('pause', () => {
            if (!audio.paused) playBtn.click();
        });
        navigator.mediaSession.setActionHandler('stop', () => {
             if (!audio.paused) playBtn.click();
        });
    }

    // --- PiP Logic ---
    const pipBtn = document.getElementById('rcPipBtn');
    const mainPipBtn = document.getElementById('mainPipBtn');
    let pipVideo = null;

    async function togglePiP() {
        if (document.pictureInPictureElement) {
            await document.exitPictureInPicture();
        } else {
            if (!pipVideo) {
                pipVideo = document.createElement('video');
                pipVideo.muted = true;
                pipVideo.playsInline = true;
                // Force small dimensions for the video element itself
                pipVideo.width = 100;
                pipVideo.height = 100;
                
                // Use radarCanvas stream if available
                if (radarCanvas) {
                    // Capture stream at 20fps
                    const stream = radarCanvas.captureStream(20); 
                    pipVideo.srcObject = stream;
                }
                
                // Sync PiP play/pause with audio
                pipVideo.addEventListener('play', () => {
                    if (audio.paused) playBtn.click();
                });
                pipVideo.addEventListener('pause', () => {
                    if (!audio.paused) playBtn.click();
                });
            }
            try {
                // Must play before requesting PiP
                await pipVideo.play();
                await pipVideo.requestPictureInPicture();
            } catch (error) {
                console.error('PiP failed:', error);
            }
        }
    }

    if (pipBtn) {
        pipBtn.addEventListener('click', togglePiP);
    }
    
    if (mainPipBtn) {
        mainPipBtn.addEventListener('click', togglePiP);
    }

    // Initial fetch of song info and listeners
    fetchCurrentSong();
  }

  // 🔎 Récupération du titre depuis Icecast
  let pendingTitle = null;
  let pendingTitleTimeout = null;
  let isFirstTitleLoad = true;

  function updateRCInfo(fullTitle) {
      if (!rcTitle || !rcArtist) return;
      
      const parts = fullTitle.split(' - ');
      let artist = '';
      let title = fullTitle;

      if (parts.length >= 2) {
          artist = parts[0];
          title = parts.slice(1).join(' - ');
          rcArtist.textContent = artist;
          rcTitle.textContent = title;
      } else {
          rcTitle.textContent = fullTitle;
          rcArtist.textContent = ''; 
      }

      // Update Media Session
      if ('mediaSession' in navigator) {
          navigator.mediaSession.metadata = new MediaMetadata({
              title: title,
              artist: artist,
              album: 'GrandeMaison Radio',
              artwork: [
                  { src: 'favicon.ico', sizes: '64x64', type: 'image/x-icon' }
              ]
          });
      }
  }

  function updateTitleUI(title) {
      if (!currentSong) return;
      const currentTitle = currentSong.querySelector('.title').textContent;
      
      if (title !== currentTitle) {
          // 1. Fixer la taille actuelle explicitement pour permettre l'animation
          const startWidth = currentSong.offsetWidth;
          const startHeight = currentSong.offsetHeight;
          currentSong.style.width = `${startWidth}px`;
          currentSong.style.height = `${startHeight}px`;

          currentSong.classList.add("fade");
          
          setTimeout(() => {
              // 2. Changer le contenu
              currentSong.querySelector('.title').textContent = title;
              
              // 3. Calculer la nouvelle taille naturelle
              currentSong.style.width = 'auto';
              currentSong.style.height = 'auto';
              const newWidth = currentSong.offsetWidth;
              const newHeight = currentSong.offsetHeight;
              
              // 4. Remettre la taille de départ pour animer
              currentSong.style.width = `${startWidth}px`;
              currentSong.style.height = `${startHeight}px`;
              
              // Force reflow
              currentSong.offsetHeight; 

              // 5. Animer vers la nouvelle taille
              currentSong.style.width = `${newWidth}px`;
              currentSong.style.height = `${newHeight}px`;
              
              currentSong.classList.remove("fade");
              updateRCInfo(title);

              // 6. Nettoyer après l'animation (0.5s match CSS transition)
              setTimeout(() => {
                  currentSong.style.width = 'auto';
                  currentSong.style.height = 'auto';
              }, 500);

          }, 300);
      } else {
          updateRCInfo(title);
      }
  }

  // Nouvelle fonction pour récupérer la durée et démarrer la progression
  async function fetchAndSetProgress(rawTitle, isInitialLoad = false) {
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }
    if (progressInfo) progressInfo.classList.remove('visible');

    try {
      const response = await fetch(`./get_duration.php?file=${encodeURIComponent(rawTitle)}&nocache=${new Date().getTime()}`);
      const data = await response.json();

      if (data.error) {
        console.error("Erreur de get_duration.php:", data.error);
      }

      if (response.ok && data.duration && data.duration > 0) {
        trackDuration = data.duration;
        
        // Lors du chargement de la page, on synchronise avec le temps écoulé du serveur
        if (isInitialLoad && data.start_time && data.server_now) {
          const elapsed = data.server_now - data.start_time;
          const initialElapsed = Math.max(0, elapsed);
          // On calcule un trackStartTime "fictif" dans le passé pour l'horloge du client
          trackStartTime = (Date.now() / 1000) - initialElapsed;
        } else {
          // Comportement original pour les transitions de son : on démarre le compteur maintenant
          trackStartTime = Date.now() / 1000;
        }

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
            if (rawTitle) fetchAndSetProgress(rawTitle, true);
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
            if (rawTitle) fetchAndSetProgress(rawTitle, false); // Lancer la progression en même temps que le titre
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

    let allArtists = [];
    try {
        const artistsResponse = await fetch('get_artists.php');
        if (artistsResponse.ok) {
            allArtists = await artistsResponse.json();
            // Sort by length descending to match longer names first (e.g. "Artist Name" before "Artist")
            allArtists.sort((a, b) => b.length - a.length);
        }
    } catch (e) {
        console.error("Could not fetch artists for replacement", e);
    }

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

        let displayTitle = post.title;
        let displaySubtitle = post.subtitle;

        if (allArtists.length > 0) {
            for (const artistName of allArtists) {
                const artistRegex = new RegExp(artistName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
                if (displayTitle) {
                    displayTitle = displayTitle.replace(artistRegex, artistName.toUpperCase());
                }
                if (displaySubtitle) {
                    displaySubtitle = displaySubtitle.replace(artistRegex, artistName.toUpperCase());
                }
            }
        }

        // Check if the title is an artist name (case-insensitive comparison)
        const isArtistTitle = allArtists.some(artist => artist.toLowerCase() === post.title.toLowerCase());

        const titleElement = `<h3 class="${isArtistTitle ? 'artist-title' : ''}">${displayTitle}</h3>`;

        const subtitleElement = post.link && displaySubtitle
          ? `<h4><a href="${post.link}" target="_blank" rel="noopener noreferrer" class="timeline-subtitle-link">${displaySubtitle}</a></h4>`
          : displaySubtitle
            ? `<h4>${displaySubtitle}</h4>`
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

        // Add 3D Tilt Effect
        addTiltEffect(contentDiv);

        timelineItem.appendChild(contentDiv);
        timelineContainer.appendChild(timelineItem);
      });

    } catch (error) {
      console.error('Impossible de charger la timeline:', error);
      timelineContainer.innerHTML = '<p style="text-align: center; color: red;">Erreur: Impossible de charger la timeline.</p>';
    }
  }

  // 3D Tilt Effect Function
  function addTiltEffect(card) {
    let rafId = null;
    
    card.addEventListener('mousemove', (e) => {
      if (rafId) return; // Throttle

      rafId = requestAnimationFrame(() => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        // Calculate rotation (max 15 degrees)
        const rotateX = ((y - centerY) / centerY) * -15; 
        const rotateY = ((x - centerX) / centerX) * 15;

        card.style.setProperty('--rotate-x', `${rotateX}deg`);
        card.style.setProperty('--rotate-y', `${rotateY}deg`);
        
        // Calculate shine position
        card.style.setProperty('--shine-x', `${(x / rect.width) * 100}%`);
        card.style.setProperty('--shine-y', `${(y / rect.height) * 100}%`);
        
        rafId = null;
      });
      
      // Make movement snappy when following mouse
      card.style.transition = 'transform 0.1s ease-out, box-shadow 0.4s ease'; 
    });

    card.addEventListener('mouseleave', () => {
      // Reset to center
      card.style.setProperty('--rotate-x', '0deg');
      card.style.setProperty('--rotate-y', '0deg');
      card.style.setProperty('--shine-x', '50%');
      card.style.setProperty('--shine-y', '50%');
      
      // Smooth return
      card.style.transition = 'transform 0.6s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.4s ease';
    });
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
          if (typeof updateScrollArrowVisibility === 'function') updateScrollArrowVisibility();
      });
  }

  // --- Scroll Arrow Logic ---
  const scrollArrow = document.getElementById('scrollArrow');

  function updateScrollArrowVisibility() {
      if (!scrollArrow) return;
      // Hide on last section
      if (currentSectionIndex >= sections.length - 1) {
          scrollArrow.classList.add('hidden');
      } else {
          scrollArrow.classList.remove('hidden');
      }
  }

  if (scrollArrow) {
      scrollArrow.addEventListener('click', () => {
          if (isNavigating) return;
          if (currentSectionIndex < sections.length - 1) {
              scrollToSection(currentSectionIndex + 1);
          }
      });
  }
  
  // Initial check
  updateScrollArrowVisibility();

  // --- Scroll & Layout Recalculation on Resize ---
  let resizeTimer;

  function recalculateLayout() {
    // Find the section that is currently most visible
    let closestSectionIndex = 0;
    let minDistance = Infinity;
    
    sections.forEach((section, index) => {
      const rect = section.getBoundingClientRect();
      // Use the distance from the top of the viewport
      const distance = Math.abs(rect.top);
      if (distance < minDistance) {
        minDistance = distance;
        closestSectionIndex = index;
      }
    });

    // Snap to the top of that section without smooth scrolling
    // to instantly correct the position.
    if (mainContainer) {
        mainContainer.scrollTop = sections[closestSectionIndex].offsetTop;
    }
    // Update the global index
    currentSectionIndex = closestSectionIndex;
  }

  window.addEventListener('resize', () => {
    // Debounce resize event
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(recalculateLayout, 250); // Recalculate 250ms after last resize
  });

  // Global Wheel Handler
  window.addEventListener('wheel', (e) => {
    e.preventDefault();
    
    if (document.body.classList.contains('menu-open')) return;

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
  let touchDidStartOnTimeline = false; // Flag for timeline scrolling
  
  window.addEventListener('touchstart', (e) => {
      touchStartY = e.touches[0].clientY;
      touchStartX = e.touches[0].clientX;
      isTouchTriggered = false;
      
      // Check if the touch starts inside the timeline container
      touchDidStartOnTimeline = !!e.target.closest('.timeline-container');

  }, { passive: false });
  
  window.addEventListener('touchmove', (e) => {
      const touchY = e.touches[0].clientY;
      const touchX = e.touches[0].clientX;
      const deltaY = touchStartY - touchY;
      const deltaX = touchStartX - touchX;

      // If touch started on timeline and is a vertical scroll, allow native scroll
      if (touchDidStartOnTimeline && Math.abs(deltaY) > Math.abs(deltaX)) {
          return; 
      }

      // For all other cases, prevent default to handle section swiping
      e.preventDefault();
      
      if (isNavigating) return;
      
      // Determine dominant axis
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
          // Horizontal Swipe
          const currentSection = sections[currentSectionIndex];
          if (currentSection && currentSection.id === 'timeline' && timelineContainer) {
               // Scroll timeline directly
               timelineContainer.scrollLeft += deltaX;
               timelineTargetScroll = timelineContainer.scrollLeft;
               // Update startX for continuous horizontal scroll, but not startY
               touchStartX = touchX; 
          }
      } else {
          // Vertical Swipe for changing sections
          if (!isTouchTriggered && Math.abs(deltaY) > 50) { // Threshold
              const direction = deltaY > 0 ? 1 : -1;
              const nextIndex = currentSectionIndex + direction;
  
              if (nextIndex >= 0 && nextIndex < sections.length) {
                  scrollToSection(nextIndex);
                  isTouchTriggered = true;
              }
          }
      }
  }, { passive: false });
  
  // MINDSET Hover Effect (JS Animation)
  // Generic Glitch Function
  function setupGlitchEffect(elementId, targetText, originalTextOverride = null) {
      const element = document.getElementById(elementId);
      if (!element) return;

      // Use provided original text or get from DOM (trimmed)
      const originalText = originalTextOverride || element.textContent.trim();
      // Ensure we start clean
      element.textContent = originalText;
      
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"; 
      let interval = null;

      // Identify indices that are different
      const diffIndices = [];
      const maxLength = Math.max(originalText.length, targetText.length);
      
      for (let i = 0; i < maxLength; i++) {
          if (originalText[i] !== targetText[i]) {
              diffIndices.push(i);
          }
      }

      element.addEventListener('mouseenter', () => {
          let iteration = 0;
          clearInterval(interval);
          
          interval = setInterval(() => {
              // Build the current string state
              let currentString = "";
              
              // We want to transition from originalText to targetText
              // But only glitch the changing characters
              
              // If lengths differ, we might need a different strategy.
              // For now, let's assume we are morphing to targetText length.
              
              // Construct a temporary string based on target length
              const tempArray = targetText.split('');
              
              // For each character in the target string
              for(let i = 0; i < targetText.length; i++) {
                  // If this index is one that changes
                  if (diffIndices.includes(i)) {
                      // Randomize it during animation
                      tempArray[i] = chars[Math.floor(Math.random() * chars.length)];
                  } else {
                      // Keep it stable (from target, which matches original at this index)
                      tempArray[i] = targetText[i];
                  }
              }
              
              element.textContent = tempArray.join('');
              
              // Stop after some iterations
              if (iteration > 8) { 
                  clearInterval(interval);
                  element.textContent = targetText;
              }
              iteration++;
          }, 40);
      });

      element.addEventListener('mouseleave', () => {
          let iteration = 0;
          clearInterval(interval);
          
          interval = setInterval(() => {
              const tempArray = originalText.split('');
              
              // Revert logic
              for(let i = 0; i < originalText.length; i++) {
                  if (diffIndices.includes(i)) {
                      tempArray[i] = chars[Math.floor(Math.random() * chars.length)];
                  } else {
                      tempArray[i] = originalText[i];
                  }
              }
              
              element.textContent = tempArray.join('');
              
              if (iteration > 8) {
                  clearInterval(interval);
                  element.textContent = originalText;
              }
              iteration++;
          }, 40);
      });
  }

  // Apply effects
  setupGlitchEffect('mindsetTitle', 'MįNDSET', 'MINDSET');
  setupGlitchEffect('req1Title', 'REQŘ', 'REQ1');
  setupGlitchEffect('nelsonTitle', 'NELSŚN NŚRTH', 'NELSON NORTH');
  setupGlitchEffect('shorebreakTitle', 'ŪBREAK', 'SHOREBREAK');

}); // End DOMContentLoaded
// Secret Login Combo (Left -> Right -> Right -> Left)
(function() {
    const secretCode = ['ArrowLeft', 'ArrowRight', 'ArrowRight', 'ArrowLeft'];
    let inputSequence = [];

    document.addEventListener('keydown', (e) => {
        inputSequence.push(e.key);
        if (inputSequence.length > secretCode.length) {
            inputSequence.shift();
        }
        if (JSON.stringify(inputSequence) === JSON.stringify(secretCode)) {
            window.location.href = 'admin.html';
        }
    });
})();
