import { formatTime } from './utils.js';

export class AudioPlayer {
    constructor() {
        this.audio = document.getElementById('radioPlayer');
        this.playBtn = document.getElementById('playRadio');
        this.status = document.getElementById('radioStatus');
        this.volumeControl = document.getElementById('volumeControl');
        this.currentSong = document.getElementById('currentSong');
        this.listenerCountEl = document.getElementById('listenerCount');
        
        // Progress Bar Elements
        this.progressBar = document.getElementById('progress-bar');
        this.elapsedTimeEl = document.getElementById('elapsed-time');
        this.remainingTimeEl = document.getElementById('remaining-time');
        this.progressInfo = document.getElementById('progress-info');
        
        // RC Elements (Radio Controller)
        this.rcPlayPause = document.getElementById('rcPlayPause');
        this.rcTitle = document.getElementById('rcTitle');
        this.rcArtist = document.getElementById('rcArtist');
        this.rcElapsed = document.getElementById('rcElapsed');
        this.rcRemaining = document.getElementById('rcRemaining');
        this.rcProgressBar = document.getElementById('rcProgressBar');

        // State
        this.audioContext = null;
        this.analyser = null;
        this.source = null;
        this.fetchInterval = null;
        this.progressInterval = null;
        this.trackDuration = 0;
        this.trackStartTime = 0;
        this.pendingTitle = null;
        this.pendingTitleTimeout = null;
        this.isFirstTitleLoad = true;

        // PiP
        this.pipBtn = document.getElementById('rcPipBtn');
        this.mainPipBtn = document.getElementById('mainPipBtn');
        this.pipVideo = null;
        this.radarCanvas = document.getElementById('radarPoints'); // Needed for PiP stream

        this.init();
    }

    init() {
        if (!this.audio) return;

        this.initVolume();
        this.initControls();
        this.initMediaSession();
        this.initPiP();
        this.fetchCurrentSong();
    }

    initVolume() {
        const savedVolume = localStorage.getItem('radioVolume');
        let currentVolume = savedVolume !== null ? parseFloat(savedVolume) : 0.2;
        currentVolume = Math.max(0, Math.min(1, currentVolume));

        this.audio.volume = currentVolume;
        if (this.volumeControl) this.volumeControl.value = currentVolume;
        
        // Dispatch volume event for UI updates
        window.dispatchEvent(new CustomEvent('volumeChanged', { detail: { volume: currentVolume } }));
    }

    setVolume(vol) {
        vol = Math.max(0, Math.min(1, vol));
        this.audio.volume = vol;
        if (this.volumeControl) this.volumeControl.value = vol;
        window.dispatchEvent(new CustomEvent('volumeChanged', { detail: { volume: vol } }));
    }

    saveVolume() {
        localStorage.setItem('radioVolume', this.audio.volume);
    }

    initControls() {
        this.audio.addEventListener('playing', () => {
            this.status.textContent = '';
            document.getElementById('radio').classList.add('playing');
            this.updatePlayPauseUI(true);
            
            if (!this.fetchInterval) {
                this.fetchCurrentSong();
                this.fetchInterval = setInterval(() => this.fetchCurrentSong(), 5000);
            }

            if (this.trackDuration > 0 && this.trackStartTime > 0) {
                if (this.progressInterval) clearInterval(this.progressInterval);
                this.updateProgressBar();
                this.progressInterval = setInterval(() => this.updateProgressBar(), 250);
                if (this.progressInfo) this.progressInfo.classList.add('visible');
            }

            if (this.pipVideo && this.pipVideo.paused) {
                this.pipVideo.play().catch(e => console.log("PiP auto-play blocked", e));
            }
            
            window.dispatchEvent(new CustomEvent('audioPlaying'));
        });

        this.audio.addEventListener('pause', () => {
            this.status.textContent = '';
            document.getElementById('radio').classList.remove('playing');
            this.updatePlayPauseUI(false);

            if (this.fetchInterval) {
                clearInterval(this.fetchInterval);
                this.fetchInterval = null;
            }
            if (this.progressInterval) {
                clearInterval(this.progressInterval);
                this.progressInterval = null;
            }
            if (this.progressInfo) this.progressInfo.classList.remove('visible');

            if (this.pipVideo && !this.pipVideo.paused) {
                this.pipVideo.pause();
            }

            window.dispatchEvent(new CustomEvent('audioPaused'));
        });

        this.audio.addEventListener('waiting', () => { this.status.textContent = 'Connexion au flux…'; });
        this.audio.addEventListener('error', () => { this.status.textContent = 'Erreur de lecture'; });

        this.playBtn.addEventListener('click', () => this.togglePlay());
        if (this.rcPlayPause) {
            this.rcPlayPause.addEventListener('click', () => this.togglePlay());
        }
    }

