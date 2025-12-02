export class RadioUI {
    constructor() {
        this.audio = document.getElementById('radioPlayer');
        this.visualizerCanvas = document.getElementById('visualizer');
        this.circularVisualizer = document.getElementById('circularVisualizer');
        this.radarCanvas = document.getElementById('radarPoints');
        this.vinylDisc = document.getElementById('vinyl-disc');
        
        // RC Elements
        this.rcContainer = document.getElementById('radioController');
        this.rcHandle = document.getElementById('rcHandle');
        this.rcContent = document.querySelector('.rc-content');
        this.rcPlayPause = document.getElementById('rcPlayPause');
        this.rcTitle = document.getElementById('rcTitle');
        this.rcArtist = document.getElementById('rcArtist');
        
        // Volume Elements
        this.volumeControl = document.getElementById('volumeControl');
        this.circularVolumeContainer = document.getElementById('circularVolume');
        this.rcCircularVolume = document.getElementById('rcCircularVolume');
        this.ringProgresses = document.querySelectorAll('.ring-progress, .rc-ring-progress');
        this.volumeIcons = document.querySelectorAll('.volume-icon-center i, #rcVolumeIcon');
        
        this.visualizerInitialized = false;
        this.radarStartTime = 0;
        this.sections = document.querySelectorAll('section');
        this.currentSectionIndex = 0;

        this.init();
    }

    init() {
        this.initVisualizer();
        this.initRC();
        this.initVolumeControl();
        
        // Listen for section changes
        window.addEventListener('sectionChanged', (e) => {
            this.currentSectionIndex = e.detail.index;
            this.updateRCVisibility();
        });

        // Listen for audio events
        window.addEventListener('audioPlaying', () => {
            if (!this.visualizerInitialized) {
                this.setupVisualizer();
            }
            if (this.vinylDisc) {
                this.vinylDisc.classList.add('playing');
                this.radarStartTime = Date.now();
            }
            this.updateRCUI(false);
        });

        window.addEventListener('audioPaused', () => {
            if (this.vinylDisc) this.vinylDisc.classList.remove('playing');
            this.updateRCUI(true);
        });

        window.addEventListener('volumeChanged', (e) => {
            this.updateVolumeUI(e.detail.volume);
        });
    }

    initVisualizer() {
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        if (this.visualizerCanvas) {
            this.visualizerCanvas.width = this.visualizerCanvas.offsetWidth;
            this.visualizerCanvas.height = this.visualizerCanvas.offsetHeight;
        }
        if (this.circularVisualizer) {
            this.circularVisualizer.width = this.circularVisualizer.offsetWidth;
            this.circularVisualizer.height = this.circularVisualizer.offsetHeight;
        }
        if (this.radarCanvas) {
            this.radarCanvas.width = this.radarCanvas.offsetWidth;
            this.radarCanvas.height = this.radarCanvas.offsetHeight;
        }
    }

    setupVisualizer() {
        if (this.visualizerInitialized) return;
        
        // Wait for AudioContext to be available (created in AudioPlayer)
        if (!window.audioContext || !window.audioAnalyser) {
            // Retry shortly if not ready
            setTimeout(() => this.setupVisualizer(), 100);
            return;
        }

        const analyser = window.audioAnalyser;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const canvasCtx = this.visualizerCanvas.getContext('2d');
        const circularCtx = this.circularVisualizer ? this.circularVisualizer.getContext('2d') : null;
        const radarCtx = this.radarCanvas ? this.radarCanvas.getContext('2d') : null;
        
        let radarActiveIntensity = 0;
        let currentRadarAngle = -Math.PI / 2;
        let lastFrameTime = Date.now();
        
        const radarPoints = [];
        const numRadarPoints = 9;
        const fadeDuration = 7.0;
        const fadeOutStart = 0;

        for (let i = 0; i < numRadarPoints; i++) {
            radarPoints.push({
                r: Math.sqrt(Math.random()), 
                theta: Math.random() * 2 * Math.PI, 
                size: Math.random() * 2 + 1,
                freqFactor: Math.random() * 0.8 
            });
        }
        
        let linearGradient = null;
        let circularGradient = null;

        this.resizeCanvas();

        const draw = () => {
            requestAnimationFrame(draw);
            
            const now = Date.now();
            const deltaTime = (now - lastFrameTime) / 1000;
            lastFrameTime = now;

            analyser.getByteFrequencyData(dataArray);

            if (!this.audio.paused) {
                radarActiveIntensity += deltaTime * 2.0;
                if (radarActiveIntensity > 1.0) radarActiveIntensity = 1.0;
            } else {
                radarActiveIntensity -= deltaTime / 3.0;
                if (radarActiveIntensity < 0.0) radarActiveIntensity = 0.0;
            }
            
            // Vinyl Reactivity
            if (this.vinylDisc) {
                let targetScale = 1.0;
                if (!this.audio.paused) {
                    let sum = 0;
                    const bassCount = Math.floor(bufferLength * 0.125); 
                    for(let i = 0; i < bassCount; i++) {
                        sum += dataArray[i];
                    }
                    const average = sum / bassCount;
                    const bassIntensity = Math.pow(average / 255, 1.2); 
                    targetScale = 1 + bassIntensity * 0.15;
                }
                const currentScale = 1.0 + (targetScale - 1.0) * radarActiveIntensity;
                this.vinylDisc.style.transform = `scale(${currentScale})`;
            }

            // Radar Logic (Simplified for brevity, copying core logic)
            if (radarCtx && this.radarCanvas.width > 0) {
                const w = this.radarCanvas.width;
                const h = this.radarCanvas.height;
                const cx = w / 2;
                const cy = h / 2;
                const maxRadius = w / 2;

                radarCtx.clearRect(0, 0, w, h);

                // Graduations
                const numGrads = 48;
                const breathing = 1 + Math.sin(Date.now() * 0.002) * 0.05 * radarActiveIntensity;
                
                for (let i = 0; i < numGrads; i++) {
                    const angle = (i / numGrads) * 2 * Math.PI;
                    const isMajor = i % 4 === 0;
                    const baseLen = isMajor ? 15 : 8;
                    const len = baseLen * (0.8 + 0.2 * radarActiveIntensity * breathing);
                    
                    const x1 = cx + Math.cos(angle) * (maxRadius - len);
                    const y1 = cy + Math.sin(angle) * (maxRadius - len);
                    const x2 = cx + Math.cos(angle) * (maxRadius - 2);
                    const y2 = cy + Math.sin(angle) * (maxRadius - 2);
                    
                    radarCtx.beginPath();
                    radarCtx.moveTo(x1, y1);
                    radarCtx.lineTo(x2, y2);
                    
                    const majorAlpha = 0.3 + 0.6 * radarActiveIntensity;
                    const minorAlpha = 0.1 + 0.3 * radarActiveIntensity;
                    
                    radarCtx.strokeStyle = isMajor ? `rgba(255, 255, 255, ${majorAlpha})` : `rgba(255, 255, 255, ${minorAlpha})`;
                    radarCtx.lineWidth = isMajor ? 3 : 1;
                    radarCtx.stroke();
                }

                if (radarActiveIntensity > 0.01) {
                    const cycleDuration = 12.0;
                    const speed = (2 * Math.PI) / cycleDuration;
                    currentRadarAngle += speed * deltaTime;
                    const normalizedAngle = currentRadarAngle % (2 * Math.PI);
                    
                    // Sweep
                    const trailLength = Math.PI / 2;
                    const startGrad = normalizedAngle - trailLength;
                    
                    try {
                        const gradient = radarCtx.createConicGradient(startGrad, cx, cy);
                        const stopPos = trailLength / (2 * Math.PI);
                        gradient.addColorStop(0, 'transparent');
                        gradient.addColorStop(Math.max(0, stopPos - 0.1), `rgba(255, 255, 255, ${0.01 * radarActiveIntensity})`);
                        gradient.addColorStop(stopPos, `rgba(255, 255, 255, ${0.5 * radarActiveIntensity})`);
                        gradient.addColorStop(stopPos + 0.001, 'transparent');
                        
                        radarCtx.fillStyle = gradient;
                        radarCtx.beginPath();
                        radarCtx.arc(cx, cy, maxRadius, 0, 2 * Math.PI);
                        radarCtx.fill();
                    } catch (e) {}

                    // Points
                    const sweepAngle = normalizedAngle; 
                    const fov = speed * fadeDuration;

                    radarCtx.shadowColor = '#ff0000'; 
                    radarCtx.fillStyle = '#ff0000';   

                    radarPoints.forEach(p => {
                        let diff = sweepAngle - p.theta;
                        while (diff < 0) diff += 2 * Math.PI;
                        while (diff >= 2 * Math.PI) diff -= 2 * Math.PI;
                        
                        if (diff < fov) {
                            p.seen = true;
                            const timeSincePass = diff / speed;
                            const freqIndex = Math.floor(p.freqFactor * bufferLength); 
                            const val = dataArray[freqIndex] || 0;
                            const rawAudioLevel = val / 255;
                            
                            if (typeof p.smoothedLevel === 'undefined') p.smoothedLevel = 0;
                            p.smoothedLevel += (rawAudioLevel - p.smoothedLevel) * 0.1;

                            const x = cx + Math.cos(p.theta) * (p.r * maxRadius);
                            const y = cy + Math.sin(p.theta) * (p.r * maxRadius);
                            
                            let r, g, b;
                            if (timeSincePass < 0.2) {
                                const t = timeSincePass / 0.2; 
                                r = 255;
                                g = Math.floor(255 * (1 - t));
                                b = Math.floor(255 * (1 - t));
                            } else {
                                r = 255; g = 0; b = 0;
                            }

                            let alpha = 1.0;
                            if (timeSincePass > fadeOutStart) {
                                const fadeWindow = fadeDuration - fadeOutStart;
                                const fadeProgress = (timeSincePass - fadeOutStart) / fadeWindow;
                                alpha = Math.max(0, 1.0 - fadeProgress);
                            }
                            
                            const size = p.size * (1 + p.smoothedLevel * 0.5);

                            radarCtx.beginPath();
                            radarCtx.arc(x, y, size, 0, 2 * Math.PI);
                            radarCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha * radarActiveIntensity})`;
                            radarCtx.fill();
                        } else if (p.seen) {
                            p.r = Math.sqrt(Math.random());
                            p.size = Math.random() * 2 + 1;
                            p.freqFactor = Math.random() * 0.8;
                            p.seen = false;
                            
                            const safeMargin = 0.2;
                            const safeZoneStart = fov + safeMargin;
                            const safeZoneEnd = 2 * Math.PI - safeMargin;
                            
                            if (safeZoneEnd > safeZoneStart) {
                                const randomOffset = safeZoneStart + Math.random() * (safeZoneEnd - safeZoneStart);
                                p.theta = sweepAngle - randomOffset;
                            } else {
                                p.theta = sweepAngle + safeMargin;
                            }
                        }
                    });
                    radarCtx.globalAlpha = 1.0;
                    radarCtx.shadowBlur = 0;
                }
            }

            // Linear Visualizer
            const WIDTH = this.visualizerCanvas.width;
            const HEIGHT = this.visualizerCanvas.height;

            if (WIDTH > 0 && HEIGHT > 0) {
                canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
                const numBars = 100;
                const barWidth = WIDTH / numBars;
                const maxBarHeight = HEIGHT * 0.45;
                const logMax = Math.log(bufferLength);
                const logMin = Math.log(1);

                canvasCtx.beginPath();
                const points = [];
                for (let i = 0; i < numBars; i++) {
                    const lowPercent = i / numBars;
                    const highPercent = (i + 1) / numBars;
                    const logIndexLow = logMin + (logMax - logMin) * lowPercent;
                    const logIndexHigh = logMin + (logMax - logMin) * highPercent;
                    const frequencyIndex = Math.floor(Math.exp(logIndexLow));
                    let nextFrequencyIndex = Math.floor(Math.exp(logIndexHigh));
                    if (nextFrequencyIndex <= frequencyIndex) nextFrequencyIndex = frequencyIndex + 1;
                    
                    let dataSum = 0;
                    const count = nextFrequencyIndex - frequencyIndex;
                    for (let j = frequencyIndex; j < nextFrequencyIndex && j < bufferLength; j++) {
                        dataSum += dataArray[j];
                    }
                    let average = count > 0 ? dataSum / count : 0;
                    const normalizedValue = average / 255.0;
                    const boostedValue = Math.pow(normalizedValue, 0.6);
                    const barHeight = boostedValue * maxBarHeight * 1.2;

                    points.push({
                        x: i * barWidth + barWidth / 2,
                        y: HEIGHT / 2 - barHeight
                    });
                }

                // Draw curves (Top)
                canvasCtx.moveTo(0, HEIGHT / 2);
                if (points.length > 0) {
                    const firstXc = points[0].x / 2;
                    const firstYc = (points[0].y + HEIGHT / 2) / 2;
                    canvasCtx.quadraticCurveTo(0, HEIGHT / 2, firstXc, firstYc);

                    for (let i = 0; i < points.length - 1; i++) {
                        const xc = (points[i].x + points[i+1].x) / 2;
                        const yc = (points[i].y + points[i+1].y) / 2;
                        canvasCtx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
                    }
                    const lastPoint = points[points.length - 1];
                    const lastXc = (lastPoint.x + WIDTH) / 2;
                    const lastYc = (lastPoint.y + HEIGHT / 2) / 2;
                    canvasCtx.quadraticCurveTo(lastPoint.x, lastPoint.y, lastXc, lastYc);
                    canvasCtx.quadraticCurveTo(lastXc, lastYc, WIDTH, HEIGHT/2);
                }
                canvasCtx.lineTo(WIDTH, HEIGHT / 2);

                // Draw curves (Bottom)
                if (points.length > 0) {
                    const firstBottomY = HEIGHT - points[0].y;
                    const firstXc = points[0].x / 2;
                    const firstYc = (firstBottomY + HEIGHT / 2) / 2;
                    canvasCtx.quadraticCurveTo(0, HEIGHT / 2, firstXc, firstYc);

                    for (let i = 0; i < points.length - 1; i++) {
                        const xc = (points[i].x + points[i+1].x) / 2;
                        const yc = ( (HEIGHT - points[i].y) + (HEIGHT - points[i+1].y) ) / 2;
                        canvasCtx.quadraticCurveTo(points[i].x, HEIGHT - points[i].y, xc, yc);
                    }
                    const lastPoint = points[points.length - 1];
                    const lastBottomY = HEIGHT - lastPoint.y;
                    const lastXc = (lastPoint.x + WIDTH) / 2;
                    const lastYc = (lastBottomY + HEIGHT / 2) / 2;
                    canvasCtx.quadraticCurveTo(lastPoint.x, lastBottomY, lastXc, lastYc);
                    canvasCtx.quadraticCurveTo(lastXc, lastYc, WIDTH, HEIGHT/2);
                }
                canvasCtx.lineTo(0, HEIGHT / 2);

                if (!linearGradient) {
                    linearGradient = canvasCtx.createLinearGradient(0, 0, 0, HEIGHT);
                    linearGradient.addColorStop(0.3, 'rgba(238, 238, 238, 0)');
                    linearGradient.addColorStop(0.45, 'rgba(238, 238, 238, 0.4)');
                    linearGradient.addColorStop(0.5, 'rgba(238, 238, 238, 0.5)');
                    linearGradient.addColorStop(0.55, 'rgba(238, 238, 238, 0.4)');
                    linearGradient.addColorStop(0.7, 'rgba(238, 238, 238, 0)');
                }
                canvasCtx.fillStyle = linearGradient;
                canvasCtx.fill();
                canvasCtx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
                canvasCtx.lineWidth = 1.5;
                canvasCtx.stroke();
                
                canvasCtx.beginPath();
                canvasCtx.strokeStyle = 'rgba(238, 238, 238, 0.1)';
                canvasCtx.lineWidth = 1;
                canvasCtx.moveTo(0, HEIGHT / 2);
                canvasCtx.lineTo(WIDTH, HEIGHT / 2);
                canvasCtx.stroke();
            }

            // Circular Visualizer
            if (circularCtx && this.circularVisualizer.width > 0) {
                const w = this.circularVisualizer.width;
                const h = this.circularVisualizer.height;
                const cx = w / 2;
                const cy = h / 2;

                circularCtx.clearRect(0, 0, w, h);

                const numPoints = 120;
                const innerRadius = 110;
                const maxBarHeight = 60;

                const points = [];
                for (let i = 0; i < numPoints; i++) {
                    const angle = (i / numPoints) * 2 * Math.PI;
                    const percent = i / numPoints;
                    const frequencyIndex = Math.floor(Math.pow(percent, 0.8) * (bufferLength * 0.6));
                    const freqData = dataArray[frequencyIndex];
                    const normalizedValue = freqData / 255.0;
                    const barHeight = Math.pow(normalizedValue, 1.5) * maxBarHeight;
                    const radius = innerRadius + barHeight;
                    points.push({
                        x: cx + Math.cos(angle) * radius,
                        y: cy + Math.sin(angle) * radius
                    });
                }

                if (points.length > 0) {
                    circularCtx.beginPath();
                    circularCtx.moveTo((points[0].x + points[points.length - 1].x) / 2, (points[0].y + points[points.length - 1].y) / 2);

                    for (let i = 0; i < points.length - 1; i++) {
                        const xc = (points[i].x + points[i + 1].x) / 2;
                        const yc = (points[i].y + points[i + 1].y) / 2;
                        circularCtx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
                    }
                    circularCtx.quadraticCurveTo(points[points.length - 1].x, points[points.length - 1].y, (points[points.length - 1].x + points[0].x) / 2, (points[points.length - 1].y + points[0].y) / 2);
                    circularCtx.closePath();
                    
                    if (!circularGradient) {
                        circularGradient = circularCtx.createRadialGradient(cx, cy, innerRadius, cx, cy, innerRadius + maxBarHeight);
                        circularGradient.addColorStop(0, 'rgba(255, 255, 255, 0.0)');
                        circularGradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.15)');
                        circularGradient.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
                    }
                    circularCtx.fillStyle = circularGradient;
                    circularCtx.fill();
                    circularCtx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                    circularCtx.lineWidth = 2;
                    circularCtx.stroke();
                    circularCtx.shadowBlur = 0;
                    circularCtx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
                    circularCtx.lineWidth = 0.8;
                    circularCtx.stroke();
                }
            }
        };

        draw();
        this.visualizerInitialized = true;
    }

    initRC() {
        if (this.rcHandle) {
            this.rcHandle.addEventListener('click', () => {
                const isDocked = this.rcContainer.classList.contains('docked');
                if (!isDocked) {
                    const rect = this.rcContainer.getBoundingClientRect();
                    this.rcContainer.style.top = `${rect.top}px`;
                    this.rcContainer.style.bottom = 'auto';
                    this.rcContainer.style.left = 'auto';
                    this.rcContainer.style.right = '20px';
                    this.rcContainer.style.transform = '';
                    this.rcContainer.classList.add('docked');
                } else {
                    this.rcContainer.classList.remove('docked');
                }
            });
        }

        if (this.rcContent) {
            let isDragging = false;
            let startX, startY, initialLeft, initialTop;

            this.rcContent.addEventListener('mousedown', (e) => {
                if (e.target.closest('button') || e.target.closest('.rc-volume-container') || e.target.closest('.rc-meta')) return;
                if (this.rcContainer.classList.contains('docked')) return;

                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;
                const rect = this.rcContainer.getBoundingClientRect();
                initialLeft = rect.left;
                initialTop = rect.top;
                this.rcContainer.style.transition = 'none';
                this.rcContainer.style.bottom = 'auto';
                this.rcContainer.style.right = 'auto';
                this.rcContainer.style.left = `${initialLeft}px`;
                this.rcContainer.style.top = `${initialTop}px`;
                e.preventDefault();
            });

            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                this.rcContainer.style.left = `${initialLeft + dx}px`;
                this.rcContainer.style.top = `${initialTop + dy}px`;
            });

            document.addEventListener('mouseup', () => {
                if (isDragging) {
                    isDragging = false;
                    this.rcContainer.style.transition = '';
                }
            });
        }

        const goToRadioSection = () => {
            const radioIndex = Array.from(this.sections).findIndex(s => s.id === 'radio');
            if (radioIndex !== -1) {
                // Dispatch navigation event
                // Assuming Navigation module listens or we use a global method.
                // For now, let's assume we can trigger a click on a nav link or similar.
                // Better: Dispatch a custom event that Navigation listens to.
                // But Navigation is initialized in main.js.
                // Let's use the same event mechanism or just find the nav instance if possible.
                // Actually, we can just scroll manually or use the global function if we exported it.
                // Since we are modularizing, we should rely on events.
                // But wait, Navigation module has scrollToSection.
                // Let's dispatch an event 'requestNavigation'
                window.dispatchEvent(new CustomEvent('requestNavigation', { detail: { index: radioIndex } }));
            }
        };

        if (this.rcTitle) {
            this.rcTitle.style.cursor = 'pointer';
            this.rcTitle.addEventListener('click', goToRadioSection);
        }
        if (this.rcArtist) {
            this.rcArtist.style.cursor = 'pointer';
            this.rcArtist.addEventListener('click', goToRadioSection);
        }
    }

    updateRCUI(isPaused) {
        if (!this.rcContainer) return;
        if (isPaused) {
            this.rcPlayPause.innerHTML = '<i class="fas fa-play"></i>';
        } else {
            this.rcPlayPause.innerHTML = '<i class="fas fa-pause"></i>';
        }
    }

    updateRCVisibility() {
        if (!this.rcContainer) return;
        const currentSection = this.sections[this.currentSectionIndex];
        const isRadioSection = currentSection && currentSection.id === 'radio';
        
        if (isRadioSection) {
            this.rcContainer.classList.add('hidden');
        } else {
            this.rcContainer.classList.remove('hidden');
        }
    }

    initVolumeControl() {
        const volumeContainers = [this.circularVolumeContainer, this.rcCircularVolume].filter(Boolean);
        
        let isDraggingVolume = false;
        let startY = 0;
        let startVolume = 0;
        let rafId = null;

        const handleMove = (clientY) => {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => {
                const deltaY = startY - clientY; 
                const sensitivity = 0.005; 
                let newVol = startVolume + (deltaY * sensitivity);
                // Dispatch event to AudioPlayer
                window.dispatchEvent(new CustomEvent('setVolume', { detail: { volume: newVol } }));
            });
        };

        volumeContainers.forEach(container => {
            container.addEventListener('mousedown', (e) => {
                isDraggingVolume = true;
                container.classList.add('dragging');
                startY = e.clientY;
                startVolume = parseFloat(this.volumeControl.value);
                e.preventDefault(); 
            });
            
            container.addEventListener('touchstart', (e) => {
                isDraggingVolume = true;
                container.classList.add('dragging');
                startY = e.touches[0].clientY;
                startVolume = parseFloat(this.volumeControl.value);
                e.preventDefault();
            }, { passive: false });
        });

        window.addEventListener('mousemove', (e) => {
            if (isDraggingVolume) {
                e.preventDefault();
                handleMove(e.clientY);
            }
        });

        window.addEventListener('mouseup', () => {
            if (isDraggingVolume) {
                isDraggingVolume = false;
                if (rafId) cancelAnimationFrame(rafId);
                volumeContainers.forEach(c => c.classList.remove('dragging'));
                window.dispatchEvent(new CustomEvent('saveVolume'));
            }
        });

        window.addEventListener('touchmove', (e) => {
            if (isDraggingVolume) {
                e.preventDefault();
                handleMove(e.touches[0].clientY);
            }
        }, { passive: false });

        window.addEventListener('touchend', () => {
            isDraggingVolume = false;
            if (rafId) cancelAnimationFrame(rafId);
            volumeContainers.forEach(c => c.classList.remove('dragging'));
            window.dispatchEvent(new CustomEvent('saveVolume'));
        });
    }

    updateVolumeUI(vol) {
        this.ringProgresses.forEach(ring => {
            const r = ring.getAttribute('r');
            const circumference = 2 * Math.PI * r;
            const arcLength = circumference * 0.75;
            const offset = arcLength * (1 - vol);
            ring.style.strokeDashoffset = offset;
        });
        
        this.volumeIcons.forEach(icon => {
            if (vol === 0) {
                icon.className = 'fas fa-volume-mute';
            } else if (vol < 0.5) {
                icon.className = 'fas fa-volume-down';
            } else {
                icon.className = 'fas fa-volume-up';
            }
        });
    }
}
