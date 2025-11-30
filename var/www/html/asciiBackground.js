/**
 * ASCII Background Engine
 * =======================
 * A modular ASCII animation engine for full-screen canvas backgrounds.
 * 
 * USAGE:
 *   AsciiBackground.init(canvasElement, 'clouds');
 *   AsciiBackground.setScene('neurons');
 *   AsciiBackground.updateConfig({ speed: 0.5 });
 * 
 * HOW TO ADD A NEW SCENE:
 *   1. Create a new scene object in the SCENES section below
 *   2. Implement required methods: init(), update(dt), render(grid), cleanup()
 *   3. Register the scene in the SCENES object
 *   4. Scene.init() is called when the scene becomes active
 *   5. Scene.update(dt) is called every frame with delta time in ms
 *   6. Scene.render(grid) should populate the grid with characters and colors
 *   7. Scene.cleanup() is called when switching away from the scene
 */

(function() {
  'use strict';

  // ==========================================
  // CONFIGURATION
  // ==========================================
  const DEFAULT_CONFIG = {
    // Character set for ASCII rendering (from sparse to dense)
    charset: [' ', '.', ':', '+', '*', 'o', 'O', '#', '@'],
    // Font settings
    fontSize: 14,
    fontFamily: 'monospace',
    // Transition settings
    transitionDuration: 1500, // ms
    transitionType: 'crossfade', // 'crossfade' or 'glitch'
    // Performance settings
    targetFPS: 30,
    mobileScaleFactor: 0.7, // Reduce resolution on mobile
    minCellSize: 10, // Minimum cell size for performance
    // Debug
    debug: false
  };

  // ==========================================
  // NOISE FUNCTIONS (Simplex-like)
  // ==========================================
  
  /**
   * Simple hash function for noise generation
   */
  function hash(x, y) {
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return n - Math.floor(n);
  }

  /**
   * Smooth interpolation
   */
  function smoothstep(t) {
    return t * t * (3 - 2 * t);
  }

  /**
   * 2D Value noise - simple and fast
   */
  function noise2D(x, y) {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    
    const tl = hash(xi, yi);
    const tr = hash(xi + 1, yi);
    const bl = hash(xi, yi + 1);
    const br = hash(xi + 1, yi + 1);
    
    const sx = smoothstep(xf);
    const sy = smoothstep(yf);
    
    const top = tl + sx * (tr - tl);
    const bottom = bl + sx * (br - bl);
    
    return top + sy * (bottom - top);
  }

  /**
   * Fractal Brownian Motion for more organic noise
   */
  function fbm(x, y, octaves = 4) {
    let value = 0;
    let amplitude = 0.5;
    let frequency = 1;
    let maxValue = 0;
    
    for (let i = 0; i < octaves; i++) {
      value += amplitude * noise2D(x * frequency, y * frequency);
      maxValue += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }
    
    return value / maxValue;
  }

  // ==========================================
  // GRID CLASS
  // ==========================================
  
  class Grid {
    constructor(cols, rows) {
      this.cols = cols;
      this.rows = rows;
      this.cells = [];
      this.clear();
    }
    
    clear() {
      this.cells = [];
      for (let y = 0; y < this.rows; y++) {
        this.cells[y] = [];
        for (let x = 0; x < this.cols; x++) {
          this.cells[y][x] = { char: ' ', color: 'rgba(255,255,255,0.5)' };
        }
      }
    }
    
    setCell(x, y, char, color) {
      if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
        this.cells[y][x] = { char, color };
      }
    }
    
    getCell(x, y) {
      if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
        return this.cells[y][x];
      }
      return { char: ' ', color: 'transparent' };
    }
    
    blend(otherGrid, factor) {
      // Blend two grids for transitions (factor 0 = this, factor 1 = other)
      const result = new Grid(this.cols, this.rows);
      for (let y = 0; y < this.rows; y++) {
        for (let x = 0; x < this.cols; x++) {
          if (factor < 0.5) {
            result.cells[y][x] = this.cells[y][x];
          } else {
            result.cells[y][x] = otherGrid.cells[y][x];
          }
          // Adjust opacity based on blend factor
          const cell = result.cells[y][x];
          const opacity = factor < 0.5 ? 1 - factor * 2 : (factor - 0.5) * 2;
          // Parse and modify color opacity
          result.cells[y][x].color = adjustColorOpacity(cell.color, opacity);
        }
      }
      return result;
    }
  }
  
  /**
   * Adjust color opacity for transitions
   */
  function adjustColorOpacity(color, opacityMultiplier) {
    if (color.startsWith('rgba')) {
      const match = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
      if (match) {
        const newOpacity = parseFloat(match[4]) * opacityMultiplier;
        return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${newOpacity})`;
      }
    } else if (color.startsWith('rgb')) {
      const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (match) {
        return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${opacityMultiplier})`;
      }
    }
    return color;
  }

  // ==========================================
  // SCENES
  // ==========================================
  
  /**
   * SCENE: Clouds / Bubbles
   * Floating clouds of ASCII characters with warm colors
   */
  const CloudsScene = {
    name: 'clouds',
    config: {
      speed: 0.0003,
      noiseScale: 0.05,
      bubbleThreshold: 0.4,
      mouseRadius: 15,
      mouseStrength: 0.3,
      palette: [
        'rgba(255, 180, 100, 0.8)',  // Orange
        'rgba(255, 200, 120, 0.7)',  // Light orange
        'rgba(255, 160, 80, 0.9)',   // Deep orange
        'rgba(255, 220, 150, 0.6)',  // Gold
        'rgba(255, 140, 60, 0.8)',   // Burnt orange
      ]
    },
    time: 0,
    mouseX: -1000,
    mouseY: -1000,
    
    init(engine) {
      this.time = 0;
      this.engine = engine;
    },
    
    update(dt) {
      this.time += dt * this.config.speed;
    },
    
    render(grid, charset) {
      const mouseGridX = Math.floor(this.mouseX / this.engine.cellWidth);
      const mouseGridY = Math.floor(this.mouseY / this.engine.cellHeight);
      
      for (let y = 0; y < grid.rows; y++) {
        for (let x = 0; x < grid.cols; x++) {
          // Calculate distance from mouse for interaction
          const dx = x - mouseGridX;
          const dy = y - mouseGridY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          // Mouse repulsion effect
          let offsetX = 0;
          let offsetY = 0;
          if (dist < this.config.mouseRadius && dist > 0) {
            const force = (1 - dist / this.config.mouseRadius) * this.config.mouseStrength;
            offsetX = (dx / dist) * force * 5;
            offsetY = (dy / dist) * force * 5;
          }
          
          // Sample noise with offset
          const sampleX = (x + offsetX) * this.config.noiseScale + this.time;
          const sampleY = (y + offsetY) * this.config.noiseScale + this.time * 0.7;
          
          const noiseValue = fbm(sampleX, sampleY, 4);
          
          if (noiseValue > this.config.bubbleThreshold) {
            // Normalize noise value for character selection
            const normalizedValue = (noiseValue - this.config.bubbleThreshold) / (1 - this.config.bubbleThreshold);
            const charIndex = Math.min(Math.floor(normalizedValue * charset.length), charset.length - 1);
            const char = charset[charIndex];
            
            // Select color from palette
            const colorIndex = Math.floor(hash(x * 0.1, y * 0.1 + this.time * 0.5) * this.config.palette.length);
            const color = this.config.palette[colorIndex];
            
            grid.setCell(x, y, char, color);
          }
        }
      }
    },
    
    onMouseMove(x, y) {
      this.mouseX = x;
      this.mouseY = y;
    },
    
    cleanup() {
      this.mouseX = -1000;
      this.mouseY = -1000;
    }
  };
  
  /**
   * SCENE: Neural Network / Electricity
   * Network of nodes with pulses traveling along connections
   */
  const NeuronsScene = {
    name: 'neurons',
    config: {
      nodeCount: 40,
      connectionDistance: 20,
      pulseSpeed: 0.015,
      cameraSpeed: 0.0002,
      palette: [
        'rgba(100, 150, 255, 0.8)',  // Blue
        'rgba(150, 100, 255, 0.7)',  // Purple
        'rgba(80, 180, 255, 0.9)',   // Cyan
        'rgba(200, 150, 255, 0.6)',  // Light purple
        'rgba(100, 200, 255, 0.8)',  // Light blue
      ],
      pulseColor: 'rgba(255, 255, 255, 0.95)',
      nodeChars: ['o', 'O', '@'],
      connectionChars: ['-', '|', '/', '\\', '+']
    },
    time: 0,
    nodes: [],
    connections: [],
    pulses: [],
    cameraOffset: { x: 0, y: 0 },
    
    init(engine) {
      this.time = 0;
      this.engine = engine;
      this.generateNetwork();
    },
    
    generateNetwork() {
      this.nodes = [];
      this.connections = [];
      this.pulses = [];
      
      // Generate random nodes
      for (let i = 0; i < this.config.nodeCount; i++) {
        this.nodes.push({
          x: Math.random() * 80 + 10,  // Virtual coordinates (larger than screen for scrolling)
          y: Math.random() * 50 + 5,
          size: Math.random() * 0.5 + 0.5
        });
      }
      
      // Generate connections between nearby nodes
      for (let i = 0; i < this.nodes.length; i++) {
        for (let j = i + 1; j < this.nodes.length; j++) {
          const dx = this.nodes[i].x - this.nodes[j].x;
          const dy = this.nodes[i].y - this.nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < this.config.connectionDistance) {
            this.connections.push({
              from: i,
              to: j,
              length: dist
            });
          }
        }
      }
      
      // Initialize some pulses
      this.spawnPulses(5);
    },
    
    spawnPulses(count) {
      for (let i = 0; i < count; i++) {
        if (this.connections.length > 0) {
          const connIndex = Math.floor(Math.random() * this.connections.length);
          this.pulses.push({
            connectionIndex: connIndex,
            progress: Math.random(),
            direction: Math.random() > 0.5 ? 1 : -1
          });
        }
      }
    },
    
    update(dt) {
      this.time += dt * this.config.cameraSpeed;
      
      // Move camera
      this.cameraOffset.x = Math.sin(this.time * 10) * 10 + this.time * 20;
      this.cameraOffset.y = Math.cos(this.time * 7) * 5;
      
      // Update pulses
      for (let i = this.pulses.length - 1; i >= 0; i--) {
        const pulse = this.pulses[i];
        pulse.progress += this.config.pulseSpeed * pulse.direction * dt * 0.1;
        
        if (pulse.progress > 1 || pulse.progress < 0) {
          // Pulse reached end, remove and possibly spawn new
          this.pulses.splice(i, 1);
          if (Math.random() > 0.3) {
            this.spawnPulses(1);
          }
        }
      }
      
      // Occasionally spawn new pulses
      if (Math.random() < 0.02 && this.pulses.length < 15) {
        this.spawnPulses(1);
      }
    },
    
    render(grid, charset) {
      // Draw connections first
      for (const conn of this.connections) {
        const fromNode = this.nodes[conn.from];
        const toNode = this.nodes[conn.to];
        
        const x1 = Math.floor(fromNode.x - this.cameraOffset.x);
        const y1 = Math.floor(fromNode.y - this.cameraOffset.y);
        const x2 = Math.floor(toNode.x - this.cameraOffset.x);
        const y2 = Math.floor(toNode.y - this.cameraOffset.y);
        
        this.drawLine(grid, x1, y1, x2, y2, this.config.palette[2]);
      }
      
      // Draw pulses on connections
      for (const pulse of this.pulses) {
        const conn = this.connections[pulse.connectionIndex];
        if (!conn) continue;
        
        const fromNode = this.nodes[conn.from];
        const toNode = this.nodes[conn.to];
        
        const x = fromNode.x + (toNode.x - fromNode.x) * pulse.progress - this.cameraOffset.x;
        const y = fromNode.y + (toNode.y - fromNode.y) * pulse.progress - this.cameraOffset.y;
        
        const gx = Math.floor(x);
        const gy = Math.floor(y);
        
        // Draw pulse with glow effect
        grid.setCell(gx, gy, '@', this.config.pulseColor);
        grid.setCell(gx - 1, gy, '*', 'rgba(255, 255, 255, 0.5)');
        grid.setCell(gx + 1, gy, '*', 'rgba(255, 255, 255, 0.5)');
      }
      
      // Draw nodes
      for (const node of this.nodes) {
        const x = Math.floor(node.x - this.cameraOffset.x);
        const y = Math.floor(node.y - this.cameraOffset.y);
        
        if (x >= 0 && x < grid.cols && y >= 0 && y < grid.rows) {
          const charIndex = Math.floor(node.size * this.config.nodeChars.length);
          const char = this.config.nodeChars[Math.min(charIndex, this.config.nodeChars.length - 1)];
          const colorIndex = Math.floor(hash(node.x, node.y) * this.config.palette.length);
          grid.setCell(x, y, char, this.config.palette[colorIndex]);
        }
      }
    },
    
    drawLine(grid, x1, y1, x2, y2, color) {
      // Bresenham's line algorithm
      const dx = Math.abs(x2 - x1);
      const dy = Math.abs(y2 - y1);
      const sx = x1 < x2 ? 1 : -1;
      const sy = y1 < y2 ? 1 : -1;
      let err = dx - dy;
      
      let x = x1;
      let y = y1;
      
      while (true) {
        if (x >= 0 && x < grid.cols && y >= 0 && y < grid.rows) {
          // Choose connection character based on direction
          let char = '-';
          if (dx === 0) char = '|';
          else if (dy === 0) char = '-';
          else if ((sx === sy)) char = '\\';
          else char = '/';
          
          grid.setCell(x, y, char, color);
        }
        
        if (x === x2 && y === y2) break;
        
        const e2 = 2 * err;
        if (e2 > -dy) {
          err -= dy;
          x += sx;
        }
        if (e2 < dx) {
          err += dx;
          y += sy;
        }
      }
    },
    
    cleanup() {
      this.pulses = [];
    }
  };
  
  /**
   * SCENE: Eyes
   * ASCII eyes that follow the cursor
   */
  const EyesScene = {
    name: 'eyes',
    config: {
      eyes: [
        { x: 0.3, y: 0.5 },  // Relative positions (0-1)
        { x: 0.7, y: 0.5 }
      ],
      eyeWidth: 20,
      eyeHeight: 10,
      pupilSize: 3,
      trackingSpeed: 0.1,
      idleSpeed: 0.001,
      palette: {
        outline: 'rgba(200, 200, 200, 0.7)',
        iris: 'rgba(100, 180, 255, 0.8)',
        pupil: 'rgba(255, 255, 255, 0.95)'
      }
    },
    mouseX: 0.5,
    mouseY: 0.5,
    currentLookX: 0.5,
    currentLookY: 0.5,
    time: 0,
    lastMouseMove: 0,
    isIdle: true,
    
    init(engine) {
      this.engine = engine;
      this.time = 0;
      this.currentLookX = 0.5;
      this.currentLookY = 0.5;
      this.isIdle = true;
      this.lastMouseMove = Date.now();
    },
    
    update(dt) {
      this.time += dt;
      
      // Check if mouse is idle (no movement for 2 seconds)
      if (Date.now() - this.lastMouseMove > 2000) {
        this.isIdle = true;
      }
      
      let targetX, targetY;
      
      if (this.isIdle) {
        // Idle animation - slow random looking
        targetX = 0.5 + Math.sin(this.time * this.config.idleSpeed) * 0.3;
        targetY = 0.5 + Math.cos(this.time * this.config.idleSpeed * 0.7) * 0.2;
      } else {
        // Track mouse
        targetX = this.mouseX;
        targetY = this.mouseY;
      }
      
      // Smooth interpolation towards target
      this.currentLookX += (targetX - this.currentLookX) * this.config.trackingSpeed;
      this.currentLookY += (targetY - this.currentLookY) * this.config.trackingSpeed;
    },
    
    render(grid, charset) {
      for (const eyeConfig of this.config.eyes) {
        this.drawEye(grid, eyeConfig, charset);
      }
    },
    
    drawEye(grid, eyeConfig, charset) {
      const centerX = Math.floor(eyeConfig.x * grid.cols);
      const centerY = Math.floor(eyeConfig.y * grid.rows);
      const halfWidth = Math.floor(this.config.eyeWidth / 2);
      const halfHeight = Math.floor(this.config.eyeHeight / 2);
      
      // Draw eye outline (ellipse shape)
      for (let y = -halfHeight; y <= halfHeight; y++) {
        for (let x = -halfWidth; x <= halfWidth; x++) {
          const gx = centerX + x;
          const gy = centerY + y;
          
          if (gx < 0 || gx >= grid.cols || gy < 0 || gy >= grid.rows) continue;
          
          // Calculate if point is on ellipse boundary
          const normalizedX = x / halfWidth;
          const normalizedY = y / halfHeight;
          const distFromCenter = normalizedX * normalizedX + normalizedY * normalizedY;
          
          if (distFromCenter <= 1) {
            // Inside the eye
            if (distFromCenter > 0.8) {
              // Eye outline
              let char = '*';
              if (Math.abs(normalizedY) > Math.abs(normalizedX) * 0.5) {
                char = y < 0 ? '-' : '-';
              } else {
                char = x < 0 ? '(' : ')';
              }
              grid.setCell(gx, gy, char, this.config.palette.outline);
            } else {
              // Inside eye - check if it's pupil area
              // Calculate pupil position based on look direction
              const pupilOffsetX = (this.currentLookX - eyeConfig.x) * halfWidth * 1.5;
              const pupilOffsetY = (this.currentLookY - eyeConfig.y) * halfHeight * 1.5;
              
              // Clamp pupil position to stay within eye
              const maxOffset = halfWidth * 0.4;
              const clampedOffsetX = Math.max(-maxOffset, Math.min(maxOffset, pupilOffsetX));
              const clampedOffsetY = Math.max(-maxOffset * 0.5, Math.min(maxOffset * 0.5, pupilOffsetY));
              
              const pupilCenterX = clampedOffsetX;
              const pupilCenterY = clampedOffsetY;
              
              const distFromPupil = Math.sqrt(
                Math.pow(x - pupilCenterX, 2) + 
                Math.pow((y - pupilCenterY) * 2, 2)
              );
              
              if (distFromPupil < this.config.pupilSize) {
                // Pupil
                const intensity = 1 - distFromPupil / this.config.pupilSize;
                const charIndex = Math.floor(intensity * 3);
                const chars = ['O', '#', '@'];
                grid.setCell(gx, gy, chars[Math.min(charIndex, 2)], this.config.palette.pupil);
              } else if (distFromPupil < this.config.pupilSize * 2) {
                // Iris
                grid.setCell(gx, gy, 'o', this.config.palette.iris);
              } else {
                // White of eye
                grid.setCell(gx, gy, '.', 'rgba(255, 255, 255, 0.3)');
              }
            }
          }
        }
      }
    },
    
    onMouseMove(x, y) {
      // Convert pixel coordinates to normalized 0-1
      this.mouseX = x / (this.engine.canvas.width / this.engine.dpr);
      this.mouseY = y / (this.engine.canvas.height / this.engine.dpr);
      this.lastMouseMove = Date.now();
      this.isIdle = false;
    },
    
    cleanup() {
      this.isIdle = true;
    }
  };

  // Register all scenes
  const SCENES = {
    clouds: CloudsScene,
    neurons: NeuronsScene,
    eyes: EyesScene
  };

  // ==========================================
  // MAIN ENGINE
  // ==========================================
  
  const AsciiBackground = {
    // State
    canvas: null,
    ctx: null,
    grid: null,
    config: { ...DEFAULT_CONFIG },
    currentScene: null,
    previousScene: null,
    transitionProgress: 0,
    isTransitioning: false,
    animationId: null,
    lastFrameTime: 0,
    cellWidth: 0,
    cellHeight: 0,
    dpr: 1,
    
    /**
     * Initialize the ASCII background engine
     * @param {HTMLCanvasElement} canvasElement - The canvas to render to
     * @param {string} initialSceneName - Name of the initial scene ('clouds', 'neurons', 'eyes')
     */
    init(canvasElement, initialSceneName = 'clouds') {
      this.canvas = canvasElement;
      this.ctx = this.canvas.getContext('2d');
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      
      // Setup canvas
      this.setupCanvas();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Set initial scene
      this.setScene(initialSceneName, false);
      
      // Start animation loop
      this.lastFrameTime = performance.now();
      this.animate();
      
      // Expose to console for debugging
      window.AsciiBackground = this;
      
      if (this.config.debug) {
        console.log('[AsciiBackground] Initialized with scene:', initialSceneName);
        console.log('[AsciiBackground] Grid size:', this.grid.cols, 'x', this.grid.rows);
      }
      
      return this;
    },
    
    /**
     * Setup canvas size and resolution
     */
    setupCanvas() {
      const isMobile = window.innerWidth < 768;
      const scaleFactor = isMobile ? this.config.mobileScaleFactor : 1;
      
      // Get actual pixel dimensions
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // Set canvas size with devicePixelRatio
      this.canvas.width = width * this.dpr * scaleFactor;
      this.canvas.height = height * this.dpr * scaleFactor;
      this.canvas.style.width = width + 'px';
      this.canvas.style.height = height + 'px';
      
      // Calculate cell dimensions
      const fontSize = this.config.fontSize * this.dpr * scaleFactor;
      this.ctx.font = `${fontSize}px ${this.config.fontFamily}`;
      
      // Measure character width (use 'M' as reference)
      const metrics = this.ctx.measureText('M');
      this.cellWidth = Math.max(metrics.width, this.config.minCellSize);
      this.cellHeight = Math.max(fontSize * 1.2, this.config.minCellSize);
      
      // Calculate grid dimensions
      const cols = Math.floor(this.canvas.width / this.cellWidth);
      const rows = Math.floor(this.canvas.height / this.cellHeight);
      
      // Create or resize grid
      this.grid = new Grid(cols, rows);
      
      if (this.config.debug) {
        console.log('[AsciiBackground] Canvas resized:', this.canvas.width, 'x', this.canvas.height);
        console.log('[AsciiBackground] Grid:', cols, 'x', rows);
      }
    },
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
      // Resize handler with debounce
      let resizeTimeout;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          this.setupCanvas();
          if (this.currentScene && this.currentScene.init) {
            this.currentScene.init(this);
          }
        }, 250);
      });
      
      // Mouse move handler
      window.addEventListener('mousemove', (e) => {
        if (this.currentScene && this.currentScene.onMouseMove) {
          this.currentScene.onMouseMove(e.clientX, e.clientY);
        }
      });
      
      // Touch move handler for mobile
      window.addEventListener('touchmove', (e) => {
        if (e.touches.length > 0 && this.currentScene && this.currentScene.onMouseMove) {
          this.currentScene.onMouseMove(e.touches[0].clientX, e.touches[0].clientY);
        }
      }, { passive: true });
    },
    
    /**
     * Set the active scene with optional transition
     * @param {string} sceneName - Name of the scene to switch to
     * @param {boolean} withTransition - Whether to animate the transition
     */
    setScene(sceneName, withTransition = true) {
      const newScene = SCENES[sceneName];
      if (!newScene) {
        console.error('[AsciiBackground] Unknown scene:', sceneName);
        return;
      }
      
      if (this.currentScene === newScene) {
        return; // Already on this scene
      }
      
      if (withTransition && this.currentScene) {
        // Start transition
        this.previousScene = this.currentScene;
        this.isTransitioning = true;
        this.transitionProgress = 0;
      } else {
        // Cleanup old scene
        if (this.currentScene && this.currentScene.cleanup) {
          this.currentScene.cleanup();
        }
      }
      
      // Initialize new scene
      this.currentScene = newScene;
      if (this.currentScene.init) {
        this.currentScene.init(this);
      }
      
      if (this.config.debug) {
        console.log('[AsciiBackground] Scene changed to:', sceneName);
      }
    },
    
    /**
     * Update configuration
     * @param {Object} partialConfig - Partial configuration to merge
     */
    updateConfig(partialConfig) {
      this.config = { ...this.config, ...partialConfig };
      
      // If scene has its own config, update that too
      if (this.currentScene && partialConfig.sceneConfig) {
        this.currentScene.config = { ...this.currentScene.config, ...partialConfig.sceneConfig };
      }
      
      if (this.config.debug) {
        console.log('[AsciiBackground] Config updated:', partialConfig);
      }
    },
    
    /**
     * List available scenes
     * @returns {string[]} Array of scene names
     */
    listScenes() {
      return Object.keys(SCENES);
    },
    
    /**
     * Get current scene name
     * @returns {string} Current scene name
     */
    getCurrentScene() {
      return this.currentScene ? this.currentScene.name : null;
    },
    
    /**
     * Main animation loop
     */
    animate() {
      this.animationId = requestAnimationFrame(() => this.animate());
      
      const now = performance.now();
      const dt = now - this.lastFrameTime;
      
      // FPS limiting
      const targetFrameTime = 1000 / this.config.targetFPS;
      if (dt < targetFrameTime) {
        return;
      }
      
      this.lastFrameTime = now;
      
      // Clear grid
      this.grid.clear();
      
      // Handle transition
      if (this.isTransitioning) {
        this.transitionProgress += dt / this.config.transitionDuration;
        
        if (this.transitionProgress >= 1) {
          // Transition complete
          this.isTransitioning = false;
          this.transitionProgress = 0;
          if (this.previousScene && this.previousScene.cleanup) {
            this.previousScene.cleanup();
          }
          this.previousScene = null;
        }
      }
      
      // Update and render current scene
      if (this.currentScene) {
        if (this.currentScene.update) {
          this.currentScene.update(dt);
        }
        if (this.currentScene.render) {
          this.currentScene.render(this.grid, this.config.charset);
        }
      }
      
      // Render to canvas
      this.render();
    },
    
    /**
     * Render the grid to canvas
     */
    render() {
      // Clear canvas with dark background
      this.ctx.fillStyle = '#111';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      
      // Set font
      const fontSize = this.config.fontSize * this.dpr * (window.innerWidth < 768 ? this.config.mobileScaleFactor : 1);
      this.ctx.font = `${fontSize}px ${this.config.fontFamily}`;
      this.ctx.textBaseline = 'top';
      
      // Calculate transition fade
      let globalOpacity = 1;
      if (this.isTransitioning) {
        if (this.config.transitionType === 'crossfade') {
          // Crossfade: fade out old, fade in new
          globalOpacity = this.transitionProgress < 0.5 
            ? 1 - this.transitionProgress * 2  // Fade out (0 to 0.5)
            : (this.transitionProgress - 0.5) * 2; // Fade in (0.5 to 1)
        } else if (this.config.transitionType === 'glitch') {
          // Glitch effect during transition
          if (Math.random() < 0.3) {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            const glitchX = Math.random() * this.canvas.width;
            const glitchY = Math.random() * this.canvas.height;
            const glitchW = Math.random() * 100 + 20;
            const glitchH = Math.random() * 10 + 2;
            this.ctx.fillRect(glitchX, glitchY, glitchW, glitchH);
          }
          globalOpacity = 0.7 + Math.random() * 0.3;
        }
      }
      
      // Render grid cells
      for (let y = 0; y < this.grid.rows; y++) {
        for (let x = 0; x < this.grid.cols; x++) {
          const cell = this.grid.cells[y][x];
          if (cell.char !== ' ') {
            // Apply global opacity
            let color = cell.color;
            if (globalOpacity < 1) {
              color = adjustColorOpacity(color, globalOpacity);
            }
            
            this.ctx.fillStyle = color;
            this.ctx.fillText(
              cell.char,
              x * this.cellWidth,
              y * this.cellHeight
            );
          }
        }
      }
    },
    
    /**
     * Stop the animation
     */
    stop() {
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
    },
    
    /**
     * Resume the animation
     */
    start() {
      if (!this.animationId) {
        this.lastFrameTime = performance.now();
        this.animate();
      }
    }
  };

  // Expose globally
  window.AsciiBackground = AsciiBackground;

})();
