import { setupGlitchEffect } from './utils.js';

export class Home {
    constructor() {
        this.titleAccueil = document.getElementById('titleAccueil');
        this.asciiCanvas = document.getElementById('asciiBg');
        this.contactForm = document.getElementById('contactForm');
        this.formMessage = document.getElementById('formMessage');
        this.currentSectionIndex = 0;

        this.init();
    }

    init() {
        this.initTitleShadow();
        this.initAsciiBackground();
        this.initGlitchEffects();
        this.initContactForm();

        window.addEventListener('sectionChanged', (e) => {
            this.currentSectionIndex = e.detail.index;
        });
    }

    initTitleShadow() {
        if (this.titleAccueil) {
            document.addEventListener('mousemove', (e) => {
                if (this.currentSectionIndex !== 0) return;

                const { clientX, clientY } = e;
                const { innerWidth, innerHeight } = window;

                const x = (clientX / innerWidth - 0.5) * 2;
                const y = (clientY / innerHeight - 0.5) * 2;

                const maxOffset = 30;

                const shadowX = x * maxOffset * -1;
                const shadowY = y * maxOffset * -1;

                this.titleAccueil.style.textShadow = `
            0 0 20px rgba(255, 255, 255, 0.4),
            ${shadowX}px ${shadowY}px 40px rgba(0, 0, 0, 0.9)
          `;
            });
        }
    }

    initAsciiBackground() {
        if (!this.asciiCanvas) return;
        const ctx = this.asciiCanvas.getContext('2d');
        let width, height;
        let cols, rows;
        const charSize = 18;
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$#@%&?!<>";

        let mouse = { x: -1000, y: -1000 };

        let grid = [];
        let offsets = [];
        let speeds = [];
        let rowNoise = [];

        window.addEventListener('mousemove', (e) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        });

        const initGrid = () => {
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

            rowNoise = [];
            for (let y = 0; y < rows; y++) {
                const noiseY = y * 0.025;
                rowNoise.push(Math.cos(noiseY * 0.8) + Math.cos(noiseY * 1.7) * 0.5);
            }
        };

        const resize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            this.asciiCanvas.width = width;
            this.asciiCanvas.height = height;
            cols = Math.ceil(width / charSize);
            rows = Math.ceil(height / charSize);
            ctx.font = `${charSize}px 'Courier New', monospace`;
            initGrid();
        };
        window.addEventListener('resize', resize);
        resize();

        const draw = () => {
            requestAnimationFrame(draw);

            const time = Date.now() * 0.001;

            ctx.fillStyle = 'rgba(5, 5, 5, 0.25)';
            ctx.fillRect(0, 0, width, height);

            ctx.textBaseline = 'top';
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
                const centerX = px + charSize / 2;

                const dxMouse = mouse.x - centerX;
                const absDxMouse = Math.abs(dxMouse);

                const noiseX = x * 0.025 + time * 0.15;

                const noisePartX1 = Math.sin(noiseX);
                const noisePartX2 = Math.sin(noiseX * 2.1 + time * 0.1) * 0.5;

                for (let y = 0; y < rows; y++) {
                    const py = y * charSize + offsets[x] - charSize;

                    if (py > height) break;

                    const centerY = py + charSize / 2;

                    let noise = noisePartX1 + noisePartX2 + (rowNoise[y] || 0);

                    let gasIntensity = (noise + 3) / 6;

                    if (gasIntensity < 0.45) {
                        gasIntensity = 0;
                    } else {
                        gasIntensity = (gasIntensity - 0.45) / 0.55;
                        gasIntensity = gasIntensity * gasIntensity;
                    }

                    let mouseIntensity = 0;
                    const dyMouse = mouse.y - centerY;
                    const absDyMouse = Math.abs(dyMouse);

                    if (absDxMouse < maxRadius && absDyMouse < maxRadius) {
                        const angle = Math.atan2(dyMouse, dxMouse);
                        const distortion = Math.sin(angle * 3 + time * 2) * 20
                            + Math.cos(angle * 5 - time * 1.5) * 10
                            + Math.sin(angle * 7 + time * 4) * 5;

                        const dist = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse) + distortion;

                        if (dist < maxRadius) {
                            mouseIntensity = 1 - (dist / maxRadius);
                            mouseIntensity = Math.pow(mouseIntensity, 1.5);
                        }
                    }

                    const combinedIntensity = Math.max(mouseIntensity, gasIntensity * 0.75);

                    if (combinedIntensity > 0.05) {

                        const scale = 1 + mouseIntensity * 0.2;

                        const val = Math.floor(26 + combinedIntensity * (255 - 26));
                        ctx.fillStyle = `rgb(${val}, ${val}, ${val})`;

                        ctx.font = `${charSize * scale}px 'Courier New', monospace`;

                        ctx.shadowBlur = 0;

                        let displayChar = grid[x][y];

                        if (mouseIntensity > 0.01) {
                            if (mouseIntensity > 0.3 && Math.random() < 0.15) {
                                displayChar = chars[Math.floor(Math.random() * chars.length)];
                            }

                            if (mouseIntensity > 0.6) {
                                const mouseCol = Math.floor(mouse.x / charSize);
                                const mouseRow = Math.floor(mouse.y / charSize);
                                const relX = x - mouseCol;
                                const relY = y - mouseRow;

                                const cycle = time % 8;

                                if (cycle > 1.0 && cycle < 3.5) {
                                    if (relY === 0) {
                                        if (relX === -1) displayChar = 'G';
                                        if (relX === 0) displayChar = 'M';
                                    }
                                }
                                else if (cycle > 5.0 && cycle < 7.5) {
                                    if (relY === 0) {
                                        if (relX === -1) displayChar = 'S';
                                        if (relX === 0) displayChar = '&';
                                        if (relX === 1) displayChar = 'S';
                                    }
                                }

                                if (['G', 'M', 'S', '&'].includes(displayChar) && Math.random() < 0.02) {
                                    displayChar = chars[Math.floor(Math.random() * chars.length)];
                                }
                            }
                        }

                        const offset = (charSize * scale - charSize) / 2;
                        ctx.fillText(displayChar, px - offset, py - offset);

                        ctx.shadowBlur = 0;
                        ctx.font = `${charSize}px 'Courier New', monospace`;

                    } else {
                        ctx.fillStyle = '#111';
                        if (Math.random() < 0.001) ctx.fillStyle = '#222';
                        ctx.fillText(grid[x][y], px, py);
                    }
                }
            }
        };
        draw();
    }

    initGlitchEffects() {
        setupGlitchEffect('mindsetTitle', 'MįNDSET', 'MINDSET');
        setupGlitchEffect('req1Title', 'REQŘ', 'REQ1');
        setupGlitchEffect('nelsonTitle', 'NELSŚN NŚRTH', 'NELSON NORTH');
        setupGlitchEffect('shorebreakTitle', 'ŪBREAK', 'SHOREBREAK');
    }

    initContactForm() {
        if (this.contactForm && this.formMessage) {
            this.contactForm.addEventListener('submit', async (e) => {
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
                        this.formMessage.textContent = 'Message envoyé. Vous serez recontacté sous peu.';
                        form.reset();
                        const submitButton = form.querySelector('button[type="submit"]');
                        if (submitButton) submitButton.style.display = 'none';
                        setTimeout(() => {
                            this.formMessage.textContent = '';
                            if (submitButton) submitButton.style.display = '';
                        }, 5000);
                    } else {
                        this.formMessage.textContent = 'Erreur lors de l\'envoi';
                    }
                } catch (error) {
                    this.formMessage.textContent = 'Erreur réseau';
                }
            });
        }
    }
}
