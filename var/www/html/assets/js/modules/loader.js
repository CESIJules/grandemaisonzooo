export function initLoader() {
    const loadingScreen = document.getElementById('loadingScreen');
    const marqueeContent = document.getElementById('marqueeContent');
    const landingVideo = document.getElementById('landingVideo');
    const videoOverlay = document.getElementById('videoOverlay');
    const backgroundVideo = document.getElementById('backgroundVideo');
    const burgerBtn = document.getElementById('burgerBtn');
    const titleAccueil = document.getElementById('titleAccueil');
    const hasPlayedIntro = sessionStorage.getItem('introPlayed');

    function updateLoaderText(percent) {
        if (!marqueeContent) return;
        const items = marqueeContent.querySelectorAll('.marquee-item');
        items.forEach(item => {
            item.innerHTML = `GRANDEMAISON <span class="marquee-separator">|</span> LOADING ${percent}%`;
        });
    }

    function showUI() {
        if (burgerBtn) burgerBtn.style.opacity = '1';
        if (titleAccueil) titleAccueil.style.opacity = '1';
    }

    function startBackgroundVideo() {
        if (backgroundVideo) {
            backgroundVideo.muted = true;
            backgroundVideo.play().catch(err => {
                console.log('Background video autoplay prevented:', err);
            });
        }
    }

    function endIntro() {
        videoOverlay.classList.add('fade-out');
        sessionStorage.setItem('introPlayed', 'true');

        setTimeout(() => {
            startBackgroundVideo();
            videoOverlay.style.display = 'none';
        }, 300);
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

    if (landingVideo && videoOverlay && backgroundVideo) {
        if (hasPlayedIntro) {
            if (loadingScreen) loadingScreen.style.display = 'none';
            videoOverlay.style.display = 'none';
            showUI();
            startBackgroundVideo();
        } else {
            if (!marqueeContent) {
                playIntro();
                return;
            }

            // Generate Marquee Text (6 copies)
            marqueeContent.innerHTML = '';
            for (let i = 0; i < 6; i++) {
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
    }
}