    togglePlay() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        if (this.audio.paused) {
            // Initialize AudioContext if needed (for visualizer)
            if (!this.audioContext) {
                this.setupAudioContext();
            }
            
            this.audio.src = this.playBtn.dataset.src;
            const playPromise = this.audio.play();

            if (playPromise !== undefined) {
                playPromise.catch(err => {
                    this.status.textContent = 'Lecture bloquée';
                    console.error(err);
                });
            }
        } else {
            this.audio.pause();
        }
    }

    updatePlayPauseUI(isPlaying) {
        const icon = isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
        this.playBtn.innerHTML = icon;
        if (this.rcPlayPause) this.rcPlayPause.innerHTML = icon;
    }

    setupAudioContext() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        this.source = this.audioContext.createMediaElementSource(this.audio);
        this.source.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);
        this.analyser.fftSize = 2048;
        
        // Expose analyser for Visualizer
        window.audioAnalyser = this.analyser;
        window.audioContext = this.audioContext;
    }

    async fetchCurrentSong() {
        if (!this.currentSong) return;
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
                    rawTitle = source.title;
                    title = rawTitle
                        .replace(/\.[^/.]+$/, "")
                        .replace(/_/g, ' ')
                        .replace(/\s*-\s*/g, ' - ')
                        .toUpperCase();
                    if (source.listeners) listeners = source.listeners;
                }
            }

            if (this.listenerCountEl) {
                this.listenerCountEl.innerHTML = `<i class="fas fa-user"></i> ${listeners}`;
            }

            const currentTitle = this.currentSong.querySelector('.title').textContent;

            if (title !== currentTitle) {
                if (this.isFirstTitleLoad) {
                    this.isFirstTitleLoad = false;
                    this.updateTitleUI(title);
                    if (rawTitle) this.fetchAndSetProgress(rawTitle);
                    return;
                }

                if (this.pendingTitle === title) return;

                if (this.pendingTitleTimeout) clearTimeout(this.pendingTitleTimeout);

                this.pendingTitle = title;

                const SERVER_OFFSET = 12000;
                let bufferDelay = 0;

                if (this.audio && !this.audio.paused && this.audio.buffered.length > 0) {
                    const bufferedEnd = this.audio.buffered.end(this.audio.buffered.length - 1);
                    const currentTime = this.audio.currentTime;
                    bufferDelay = (bufferedEnd - currentTime) * 1000;
                }

                if (bufferDelay < 0 || bufferDelay > 60000) bufferDelay = 0;

                const totalDelay = bufferDelay + SERVER_OFFSET;

                this.pendingTitleTimeout = setTimeout(() => {
                    this.updateTitleUI(title);
                    if (rawTitle) this.fetchAndSetProgress(rawTitle);
                    this.pendingTitle = null;
                    this.pendingTitleTimeout = null;
                }, totalDelay);
            }

        } catch (err) {
            console.error("Erreur:", err);
            this.currentSong.querySelector('.title').textContent = "Infos indisponibles";
        }
    }

    updateTitleUI(title) {
        if (!this.currentSong) return;
        const currentTitle = this.currentSong.querySelector('.title').textContent;

        if (title !== currentTitle) {
            const startWidth = this.currentSong.offsetWidth;
            const startHeight = this.currentSong.offsetHeight;
            this.currentSong.style.width = `${startWidth}px`;
            this.currentSong.style.height = `${startHeight}px`;

            this.currentSong.classList.add("fade");

            setTimeout(() => {
                this.currentSong.querySelector('.title').textContent = title;

                this.currentSong.style.width = 'auto';
                this.currentSong.style.height = 'auto';
                const newWidth = this.currentSong.offsetWidth;
                const newHeight = this.currentSong.offsetHeight;

                this.currentSong.style.width = `${startWidth}px`;
                this.currentSong.style.height = `${startHeight}px`;

                this.currentSong.offsetHeight; // Force reflow

                this.currentSong.style.width = `${newWidth}px`;
                this.currentSong.style.height = `${newHeight}px`;

                this.currentSong.classList.remove("fade");
                this.updateRCInfo(title);

                setTimeout(() => {
                    this.currentSong.style.width = 'auto';
                    this.currentSong.style.height = 'auto';
                }, 500);

            }, 300);
        } else {
            this.updateRCInfo(title);
        }
    }

    updateRCInfo(fullTitle) {
        if (!this.rcTitle || !this.rcArtist) return;

        const parts = fullTitle.split(' - ');
        let artist = '';
        let title = fullTitle;

        if (parts.length >= 2) {
            artist = parts[0];
            title = parts.slice(1).join(' - ');
            this.rcArtist.textContent = artist;
            this.rcTitle.textContent = title;
        } else {
            this.rcTitle.textContent = fullTitle;
            this.rcArtist.textContent = '';
        }

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

    async fetchAndSetProgress(rawTitle) {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
        if (this.progressInfo) this.progressInfo.classList.remove('visible');

        try {
            const response = await fetch(`./api/get_duration.php?file=${encodeURIComponent(rawTitle)}`);
            const data = await response.json();

            if (response.ok && data.duration && data.duration > 0) {
                this.trackDuration = data.duration;
                this.trackStartTime = Date.now() / 1000;

                this.updateProgressBar();
                this.progressInterval = setInterval(() => this.updateProgressBar(), 250);
                if (this.progressInfo) this.progressInfo.classList.add('visible');
            }
        } catch (e) {
            console.error("Erreur lors de la récupération de la durée:", e);
            if (this.progressInfo) this.progressInfo.classList.remove('visible');
        }
    }

    updateProgressBar() {
        if (!this.trackDuration || !this.trackStartTime) return;

        const now = Date.now() / 1000;
        let elapsed = now - this.trackStartTime;

        if (elapsed > this.trackDuration) elapsed = this.trackDuration;
        if (elapsed < 0) elapsed = 0;

        const remaining = this.trackDuration - elapsed;
        const percentage = (elapsed / this.trackDuration) * 100;

        if (this.progressBar) this.progressBar.style.width = `${percentage}%`;
        if (this.elapsedTimeEl) this.elapsedTimeEl.textContent = formatTime(elapsed);
        if (this.remainingTimeEl) this.remainingTimeEl.textContent = formatTime(remaining);

        if (this.rcProgressBar) this.rcProgressBar.style.width = `${percentage}%`;
        if (this.rcElapsed) this.rcElapsed.textContent = formatTime(elapsed);
        if (this.rcRemaining) this.rcRemaining.textContent = formatTime(remaining);
    }

    initMediaSession() {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.setActionHandler('play', () => {
                if (this.audio.paused) this.togglePlay();
            });
            navigator.mediaSession.setActionHandler('pause', () => {
                if (!this.audio.paused) this.togglePlay();
            });
            navigator.mediaSession.setActionHandler('stop', () => {
                if (!this.audio.paused) this.togglePlay();
            });
        }
    }

    async togglePiP() {
        if (document.pictureInPictureElement) {
            await document.exitPictureInPicture();
        } else {
            if (!this.pipVideo) {
                this.pipVideo = document.createElement('video');
                this.pipVideo.muted = true;
                this.pipVideo.playsInline = true;
                this.pipVideo.width = 100;
                this.pipVideo.height = 100;

                if (this.radarCanvas) {
                    const stream = this.radarCanvas.captureStream(20);
                    this.pipVideo.srcObject = stream;
                }

                this.pipVideo.addEventListener('play', () => {
                    if (this.audio.paused) this.togglePlay();
                });
                this.pipVideo.addEventListener('pause', () => {
                    if (!this.audio.paused) this.togglePlay();
                });
            }
            try {
                await this.pipVideo.play();
                await this.pipVideo.requestPictureInPicture();
            } catch (error) {
                console.error('PiP failed:', error);
            }
        }
    }

    initPiP() {
        if (this.pipBtn) {
            this.pipBtn.addEventListener('click', () => this.togglePiP());
        }
        if (this.mainPipBtn) {
            this.mainPipBtn.addEventListener('click', () => this.togglePiP());
        }
    }
}
