/**
 * ASCII Background Animation Engine
 * 
 * A modular, canvas-based ASCII animation system for the radio page.
 * 
 * Usage:
 *   AsciiBackground.init(canvasElement, 'clouds');
 *   AsciiBackground.setScene('neurons');
 *   AsciiBackground.updateConfig({ speed: 1.5 });
 * 
 * Available scenes: 'clouds', 'neurons', 'eyes'
 * 
 * To add a new scene:
 * 1. Create a scene object with init(), update(), and render() methods
 * 2. Register it in the SCENES object below
 * 3. The scene receives the grid, config, and time/delta in update()
 * 
 * @author GRANDE MAISON
 */

const AsciiBackground = (function() {
  'use strict';

  // ============================================================================
  // CONFIGURATION
  // ============================================================================
  
  const DEFAULT_CONFIG = {
    // Grid settings
    cellSize: 14,           // Size of each ASCII cell in pixels
    charset: ['.', ':', '+', '*', 'o', 'O', '#', '@'],
    
    // Animation
    fps: 30,                // Target frames per second
    
    // Colors (can be overridden per scene)
    backgroundColor: '#111111',
    defaultColor: '#ffffff',
    
    // Transition settings
    transitionDuration: 1500, // ms
    transitionType: 'fade',   // 'fade' or 'glitch'
    
    // Performance
    mobileScaleFactor: 0.6,  // Reduce grid density on mobile
    
    // Mouse interaction
    mouseInfluenceRadius: 150,
    mouseStrength: 0.5
  };

  // ============================================================================
  // SIMPLEX NOISE IMPLEMENTATION (Lightweight)
  // ============================================================================
  
  const SimplexNoise = (function() {
    const F2 = 0.5 * (Math.sqrt(3) - 1);
    const G2 = (3 - Math.sqrt(3)) / 6;
    const F3 = 1 / 3;
    const G3 = 1 / 6;
    
    const grad3 = [
      [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
      [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
      [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
    ];
    
    let perm = [];
    
    function seed(s) {
      const p = [];
      for (let i = 0; i < 256; i++) p[i] = i;
      
      // Seeded random shuffle
      let n = s;
      for (let i = 255; i > 0; i--) {
        n = (n * 16807) % 2147483647;
        const j = n % (i + 1);
        [p[i], p[j]] = [p[j], p[i]];
      }
      
      perm = [];
      for (let i = 0; i < 512; i++) {
        perm[i] = p[i & 255];
      }
    }
    
    function dot2(g, x, y) {
      return g[0] * x + g[1] * y;
    }
    
    function dot3(g, x, y, z) {
      return g[0] * x + g[1] * y + g[2] * z;
    }
    
    function noise2D(x, y) {
      const s = (x + y) * F2;
      const i = Math.floor(x + s);
      const j = Math.floor(y + s);
      
      const t = (i + j) * G2;
      const X0 = i - t;
      const Y0 = j - t;
      const x0 = x - X0;
      const y0 = y - Y0;
      
      let i1, j1;
      if (x0 > y0) { i1 = 1; j1 = 0; }
      else { i1 = 0; j1 = 1; }
      
      const x1 = x0 - i1 + G2;
      const y1 = y0 - j1 + G2;
      const x2 = x0 - 1 + 2 * G2;
      const y2 = y0 - 1 + 2 * G2;
      
      const ii = i & 255;
      const jj = j & 255;
      
      let n0, n1, n2;
      
      let t0 = 0.5 - x0 * x0 - y0 * y0;
      if (t0 < 0) n0 = 0;
      else {
        t0 *= t0;
        n0 = t0 * t0 * dot2(grad3[perm[ii + perm[jj]] % 12], x0, y0);
      }
      
      let t1 = 0.5 - x1 * x1 - y1 * y1;
      if (t1 < 0) n1 = 0;
      else {
        t1 *= t1;
        n1 = t1 * t1 * dot2(grad3[perm[ii + i1 + perm[jj + j1]] % 12], x1, y1);
      }
      
      let t2 = 0.5 - x2 * x2 - y2 * y2;
      if (t2 < 0) n2 = 0;
      else {
        t2 *= t2;
        n2 = t2 * t2 * dot2(grad3[perm[ii + 1 + perm[jj + 1]] % 12], x2, y2);
      }
      
      return 70 * (n0 + n1 + n2);
    }
    
    function noise3D(x, y, z) {
      const s = (x + y + z) * F3;
      const i = Math.floor(x + s);
      const j = Math.floor(y + s);
      const k = Math.floor(z + s);
      
      const t = (i + j + k) * G3;
      const X0 = i - t;
      const Y0 = j - t;
      const Z0 = k - t;
      const x0 = x - X0;
      const y0 = y - Y0;
      const z0 = z - Z0;
      
      let i1, j1, k1, i2, j2, k2;
      if (x0 >= y0) {
        if (y0 >= z0) { i1=1; j1=0; k1=0; i2=1; j2=1; k2=0; }
        else if (x0 >= z0) { i1=1; j1=0; k1=0; i2=1; j2=0; k2=1; }
        else { i1=0; j1=0; k1=1; i2=1; j2=0; k2=1; }
      } else {
        if (y0 < z0) { i1=0; j1=0; k1=1; i2=0; j2=1; k2=1; }
        else if (x0 < z0) { i1=0; j1=1; k1=0; i2=0; j2=1; k2=1; }
        else { i1=0; j1=1; k1=0; i2=1; j2=1; k2=0; }
      }
      
      const x1 = x0 - i1 + G3;
      const y1 = y0 - j1 + G3;
      const z1 = z0 - k1 + G3;
      const x2 = x0 - i2 + 2 * G3;
      const y2 = y0 - j2 + 2 * G3;
      const z2 = z0 - k2 + 2 * G3;
      const x3 = x0 - 1 + 3 * G3;
      const y3 = y0 - 1 + 3 * G3;
      const z3 = z0 - 1 + 3 * G3;
      
      const ii = i & 255;
      const jj = j & 255;
      const kk = k & 255;
      
      let n0, n1, n2, n3;
      
      let t0 = 0.6 - x0*x0 - y0*y0 - z0*z0;
      if (t0 < 0) n0 = 0;
      else {
        t0 *= t0;
        n0 = t0 * t0 * dot3(grad3[perm[ii+perm[jj+perm[kk]]] % 12], x0, y0, z0);
      }
      
      let t1 = 0.6 - x1*x1 - y1*y1 - z1*z1;
      if (t1 < 0) n1 = 0;
      else {
        t1 *= t1;
        n1 = t1 * t1 * dot3(grad3[perm[ii+i1+perm[jj+j1+perm[kk+k1]]] % 12], x1, y1, z1);
      }
      
      let t2 = 0.6 - x2*x2 - y2*y2 - z2*z2;
      if (t2 < 0) n2 = 0;
      else {
        t2 *= t2;
        n2 = t2 * t2 * dot3(grad3[perm[ii+i2+perm[jj+j2+perm[kk+k2]]] % 12], x2, y2, z2);
      }
      
      let t3 = 0.6 - x3*x3 - y3*y3 - z3*z3;
      if (t3 < 0) n3 = 0;
      else {
        t3 *= t3;
        n3 = t3 * t3 * dot3(grad3[perm[ii+1+perm[jj+1+perm[kk+1]]] % 12], x3, y3, z3);
      }
      
      return 32 * (n0 + n1 + n2 + n3);
    }
    
    // Initialize with default seed
    seed(Date.now());
    
    return { seed, noise2D, noise3D };
  })();

  // ============================================================================
  // ENGINE STATE
  // ============================================================================
  
  let canvas = null;
  let ctx = null;
  let config = { ...DEFAULT_CONFIG };
  let grid = { cols: 0, rows: 0, cells: [] };
  let mouse = { x: -1000, y: -1000, active: false, lastMove: 0 };
  let animationId = null;
  let lastFrameTime = 0;
  let currentScene = null;
  let currentSceneName = '';
  let transitionState = null;
  let isInitialized = false;
  let isMobile = false;

  // ============================================================================
  // SCENES
  // ============================================================================
  
  /**
   * Scene: Clouds/Bubbles
   * Floating ASCII bubbles with noise-based movement
   */
  const CloudsScene = {
    name: 'clouds',
    
    // Scene-specific state
    state: {
      time: 0,
      bubbles: []
    },
    
    // Scene-specific config
    config: {
      speed: 0.3,
      noiseScale: 0.02,
      bubbleCount: 15,
      bubbleMinSize: 3,
      bubbleMaxSize: 8,
      palette: [
        '#FF6B35',  // Orange
        '#F7931E',  // Amber
        '#FFB347',  // Light orange
        '#CC5500',  // Burnt orange
        '#E65C00',  // Dark orange
        '#FF8C42'   // Coral orange
      ]
    },
    
    init(gridRef, globalConfig) {
      this.state.time = 0;
      this.state.bubbles = [];
      
      // Create bubbles
      const count = isMobile ? Math.floor(this.config.bubbleCount * 0.6) : this.config.bubbleCount;
      for (let i = 0; i < count; i++) {
        this.state.bubbles.push({
          x: Math.random() * gridRef.cols,
          y: Math.random() * gridRef.rows,
          baseX: Math.random() * gridRef.cols,
          baseY: Math.random() * gridRef.rows,
          size: this.config.bubbleMinSize + Math.random() * (this.config.bubbleMaxSize - this.config.bubbleMinSize),
          speed: 0.5 + Math.random() * 0.5,
          phase: Math.random() * Math.PI * 2,
          colorIndex: Math.floor(Math.random() * this.config.palette.length)
        });
      }
    },
    
    update(gridRef, globalConfig, time, deltaTime) {
      this.state.time += deltaTime * this.config.speed;
      
      const mouseGridX = mouse.x / globalConfig.cellSize;
      const mouseGridY = mouse.y / globalConfig.cellSize;
      const mouseRadius = globalConfig.mouseInfluenceRadius / globalConfig.cellSize;
      const mouseActive = mouse.active && (Date.now() - mouse.lastMove < 3000);
      
      // Update bubble positions
      for (const bubble of this.state.bubbles) {
        // Noise-based movement
        const noiseX = SimplexNoise.noise3D(
          bubble.baseX * this.config.noiseScale,
          bubble.baseY * this.config.noiseScale,
          this.state.time * 0.5
        );
        const noiseY = SimplexNoise.noise3D(
          bubble.baseX * this.config.noiseScale + 100,
          bubble.baseY * this.config.noiseScale + 100,
          this.state.time * 0.5
        );
        
        bubble.x = bubble.baseX + noiseX * 5;
        bubble.y = bubble.baseY + noiseY * 5 + Math.sin(this.state.time + bubble.phase) * 2;
        
        // Slow drift upward
        bubble.baseY -= deltaTime * bubble.speed * 0.3;
        if (bubble.baseY < -bubble.size) {
          bubble.baseY = gridRef.rows + bubble.size;
          bubble.baseX = Math.random() * gridRef.cols;
        }
        
        // Mouse interaction - push bubbles away
        if (mouseActive) {
          const dx = bubble.x - mouseGridX;
          const dy = bubble.y - mouseGridY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < mouseRadius && dist > 0) {
            const force = (1 - dist / mouseRadius) * globalConfig.mouseStrength * 3;
            bubble.x += (dx / dist) * force;
            bubble.y += (dy / dist) * force;
          }
        }
      }
      
      // Clear grid
      for (let i = 0; i < gridRef.cells.length; i++) {
        gridRef.cells[i] = { char: ' ', color: globalConfig.backgroundColor, intensity: 0 };
      }
      
      // Render bubbles to grid
      for (const bubble of this.state.bubbles) {
        this.renderBubble(gridRef, bubble, globalConfig);
      }
    },
    
    renderBubble(gridRef, bubble, globalConfig) {
      const charset = globalConfig.charset;
      const color = this.config.palette[bubble.colorIndex];
      
      for (let dy = -bubble.size; dy <= bubble.size; dy++) {
        for (let dx = -bubble.size; dx <= bubble.size; dx++) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > bubble.size) continue;
          
          const gx = Math.floor(bubble.x + dx);
          const gy = Math.floor(bubble.y + dy);
          
          if (gx < 0 || gx >= gridRef.cols || gy < 0 || gy >= gridRef.rows) continue;
          
          const idx = gy * gridRef.cols + gx;
          const intensity = 1 - (dist / bubble.size);
          const charIndex = Math.floor(intensity * (charset.length - 1));
          
          // Blend with existing cell
          if (intensity > gridRef.cells[idx].intensity) {
            gridRef.cells[idx] = {
              char: charset[charIndex],
              color: color,
              intensity: intensity
            };
          }
        }
      }
    },
    
    render(ctx, gridRef, globalConfig) {
      // Rendering is handled by the main engine
    }
  };

  /**
   * Scene: Neurons/Network
   * Neural network visualization with pulses
   */
  const NeuronsScene = {
    name: 'neurons',
    
    state: {
      time: 0,
      nodes: [],
      connections: [],
      pulses: [],
      cameraOffset: { x: 0, y: 0 }
    },
    
    config: {
      nodeCount: 25,
      connectionProbability: 0.15,
      pulseSpeed: 8,
      cameraSpeed: 0.3,
      palette: [
        '#4A90D9',  // Blue
        '#7B68EE',  // Medium purple
        '#6A5ACD',  // Slate blue
        '#9370DB',  // Medium orchid
        '#8A2BE2',  // Blue violet
        '#5D6DB8'   // Periwinkle
      ],
      pulseColor: '#FFFFFF',
      connectionColor: '#333366'
    },
    
    init(gridRef, globalConfig) {
      this.state.time = 0;
      this.state.nodes = [];
      this.state.connections = [];
      this.state.pulses = [];
      this.state.cameraOffset = { x: 0, y: 0 };
      
      const nodeCount = isMobile ? Math.floor(this.config.nodeCount * 0.6) : this.config.nodeCount;
      
      // Create nodes spread across the grid
      for (let i = 0; i < nodeCount; i++) {
        this.state.nodes.push({
          x: Math.random() * gridRef.cols * 1.5 - gridRef.cols * 0.25,
          y: Math.random() * gridRef.rows * 1.5 - gridRef.rows * 0.25,
          size: 1 + Math.random() * 2,
          colorIndex: Math.floor(Math.random() * this.config.palette.length),
          brightness: 0.5 + Math.random() * 0.5
        });
      }
      
      // Create connections between nearby nodes
      for (let i = 0; i < this.state.nodes.length; i++) {
        for (let j = i + 1; j < this.state.nodes.length; j++) {
          const dx = this.state.nodes[i].x - this.state.nodes[j].x;
          const dy = this.state.nodes[i].y - this.state.nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          const maxDist = Math.max(gridRef.cols, gridRef.rows) * 0.4;
          if (dist < maxDist && Math.random() < this.config.connectionProbability) {
            this.state.connections.push({
              from: i,
              to: j,
              length: dist
            });
          }
        }
      }
    },
    
    update(gridRef, globalConfig, time, deltaTime) {
      this.state.time += deltaTime;
      
      // Move camera
      this.state.cameraOffset.x += deltaTime * this.config.cameraSpeed;
      this.state.cameraOffset.y += Math.sin(this.state.time * 0.2) * deltaTime * this.config.cameraSpeed * 0.5;
      
      // Spawn new pulses randomly
      if (Math.random() < 0.02 && this.state.connections.length > 0) {
        const conn = this.state.connections[Math.floor(Math.random() * this.state.connections.length)];
        this.state.pulses.push({
          connection: conn,
          progress: 0,
          speed: this.config.pulseSpeed + Math.random() * 4,
          reverse: Math.random() > 0.5
        });
      }
      
      // Update pulses
      this.state.pulses = this.state.pulses.filter(pulse => {
        pulse.progress += (deltaTime * pulse.speed) / pulse.connection.length;
        return pulse.progress < 1;
      });
      
      // Clear grid
      for (let i = 0; i < gridRef.cells.length; i++) {
        gridRef.cells[i] = { char: ' ', color: globalConfig.backgroundColor, intensity: 0 };
      }
      
      // Render connections
      for (const conn of this.state.connections) {
        this.renderConnection(gridRef, conn, globalConfig);
      }
      
      // Render pulses
      for (const pulse of this.state.pulses) {
        this.renderPulse(gridRef, pulse, globalConfig);
      }
      
      // Render nodes
      for (const node of this.state.nodes) {
        this.renderNode(gridRef, node, globalConfig);
      }
    },
    
    renderConnection(gridRef, conn, globalConfig) {
      const nodeA = this.state.nodes[conn.from];
      const nodeB = this.state.nodes[conn.to];
      
      const ax = nodeA.x - this.state.cameraOffset.x;
      const ay = nodeA.y - this.state.cameraOffset.y;
      const bx = nodeB.x - this.state.cameraOffset.x;
      const by = nodeB.y - this.state.cameraOffset.y;
      
      // Bresenham-like line drawing
      const steps = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
      if (steps === 0) return;
      
      const connectionChars = ['-', '|', '/', '\\'];
      
      for (let i = 0; i <= steps; i += 2) {
        const t = i / steps;
        const x = Math.floor(ax + (bx - ax) * t);
        const y = Math.floor(ay + (by - ay) * t);
        
        // Wrap around
        const gx = ((x % gridRef.cols) + gridRef.cols) % gridRef.cols;
        const gy = ((y % gridRef.rows) + gridRef.rows) % gridRef.rows;
        
        const idx = gy * gridRef.cols + gx;
        
        // Determine character based on angle
        const angle = Math.atan2(by - ay, bx - ax);
        let charIdx;
        const absAngle = Math.abs(angle);
        if (absAngle < Math.PI / 4 || absAngle > 3 * Math.PI / 4) {
          charIdx = 0; // -
        } else if (absAngle > Math.PI / 4 && absAngle < 3 * Math.PI / 4) {
          charIdx = 1; // |
        } else if (angle > 0) {
          charIdx = angle < Math.PI / 2 ? 2 : 3; // / or \
        } else {
          charIdx = angle > -Math.PI / 2 ? 3 : 2;
        }
        
        if (gridRef.cells[idx].intensity < 0.3) {
          gridRef.cells[idx] = {
            char: connectionChars[charIdx],
            color: this.config.connectionColor,
            intensity: 0.3
          };
        }
      }
    },
    
    renderPulse(gridRef, pulse, globalConfig) {
      const nodeA = this.state.nodes[pulse.connection.from];
      const nodeB = this.state.nodes[pulse.connection.to];
      
      const progress = pulse.reverse ? 1 - pulse.progress : pulse.progress;
      
      const px = nodeA.x + (nodeB.x - nodeA.x) * progress - this.state.cameraOffset.x;
      const py = nodeA.y + (nodeB.y - nodeA.y) * progress - this.state.cameraOffset.y;
      
      // Wrap around
      const gx = Math.floor(((px % gridRef.cols) + gridRef.cols) % gridRef.cols);
      const gy = Math.floor(((py % gridRef.rows) + gridRef.rows) % gridRef.rows);
      
      // Draw pulse with glow
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const x = ((gx + dx) % gridRef.cols + gridRef.cols) % gridRef.cols;
          const y = ((gy + dy) % gridRef.rows + gridRef.rows) % gridRef.rows;
          const idx = y * gridRef.cols + x;
          
          const dist = Math.sqrt(dx * dx + dy * dy);
          const intensity = dist === 0 ? 1 : 0.5 / dist;
          
          if (intensity > gridRef.cells[idx].intensity) {
            gridRef.cells[idx] = {
              char: dist === 0 ? '*' : '+',
              color: this.config.pulseColor,
              intensity: intensity
            };
          }
        }
      }
    },
    
    renderNode(gridRef, node, globalConfig) {
      const x = node.x - this.state.cameraOffset.x;
      const y = node.y - this.state.cameraOffset.y;
      
      // Wrap around
      const gx = Math.floor(((x % gridRef.cols) + gridRef.cols) % gridRef.cols);
      const gy = Math.floor(((y % gridRef.rows) + gridRef.rows) % gridRef.rows);
      
      const nodeChars = ['o', 'O', '@'];
      const color = this.config.palette[node.colorIndex];
      
      // Draw node center
      const idx = gy * gridRef.cols + gx;
      gridRef.cells[idx] = {
        char: nodeChars[Math.floor(node.size)],
        color: color,
        intensity: node.brightness
      };
      
      // Draw surrounding glow
      if (node.size > 1) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            
            const nx = ((gx + dx) % gridRef.cols + gridRef.cols) % gridRef.cols;
            const ny = ((gy + dy) % gridRef.rows + gridRef.rows) % gridRef.rows;
            const nidx = ny * gridRef.cols + nx;
            
            if (gridRef.cells[nidx].intensity < 0.5) {
              gridRef.cells[nidx] = {
                char: '.',
                color: color,
                intensity: 0.5
              };
            }
          }
        }
      }
    },
    
    render(ctx, gridRef, globalConfig) {
      // Rendering is handled by the main engine
    }
  };

  /**
   * Scene: Eyes
   * ASCII eyes that follow the cursor
   */
  const EyesScene = {
    name: 'eyes',
    
    state: {
      time: 0,
      eyes: [],
      idleAngle: 0
    },
    
    config: {
      eyeCount: 3,
      eyeRadius: 6,
      pupilRadius: 2,
      maxPupilOffset: 3,
      trackingSpeed: 0.15,
      idleSpeed: 0.5,
      palette: {
        outline: '#AAAAAA',
        iris: '#668866',
        pupil: '#222222',
        highlight: '#FFFFFF'
      }
    },
    
    init(gridRef, globalConfig) {
      this.state.time = 0;
      this.state.eyes = [];
      this.state.idleAngle = 0;
      
      const count = isMobile ? Math.min(2, this.config.eyeCount) : this.config.eyeCount;
      
      // Position eyes across the grid
      const spacing = gridRef.cols / (count + 1);
      for (let i = 0; i < count; i++) {
        this.state.eyes.push({
          x: spacing * (i + 1),
          y: gridRef.rows / 2,
          pupilOffsetX: 0,
          pupilOffsetY: 0,
          targetOffsetX: 0,
          targetOffsetY: 0,
          blinkTimer: Math.random() * 5,
          isBlinking: false
        });
      }
    },
    
    update(gridRef, globalConfig, time, deltaTime) {
      this.state.time += deltaTime;
      this.state.idleAngle += deltaTime * this.config.idleSpeed;
      
      const mouseGridX = mouse.x / globalConfig.cellSize;
      const mouseGridY = mouse.y / globalConfig.cellSize;
      const mouseActive = mouse.active && (Date.now() - mouse.lastMove < 2000);
      
      // Update eyes
      for (const eye of this.state.eyes) {
        // Blink logic
        eye.blinkTimer -= deltaTime;
        if (eye.blinkTimer <= 0) {
          eye.isBlinking = true;
          eye.blinkTimer = 3 + Math.random() * 4;
          setTimeout(() => { eye.isBlinking = false; }, 150);
        }
        
        // Calculate target pupil position
        if (mouseActive) {
          const dx = mouseGridX - eye.x;
          const dy = mouseGridY - eye.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist > 0) {
            const maxOffset = this.config.maxPupilOffset;
            const factor = Math.min(1, dist / 30);
            eye.targetOffsetX = (dx / dist) * maxOffset * factor;
            eye.targetOffsetY = (dy / dist) * maxOffset * factor;
          }
        } else {
          // Idle movement - look around slowly
          eye.targetOffsetX = Math.cos(this.state.idleAngle + eye.x * 0.1) * this.config.maxPupilOffset * 0.5;
          eye.targetOffsetY = Math.sin(this.state.idleAngle * 0.7 + eye.y * 0.1) * this.config.maxPupilOffset * 0.3;
        }
        
        // Smooth interpolation
        eye.pupilOffsetX += (eye.targetOffsetX - eye.pupilOffsetX) * this.config.trackingSpeed;
        eye.pupilOffsetY += (eye.targetOffsetY - eye.pupilOffsetY) * this.config.trackingSpeed;
      }
      
      // Clear grid
      for (let i = 0; i < gridRef.cells.length; i++) {
        gridRef.cells[i] = { char: ' ', color: globalConfig.backgroundColor, intensity: 0 };
      }
      
      // Render eyes
      for (const eye of this.state.eyes) {
        this.renderEye(gridRef, eye, globalConfig);
      }
    },
    
    renderEye(gridRef, eye, globalConfig) {
      const radius = this.config.eyeRadius;
      const pupilRadius = this.config.pupilRadius;
      const palette = this.config.palette;
      
      // Draw eye shape
      for (let dy = -radius - 1; dy <= radius + 1; dy++) {
        for (let dx = -radius - 2; dx <= radius + 2; dx++) {
          const gx = Math.floor(eye.x + dx);
          const gy = Math.floor(eye.y + dy);
          
          if (gx < 0 || gx >= gridRef.cols || gy < 0 || gy >= gridRef.rows) continue;
          
          const idx = gy * gridRef.cols + gx;
          
          // Eye shape (ellipse)
          const normalizedX = dx / (radius + 1);
          const normalizedY = dy / radius;
          const distFromCenter = normalizedX * normalizedX + normalizedY * normalizedY;
          
          // Blink - close eye
          if (eye.isBlinking) {
            if (Math.abs(dy) <= 1 && Math.abs(dx) <= radius) {
              gridRef.cells[idx] = {
                char: '-',
                color: palette.outline,
                intensity: 0.8
              };
            }
            continue;
          }
          
          // Determine what to draw at this position
          const pupilX = eye.pupilOffsetX;
          const pupilY = eye.pupilOffsetY;
          const distFromPupil = Math.sqrt((dx - pupilX) ** 2 + (dy - pupilY) ** 2);
          
          if (distFromPupil < pupilRadius * 0.6) {
            // Pupil center
            gridRef.cells[idx] = {
              char: '@',
              color: palette.pupil,
              intensity: 1
            };
          } else if (distFromPupil < pupilRadius) {
            // Pupil edge
            gridRef.cells[idx] = {
              char: '#',
              color: palette.pupil,
              intensity: 0.9
            };
          } else if (distFromPupil < pupilRadius + 1.5) {
            // Iris
            gridRef.cells[idx] = {
              char: 'O',
              color: palette.iris,
              intensity: 0.7
            };
          } else if (distFromCenter < 0.85) {
            // White of eye
            gridRef.cells[idx] = {
              char: '.',
              color: '#DDDDDD',
              intensity: 0.4
            };
          } else if (distFromCenter < 1.1) {
            // Eye outline
            let outlineChar = 'o';
            
            // Determine outline character based on position
            if (Math.abs(normalizedX) > 0.7) {
              outlineChar = normalizedX > 0 ? ')' : '(';
            } else if (Math.abs(normalizedY) > 0.7) {
              outlineChar = '-';
            } else if (normalizedX * normalizedY > 0) {
              outlineChar = normalizedY > 0 ? '\\' : '/';
            } else {
              outlineChar = normalizedY > 0 ? '/' : '\\';
            }
            
            gridRef.cells[idx] = {
              char: outlineChar,
              color: palette.outline,
              intensity: 0.6
            };
          }
          
          // Add highlight
          if (dx === Math.floor(pupilX - 1) && dy === Math.floor(pupilY - 1)) {
            gridRef.cells[idx] = {
              char: '*',
              color: palette.highlight,
              intensity: 1
            };
          }
        }
      }
    },
    
    render(ctx, gridRef, globalConfig) {
      // Rendering is handled by the main engine
    }
  };

  // Scene registry
  const SCENES = {
    clouds: CloudsScene,
    neurons: NeuronsScene,
    eyes: EyesScene
  };

  // ============================================================================
  // CORE ENGINE FUNCTIONS
  // ============================================================================
  
  /**
   * Initialize the ASCII background engine
   * @param {HTMLCanvasElement} canvasElement - The canvas to render to
   * @param {string} initialSceneName - Initial scene to display
   */
  function init(canvasElement, initialSceneName = 'clouds') {
    if (isInitialized) {
      console.warn('AsciiBackground already initialized');
      return;
    }
    
    canvas = canvasElement;
    ctx = canvas.getContext('2d');
    
    // Detect mobile
    isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
               || window.innerWidth < 768;
    
    // Apply mobile scale factor
    if (isMobile) {
      config.cellSize = Math.floor(config.cellSize / config.mobileScaleFactor);
    }
    
    // Setup canvas
    setupCanvas();
    window.addEventListener('resize', handleResize);
    
    // Setup mouse tracking
    setupMouseTracking();
    
    // Initialize first scene
    setScene(initialSceneName, false);
    
    isInitialized = true;
    
    // Start animation loop
    lastFrameTime = performance.now();
    animationId = requestAnimationFrame(animationLoop);
    
    console.log('AsciiBackground initialized with scene:', initialSceneName);
  }
  
  /**
   * Setup canvas dimensions with devicePixelRatio support
   */
  function setupCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    // Set canvas size accounting for device pixel ratio
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    // Scale context to match
    ctx.scale(dpr, dpr);
    
    // Store logical dimensions
    canvas.logicalWidth = rect.width;
    canvas.logicalHeight = rect.height;
    
    // Calculate grid dimensions
    grid.cols = Math.ceil(rect.width / config.cellSize);
    grid.rows = Math.ceil(rect.height / config.cellSize);
    grid.cells = new Array(grid.cols * grid.rows).fill(null).map(() => ({
      char: ' ',
      color: config.backgroundColor,
      intensity: 0
    }));
    
    console.log(`Grid initialized: ${grid.cols}x${grid.rows} cells`);
  }
  
  /**
   * Handle window resize
   */
  function handleResize() {
    setupCanvas();
    
    // Reinitialize current scene for new grid size
    if (currentScene) {
      currentScene.init(grid, config);
    }
  }
  
  /**
   * Setup mouse tracking
   */
  function setupMouseTracking() {
    const updateMouse = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
      mouse.lastMove = Date.now();
    };
    
    canvas.addEventListener('mousemove', updateMouse);
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        mouse.x = touch.clientX - rect.left;
        mouse.y = touch.clientY - rect.top;
        mouse.active = true;
        mouse.lastMove = Date.now();
      }
    }, { passive: false });
    
    canvas.addEventListener('mouseleave', () => {
      mouse.active = false;
    });
  }
  
  /**
   * Change the current scene
   * @param {string} sceneName - Name of the scene to switch to
   * @param {boolean} transition - Whether to use a transition effect
   */
  function setScene(sceneName, transition = true) {
    if (!SCENES[sceneName]) {
      console.error(`Scene "${sceneName}" not found. Available: ${Object.keys(SCENES).join(', ')}`);
      return;
    }
    
    const newScene = SCENES[sceneName];
    
    if (transition && currentScene && config.transitionDuration > 0) {
      // Start transition
      transitionState = {
        fromScene: currentScene,
        toScene: newScene,
        fromGrid: JSON.parse(JSON.stringify(grid.cells)),
        progress: 0,
        duration: config.transitionDuration,
        type: config.transitionType
      };
      
      // Initialize new scene
      newScene.init(grid, config);
    } else {
      // Direct switch
      currentScene = newScene;
      currentSceneName = sceneName;
      currentScene.init(grid, config);
    }
    
    console.log(`Scene changed to: ${sceneName}`);
  }
  
  /**
   * Update configuration
   * @param {Object} partialConfig - Configuration options to update
   */
  function updateConfig(partialConfig) {
    Object.assign(config, partialConfig);
    
    // If cell size changed, reinitialize
    if (partialConfig.cellSize) {
      setupCanvas();
      if (currentScene) {
        currentScene.init(grid, config);
      }
    }
    
    console.log('Config updated:', partialConfig);
  }
  
  /**
   * Main animation loop
   */
  function animationLoop(timestamp) {
    animationId = requestAnimationFrame(animationLoop);
    
    // Calculate delta time
    const deltaTime = Math.min((timestamp - lastFrameTime) / 1000, 0.1); // Cap at 100ms
    lastFrameTime = timestamp;
    
    // Frame rate limiting
    const frameInterval = 1000 / config.fps;
    if (timestamp - lastFrameTime < frameInterval - 16) {
      // Skip frame if too early (with 16ms tolerance)
      // Actually we already set lastFrameTime, so this check is off
      // Let's use a different approach - track last render time
    }
    
    // Handle transition
    if (transitionState) {
      updateTransition(deltaTime);
    } else if (currentScene) {
      // Update current scene
      currentScene.update(grid, config, timestamp / 1000, deltaTime);
    }
    
    // Render
    render();
  }
  
  /**
   * Update transition between scenes
   */
  function updateTransition(deltaTime) {
    transitionState.progress += (deltaTime * 1000) / transitionState.duration;
    
    if (transitionState.progress >= 1) {
      // Transition complete
      currentScene = transitionState.toScene;
      currentSceneName = transitionState.toScene.name;
      transitionState = null;
      return;
    }
    
    // Update both scenes
    transitionState.toScene.update(grid, config, performance.now() / 1000, deltaTime);
    
    // Apply transition effect
    const progress = transitionState.progress;
    const fromGrid = transitionState.fromGrid;
    
    if (transitionState.type === 'glitch') {
      // Glitch transition - mix characters randomly
      const glitchChars = ['█', '▓', '▒', '░', '/', '\\', '|', '-', '+', '*'];
      
      for (let i = 0; i < grid.cells.length; i++) {
        if (Math.random() < 0.3 * (1 - Math.abs(progress - 0.5) * 2)) {
          grid.cells[i].char = glitchChars[Math.floor(Math.random() * glitchChars.length)];
          grid.cells[i].color = Math.random() > 0.5 ? '#FFFFFF' : grid.cells[i].color;
        }
      }
    }
    
    // Fade effect (always applied)
    // The opacity will be handled in render
    transitionState.opacity = progress;
  }
  
  /**
   * Render the grid to canvas
   */
  function render() {
    const logicalWidth = canvas.logicalWidth || canvas.width;
    const logicalHeight = canvas.logicalHeight || canvas.height;
    
    // Clear canvas
    ctx.fillStyle = config.backgroundColor;
    ctx.fillRect(0, 0, logicalWidth, logicalHeight);
    
    // Set font
    ctx.font = `${config.cellSize * 0.9}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Calculate opacity for transition
    let globalOpacity = 1;
    if (transitionState) {
      globalOpacity = transitionState.opacity;
    }
    
    // Render each cell
    for (let y = 0; y < grid.rows; y++) {
      for (let x = 0; x < grid.cols; x++) {
        const idx = y * grid.cols + x;
        const cell = grid.cells[idx];
        
        if (cell.char === ' ' || cell.intensity === 0) continue;
        
        const screenX = x * config.cellSize + config.cellSize / 2;
        const screenY = y * config.cellSize + config.cellSize / 2;
        
        // Apply intensity and transition opacity to color
        let color = cell.color;
        let opacity = cell.intensity * globalOpacity;
        
        // Parse color and apply opacity
        ctx.globalAlpha = opacity;
        ctx.fillStyle = color;
        ctx.fillText(cell.char, screenX, screenY);
      }
    }
    
    // Reset alpha
    ctx.globalAlpha = 1;
  }
  
  /**
   * Stop the animation
   */
  function stop() {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    isInitialized = false;
  }
  
  /**
   * List available scenes
   */
  function listScenes() {
    return Object.keys(SCENES);
  }
  
  /**
   * Get current scene name
   */
  function getCurrentScene() {
    return currentSceneName;
  }
  
  /**
   * Get next scene in rotation (avoiding current)
   */
  function getNextScene() {
    const scenes = listScenes();
    const currentIndex = scenes.indexOf(currentSceneName);
    let nextIndex = (currentIndex + 1) % scenes.length;
    
    // If only one scene, return it
    if (scenes.length <= 1) return scenes[0];
    
    // Otherwise return next
    return scenes[nextIndex];
  }
  
  /**
   * Get random scene (avoiding current)
   */
  function getRandomScene() {
    const scenes = listScenes().filter(s => s !== currentSceneName);
    if (scenes.length === 0) return currentSceneName;
    return scenes[Math.floor(Math.random() * scenes.length)];
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================
  
  return {
    init,
    setScene,
    updateConfig,
    stop,
    listScenes,
    getCurrentScene,
    getNextScene,
    getRandomScene,
    
    // For debugging
    getGrid: () => grid,
    getConfig: () => ({ ...config }),
    getMouse: () => ({ ...mouse }),
    isInitialized: () => isInitialized
  };
})();

// Expose to window for debugging
if (typeof window !== 'undefined') {
  window.AsciiBackground = AsciiBackground;
}
