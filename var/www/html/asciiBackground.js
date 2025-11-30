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
    // Extended ASCII charset - full range of printable ASCII characters
    charset: [
      ' ', '!', '"', '#', '$', '%', '&', "'", '(', ')', '*', '+', ',', '-', '.', '/',
      '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', ':', ';', '<', '=', '>', '?',
      '@', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O',
      'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '[', '\\', ']', '^', '_',
      '`', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o',
      'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '{', '|', '}', '~'
    ],
    // Density-based charset (sorted by visual density for gradients)
    densityCharset: [
      ' ', '.', '`', "'", ',', ':', ';', '-', '~', '+', '=', '*', '!', '?', '%', '#',
      'i', 'l', 't', 'f', 'j', 'r', 'x', 'n', 'u', 'v', 'c', 'z', 's', 'k', 'e', 'a',
      'o', 'Y', 'X', 'Z', 'U', 'J', 'C', 'L', 'Q', '0', 'O', 'W', 'M', 'N', 'B', '@', '#'
    ],
    
    // Animation
    fps: 30,                // Target frames per second
    
    // Colors (can be overridden per scene)
    backgroundColor: '#111111',
    defaultColor: '#ffffff',
    
    // Transition settings
    transitionDuration: 1500, // ms
    transitionType: 'morph',   // 'fade', 'glitch', or 'morph' (fluid character movement)
    
    // Performance
    mobileScaleFactor: 0.6,  // Reduce grid density on mobile
    
    // Mouse interaction
    mouseInfluenceRadius: 200,
    mouseStrength: 1.5
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
   * Floating ASCII bubbles with organic interactions, fusion, and cursor reactivity
   */
  const CloudsScene = {
    name: 'clouds',
    
    // Scene-specific state
    state: {
      time: 0,
      bubbles: [],
      gridCols: 0,
      gridRows: 0
    },
    
    // Scene-specific config
    config: {
      speed: 1.2,           // Much faster speed
      noiseScale: 0.03,     // More noise variation
      bubbleCount: 25,      // More bubbles
      bubbleMinSize: 2,
      bubbleMaxSize: 10,
      fusionDistance: 6,    // Distance at which bubbles start merging
      repelDistance: 4,     // Distance at which bubbles push each other
      mouseForce: 15,       // Strong mouse influence
      mouseDecay: 0.85,     // How fast mouse influence fades
      organicDeformation: 0.3, // Amount of shape deformation
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
      this.state.gridCols = gridRef.cols;
      this.state.gridRows = gridRef.rows;
      
      // Create bubbles with velocity
      const count = isMobile ? Math.floor(this.config.bubbleCount * 0.6) : this.config.bubbleCount;
      for (let i = 0; i < count; i++) {
        this.state.bubbles.push({
          x: Math.random() * gridRef.cols,
          y: Math.random() * gridRef.rows,
          vx: (Math.random() - 0.5) * 2,  // Velocity X
          vy: (Math.random() - 0.5) * 2,  // Velocity Y
          baseSize: this.config.bubbleMinSize + Math.random() * (this.config.bubbleMaxSize - this.config.bubbleMinSize),
          size: 0, // Current size (affected by interactions)
          targetSize: 0,
          speed: 0.8 + Math.random() * 0.8,
          phase: Math.random() * Math.PI * 2,
          colorIndex: Math.floor(Math.random() * this.config.palette.length),
          deformX: 1, // Horizontal deformation factor
          deformY: 1, // Vertical deformation factor
          pulse: 0,   // Pulsing effect from interactions
          mass: 1     // For physics calculations
        });
        // Initialize size-dependent properties
        const bubble = this.state.bubbles[this.state.bubbles.length - 1];
        bubble.size = bubble.baseSize;
        bubble.targetSize = bubble.baseSize;
        bubble.mass = bubble.baseSize;
      }
    },
    
    update(gridRef, globalConfig, time, deltaTime) {
      this.state.time += deltaTime * this.config.speed;
      
      const mouseGridX = mouse.x / globalConfig.cellSize;
      const mouseGridY = mouse.y / globalConfig.cellSize;
      const mouseRadius = globalConfig.mouseInfluenceRadius / globalConfig.cellSize;
      const mouseActive = mouse.active && (Date.now() - mouse.lastMove < 3000);
      
      // Update bubble physics
      for (let i = 0; i < this.state.bubbles.length; i++) {
        const bubble = this.state.bubbles[i];
        
        // Noise-based organic movement
        const noiseX = SimplexNoise.noise3D(
          bubble.x * this.config.noiseScale,
          bubble.y * this.config.noiseScale,
          this.state.time * 0.8
        );
        const noiseY = SimplexNoise.noise3D(
          bubble.x * this.config.noiseScale + 100,
          bubble.y * this.config.noiseScale + 100,
          this.state.time * 0.8
        );
        
        // Add noise to velocity
        bubble.vx += noiseX * deltaTime * 3;
        bubble.vy += noiseY * deltaTime * 3;
        
        // Gentle upward drift
        bubble.vy -= deltaTime * bubble.speed * 0.5;
        
        // Bubble-to-bubble interactions
        for (let j = i + 1; j < this.state.bubbles.length; j++) {
          const other = this.state.bubbles[j];
          const dx = other.x - bubble.x;
          const dy = other.y - bubble.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = bubble.size + other.size;
          
          if (dist < minDist && dist > 0) {
            // Collision/interaction
            const overlap = minDist - dist;
            const nx = dx / dist;
            const ny = dy / dist;
            
            // Push apart (repulsion)
            const pushForce = overlap * 0.3;
            bubble.vx -= nx * pushForce;
            bubble.vy -= ny * pushForce;
            other.vx += nx * pushForce;
            other.vy += ny * pushForce;
            
            // Organic deformation on collision
            bubble.deformX = 1 + Math.abs(nx) * this.config.organicDeformation;
            bubble.deformY = 1 + Math.abs(ny) * this.config.organicDeformation;
            other.deformX = 1 + Math.abs(nx) * this.config.organicDeformation;
            other.deformY = 1 + Math.abs(ny) * this.config.organicDeformation;
            
            // Pulse effect
            bubble.pulse = 0.5;
            other.pulse = 0.5;
            
            // Fusion effect - temporarily increase size when close
            if (dist < this.config.fusionDistance) {
              const fusionFactor = 1 - dist / this.config.fusionDistance;
              bubble.targetSize = bubble.baseSize * (1 + fusionFactor * 0.5);
              other.targetSize = other.baseSize * (1 + fusionFactor * 0.5);
            }
          }
        }
        
        // Mouse interaction - strong displacement
        if (mouseActive) {
          const dx = bubble.x - mouseGridX;
          const dy = bubble.y - mouseGridY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < mouseRadius && dist > 0.1) {
            const force = Math.pow(1 - dist / mouseRadius, 2) * this.config.mouseForce;
            bubble.vx += (dx / dist) * force * deltaTime;
            bubble.vy += (dy / dist) * force * deltaTime;
            
            // Deform away from cursor
            bubble.deformX = 1 + Math.abs(dx / dist) * this.config.organicDeformation * 2;
            bubble.deformY = 1 + Math.abs(dy / dist) * this.config.organicDeformation * 2;
            bubble.pulse = Math.max(bubble.pulse, force * 0.1);
          }
        }
        
        // Apply velocity with damping
        bubble.x += bubble.vx * deltaTime * 10;
        bubble.y += bubble.vy * deltaTime * 10;
        bubble.vx *= 0.95; // Damping
        bubble.vy *= 0.95;
        
        // Clamp velocity
        const maxVel = 5;
        const vel = Math.sqrt(bubble.vx * bubble.vx + bubble.vy * bubble.vy);
        if (vel > maxVel) {
          bubble.vx = (bubble.vx / vel) * maxVel;
          bubble.vy = (bubble.vy / vel) * maxVel;
        }
        
        // Smooth size transition
        bubble.size += (bubble.targetSize - bubble.size) * 0.1;
        bubble.targetSize = bubble.baseSize; // Reset target
        
        // Decay deformation back to normal
        bubble.deformX += (1 - bubble.deformX) * 0.1;
        bubble.deformY += (1 - bubble.deformY) * 0.1;
        bubble.pulse *= 0.9;
        
        // Wrap around screen edges
        if (bubble.y < -bubble.size * 2) {
          bubble.y = gridRef.rows + bubble.size;
          bubble.x = Math.random() * gridRef.cols;
        }
        if (bubble.y > gridRef.rows + bubble.size * 2) {
          bubble.y = -bubble.size;
        }
        if (bubble.x < -bubble.size * 2) {
          bubble.x = gridRef.cols + bubble.size;
        }
        if (bubble.x > gridRef.cols + bubble.size * 2) {
          bubble.x = -bubble.size;
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
      const charset = globalConfig.densityCharset || globalConfig.charset;
      const color = this.config.palette[bubble.colorIndex];
      const pulseBoost = 1 + bubble.pulse;
      
      const sizeX = bubble.size * bubble.deformX * pulseBoost;
      const sizeY = bubble.size * bubble.deformY * pulseBoost;
      const maxSize = Math.max(sizeX, sizeY);
      
      for (let dy = -maxSize - 1; dy <= maxSize + 1; dy++) {
        for (let dx = -maxSize - 1; dx <= maxSize + 1; dx++) {
          // Ellipse distance with deformation
          const normX = dx / sizeX;
          const normY = dy / sizeY;
          const dist = Math.sqrt(normX * normX + normY * normY);
          
          if (dist > 1.2) continue;
          
          const gx = Math.floor(bubble.x + dx);
          const gy = Math.floor(bubble.y + dy);
          
          if (gx < 0 || gx >= gridRef.cols || gy < 0 || gy >= gridRef.rows) continue;
          
          const idx = gy * gridRef.cols + gx;
          
          // Organic edge with noise
          const edgeNoise = SimplexNoise.noise2D(
            (bubble.x + dx) * 0.3 + this.state.time,
            (bubble.y + dy) * 0.3
          ) * 0.2;
          
          const effectiveDist = dist + edgeNoise;
          if (effectiveDist > 1) continue;
          
          const intensity = Math.pow(1 - effectiveDist, 0.7);
          const charIndex = Math.floor(intensity * (charset.length - 1));
          
          // Blend with existing cell (additive blending for overlaps)
          const existingIntensity = gridRef.cells[idx].intensity;
          const newIntensity = Math.min(1, intensity + existingIntensity * 0.3);
          
          if (newIntensity > existingIntensity) {
            gridRef.cells[idx] = {
              char: charset[Math.min(charIndex, charset.length - 1)],
              color: color,
              intensity: newIntensity
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
   * Neural network visualization with 3D camera movement through the network
   */
  const NeuronsScene = {
    name: 'neurons',
    
    state: {
      time: 0,
      nodes: [],
      connections: [],
      pulses: [],
      camera: { x: 0, y: 0, z: 0, targetX: 0, targetY: 0, targetZ: 0 },
      worldSize: { width: 0, height: 0, depth: 200 }
    },
    
    config: {
      nodeCount: 60,          // More nodes for denser network
      connectionProbability: 0.12,
      pulseSpeed: 12,
      pulseFrequency: 0.08,   // More frequent pulses
      cameraSpeed: 0.5,
      cameraWander: 0.3,
      nodeMinSize: 1.5,
      nodeMaxSize: 4,
      connectionThickness: 2, // Thicker connections
      palette: [
        '#6FA8DC',  // Light blue
        '#9FC5E8',  // Sky blue
        '#76A5AF',  // Teal
        '#A4C2F4',  // Pale blue
        '#B4A7D6',  // Light purple
        '#8E7CC3'   // Medium purple
      ],
      pulseColor: '#FFFFFF',
      connectionColor: '#445588',
      nodeChars: ['o', 'O', '@', '0', '*', '#'],
      connectionChars: {
        horizontal: '─═━',
        vertical: '│║┃',
        diagonal1: '╱/',
        diagonal2: '╲\\',
        cross: '┼╳+'
      },
      // Rendering constants
      minDepth: 10,           // Minimum depth for projection
      maxLineSteps: 100,      // Maximum steps for line drawing
      perspectiveFactor: 400  // Perspective projection factor
    },
    
    // Helper function to wrap coordinates
    wrapCoord(val, max) {
      return ((val % max) + max) % max;
    },
    
    // Project 3D point to 2D screen with perspective
    project(x, y, z, gridRef) {
      const perspective = this.config.perspectiveFactor;
      const cameraZ = this.state.camera.z;
      const relZ = z - cameraZ;
      
      // Avoid division by zero or negative z
      const depth = Math.max(relZ, this.config.minDepth);
      const scale = perspective / (perspective + depth);
      
      const screenX = (x - this.state.camera.x) * scale + gridRef.cols / 2;
      const screenY = (y - this.state.camera.y) * scale + gridRef.rows / 2;
      
      return { x: screenX, y: screenY, scale: scale, depth: depth };
    },
    
    init(gridRef, globalConfig) {
      this.state.time = 0;
      this.state.nodes = [];
      this.state.connections = [];
      this.state.pulses = [];
      this.state.worldSize = {
        width: gridRef.cols * 2,
        height: gridRef.rows * 2,
        depth: 300
      };
      this.state.camera = { 
        x: gridRef.cols / 2, 
        y: gridRef.rows / 2, 
        z: -50,
        targetX: gridRef.cols / 2,
        targetY: gridRef.rows / 2,
        targetZ: -50,
        vx: 0,
        vy: 0,
        vz: 0.3 // Moving forward through the network
      };
      
      const nodeCount = isMobile ? Math.floor(this.config.nodeCount * 0.5) : this.config.nodeCount;
      
      // Create nodes in 3D space
      for (let i = 0; i < nodeCount; i++) {
        this.state.nodes.push({
          x: (Math.random() - 0.5) * this.state.worldSize.width + gridRef.cols / 2,
          y: (Math.random() - 0.5) * this.state.worldSize.height + gridRef.rows / 2,
          z: Math.random() * this.state.worldSize.depth,
          size: this.config.nodeMinSize + Math.random() * (this.config.nodeMaxSize - this.config.nodeMinSize),
          colorIndex: Math.floor(Math.random() * this.config.palette.length),
          brightness: 0.6 + Math.random() * 0.4,
          pulse: 0,
          charIndex: Math.floor(Math.random() * this.config.nodeChars.length)
        });
      }
      
      // Create connections between nearby nodes in 3D
      for (let i = 0; i < this.state.nodes.length; i++) {
        for (let j = i + 1; j < this.state.nodes.length; j++) {
          const dx = this.state.nodes[i].x - this.state.nodes[j].x;
          const dy = this.state.nodes[i].y - this.state.nodes[j].y;
          const dz = this.state.nodes[i].z - this.state.nodes[j].z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          
          const maxDist = Math.max(gridRef.cols, gridRef.rows) * 0.6;
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
      
      // Camera movement - slowly flying through the neural network
      const cam = this.state.camera;
      
      // Wander target with noise
      cam.targetX += SimplexNoise.noise2D(this.state.time * 0.1, 0) * this.config.cameraWander;
      cam.targetY += SimplexNoise.noise2D(0, this.state.time * 0.1) * this.config.cameraWander;
      cam.targetZ += deltaTime * 20; // Constant forward movement
      
      // Wrap camera in Z (loop through network)
      if (cam.targetZ > this.state.worldSize.depth) {
        cam.targetZ = 0;
        cam.z = -50;
        // Regenerate nodes in front
        for (const node of this.state.nodes) {
          if (node.z < cam.z + 20) {
            node.z += this.state.worldSize.depth;
          }
        }
      }
      
      // Smooth camera movement
      cam.x += (cam.targetX - cam.x) * this.config.cameraSpeed * deltaTime * 2;
      cam.y += (cam.targetY - cam.y) * this.config.cameraSpeed * deltaTime * 2;
      cam.z += (cam.targetZ - cam.z) * this.config.cameraSpeed * deltaTime * 2;
      
      // Spawn new pulses
      if (Math.random() < this.config.pulseFrequency && this.state.connections.length > 0) {
        const conn = this.state.connections[Math.floor(Math.random() * this.state.connections.length)];
        this.state.pulses.push({
          connection: conn,
          progress: 0,
          speed: this.config.pulseSpeed + Math.random() * 6,
          reverse: Math.random() > 0.5,
          size: 1 + Math.random()
        });
        
        // Light up connected nodes
        this.state.nodes[conn.from].pulse = 1;
        this.state.nodes[conn.to].pulse = 0.5;
      }
      
      // Update pulses
      this.state.pulses = this.state.pulses.filter(pulse => {
        pulse.progress += (deltaTime * pulse.speed) / pulse.connection.length;
        
        // Light up nodes as pulse passes
        if (pulse.progress > 0.9) {
          const targetNode = pulse.reverse ? pulse.connection.from : pulse.connection.to;
          this.state.nodes[targetNode].pulse = Math.max(this.state.nodes[targetNode].pulse, 0.8);
        }
        
        return pulse.progress < 1;
      });
      
      // Decay node pulses
      for (const node of this.state.nodes) {
        node.pulse *= 0.92;
      }
      
      // Clear grid
      for (let i = 0; i < gridRef.cells.length; i++) {
        gridRef.cells[i] = { char: ' ', color: globalConfig.backgroundColor, intensity: 0 };
      }
      
      // Sort nodes by depth for proper rendering (back to front)
      const sortedNodes = this.state.nodes
        .map((node, idx) => ({ node, idx }))
        .sort((a, b) => b.node.z - a.node.z);
      
      // Render connections (behind nodes)
      for (const conn of this.state.connections) {
        this.renderConnection(gridRef, conn, globalConfig);
      }
      
      // Render pulses
      for (const pulse of this.state.pulses) {
        this.renderPulse(gridRef, pulse, globalConfig);
      }
      
      // Render nodes (front to back, so closer ones override)
      for (const { node } of sortedNodes) {
        this.renderNode(gridRef, node, globalConfig);
      }
    },
    
    renderConnection(gridRef, conn, globalConfig) {
      const nodeA = this.state.nodes[conn.from];
      const nodeB = this.state.nodes[conn.to];
      
      const projA = this.project(nodeA.x, nodeA.y, nodeA.z, gridRef);
      const projB = this.project(nodeB.x, nodeB.y, nodeB.z, gridRef);
      
      // Skip if behind camera or too far
      if (projA.depth < 0 || projB.depth < 0) return;
      if (projA.depth > 250 && projB.depth > 250) return;
      
      // Bresenham-like line drawing
      const dx = projB.x - projA.x;
      const dy = projB.y - projA.y;
      const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);
      
      if (steps > this.config.maxLineSteps) return; // Skip very long lines
      
      const avgDepth = (projA.depth + projB.depth) / 2;
      const depthFade = Math.max(0, 1 - avgDepth / 200);
      
      for (let i = 0; i <= steps; i += 1) {
        const t = i / steps;
        const x = Math.floor(projA.x + dx * t);
        const y = Math.floor(projA.y + dy * t);
        
        if (x < 0 || x >= gridRef.cols || y < 0 || y >= gridRef.rows) continue;
        
        const idx = y * gridRef.cols + x;
        
        // Determine connection character based on angle
        const angle = Math.atan2(dy, dx);
        let char;
        const absAngle = Math.abs(angle);
        if (absAngle < Math.PI / 6 || absAngle > 5 * Math.PI / 6) {
          char = this.config.connectionChars.horizontal[0];
        } else if (absAngle > Math.PI / 3 && absAngle < 2 * Math.PI / 3) {
          char = this.config.connectionChars.vertical[0];
        } else if (angle > 0) {
          char = angle < Math.PI / 2 ? this.config.connectionChars.diagonal2[0] : this.config.connectionChars.diagonal1[0];
        } else {
          char = angle > -Math.PI / 2 ? this.config.connectionChars.diagonal1[0] : this.config.connectionChars.diagonal2[0];
        }
        
        const intensity = 0.3 * depthFade;
        if (gridRef.cells[idx].intensity < intensity) {
          gridRef.cells[idx] = {
            char: char,
            color: this.config.connectionColor,
            intensity: intensity
          };
        }
      }
    },
    
    renderPulse(gridRef, pulse, globalConfig) {
      const nodeA = this.state.nodes[pulse.connection.from];
      const nodeB = this.state.nodes[pulse.connection.to];
      
      const progress = pulse.reverse ? 1 - pulse.progress : pulse.progress;
      
      // Interpolate position in 3D
      const px = nodeA.x + (nodeB.x - nodeA.x) * progress;
      const py = nodeA.y + (nodeB.y - nodeA.y) * progress;
      const pz = nodeA.z + (nodeB.z - nodeA.z) * progress;
      
      const proj = this.project(px, py, pz, gridRef);
      
      if (proj.depth < 0 || proj.depth > 200) return;
      
      const gx = Math.floor(proj.x);
      const gy = Math.floor(proj.y);
      
      const depthFade = Math.max(0, 1 - proj.depth / 180);
      const size = Math.ceil(pulse.size * proj.scale * 2);
      
      // Draw pulse with glow
      for (let dy = -size; dy <= size; dy++) {
        for (let dx = -size; dx <= size; dx++) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > size) continue;
          
          const x = gx + dx;
          const y = gy + dy;
          
          if (x < 0 || x >= gridRef.cols || y < 0 || y >= gridRef.rows) continue;
          
          const idx = y * gridRef.cols + x;
          const intensity = (1 - dist / size) * depthFade;
          
          if (intensity > gridRef.cells[idx].intensity) {
            const char = dist < size * 0.3 ? '@' : (dist < size * 0.6 ? '*' : '+');
            gridRef.cells[idx] = {
              char: char,
              color: this.config.pulseColor,
              intensity: intensity
            };
          }
        }
      }
    },
    
    renderNode(gridRef, node, globalConfig) {
      const proj = this.project(node.x, node.y, node.z, gridRef);
      
      if (proj.depth < 0 || proj.depth > 220) return;
      
      const gx = Math.floor(proj.x);
      const gy = Math.floor(proj.y);
      
      if (gx < -5 || gx >= gridRef.cols + 5 || gy < -5 || gy >= gridRef.rows + 5) return;
      
      const depthFade = Math.max(0.1, 1 - proj.depth / 200);
      const size = Math.max(1, Math.ceil(node.size * proj.scale));
      const color = this.config.palette[node.colorIndex];
      const pulseBoost = 1 + node.pulse * 2;
      
      // Draw node as filled circle
      for (let dy = -size; dy <= size; dy++) {
        for (let dx = -size; dx <= size; dx++) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > size) continue;
          
          const x = gx + dx;
          const y = gy + dy;
          
          if (x < 0 || x >= gridRef.cols || y < 0 || y >= gridRef.rows) continue;
          
          const idx = y * gridRef.cols + x;
          const intensity = (1 - dist / (size + 0.5)) * depthFade * node.brightness * pulseBoost;
          
          if (intensity > gridRef.cells[idx].intensity) {
            // Choose character based on intensity and size
            let char;
            if (dist < size * 0.3) {
              char = node.pulse > 0.3 ? '@' : this.config.nodeChars[node.charIndex];
            } else if (dist < size * 0.6) {
              char = node.pulse > 0.3 ? 'O' : 'o';
            } else {
              char = node.pulse > 0.3 ? '*' : '.';
            }
            
            // Pulse color override
            const displayColor = node.pulse > 0.3 ? this.config.pulseColor : color;
            
            gridRef.cells[idx] = {
              char: char,
              color: displayColor,
              intensity: Math.min(1, intensity)
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
   * Scene: Eyes
   * Multiple ASCII eyes randomly distributed that follow the cursor in 3D
   */
  const EyesScene = {
    name: 'eyes',
    
    state: {
      time: 0,
      eyes: [],
      idleAngle: 0
    },
    
    config: {
      eyeCount: 12,          // More eyes
      eyeMinRadius: 4,
      eyeMaxRadius: 8,
      pupilRadiusRatio: 0.35, // Pupil size relative to eye
      maxPupilOffset: 0.6,   // Maximum pupil offset as ratio of eye radius
      trackingSpeed: 0.12,
      idleSpeed: 0.3,
      eyeDepthRange: 100,    // Z-depth range for parallax effect
      // Eye tracking constants
      maxEyeRotation: Math.PI / 3,  // 60 degrees max rotation
      eyeTrackingDistance: 40,      // Distance factor for tracking
      eyeMinDistanceRatio: 0.15,    // Minimum distance between eyes as ratio of screen
      palette: {
        outline: '#AAAAAA',
        sclera: '#DDDDDD',
        iris: ['#558855', '#5588AA', '#885555', '#666688', '#888866'],
        pupil: '#111111',
        highlight: '#FFFFFF'
      },
      eyeChars: {
        pupil: ['@', '#', '8', '●'],
        iris: ['O', '0', 'o', '◉'],
        sclera: ['.', '°', '·'],
        outline: {
          top: ['^', '~', '-'],
          bottom: ['_', '~', '-'],
          left: ['(', '[', '{'],
          right: [')', ']', '}'],
          corners: ['/', '\\', '`', "'"]
        },
        blink: ['-', '=', '_']
      }
    },
    
    init(gridRef, globalConfig) {
      this.state.time = 0;
      this.state.eyes = [];
      this.state.idleAngle = 0;
      
      const count = isMobile ? Math.min(6, this.config.eyeCount) : this.config.eyeCount;
      
      // Distribute eyes randomly across the screen with some constraints
      const minDistance = Math.min(gridRef.cols, gridRef.rows) * this.config.eyeMinDistanceRatio;
      
      for (let i = 0; i < count; i++) {
        let attempts = 0;
        let x, y, valid;
        
        do {
          x = this.config.eyeMaxRadius + Math.random() * (gridRef.cols - this.config.eyeMaxRadius * 2);
          y = this.config.eyeMaxRadius + Math.random() * (gridRef.rows - this.config.eyeMaxRadius * 2);
          valid = true;
          
          // Check distance from other eyes
          for (const eye of this.state.eyes) {
            const dx = eye.x - x;
            const dy = eye.y - y;
            if (Math.sqrt(dx * dx + dy * dy) < minDistance) {
              valid = false;
              break;
            }
          }
          attempts++;
        } while (!valid && attempts < 50);
        
        const radius = this.config.eyeMinRadius + Math.random() * (this.config.eyeMaxRadius - this.config.eyeMinRadius);
        
        this.state.eyes.push({
          x: x,
          y: y,
          z: Math.random() * this.config.eyeDepthRange, // Depth for parallax
          radius: radius,
          pupilRadius: radius * this.config.pupilRadiusRatio,
          // Current pupil position (offset from center)
          pupilOffsetX: 0,
          pupilOffsetY: 0,
          // Target pupil position
          targetOffsetX: 0,
          targetOffsetY: 0,
          // 3D rotation angles
          rotationX: 0,  // Pitch - looking up/down
          rotationY: 0,  // Yaw - looking left/right
          targetRotationX: 0,
          targetRotationY: 0,
          // Blinking
          blinkTimer: 2 + Math.random() * 5,
          blinkProgress: 0, // 0 = open, 1 = closed
          isBlinking: false,
          // Visual variation
          irisColorIndex: Math.floor(Math.random() * this.config.palette.iris.length),
          charVariant: Math.floor(Math.random() * 3)
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
        if (eye.blinkTimer <= 0 && !eye.isBlinking) {
          eye.isBlinking = true;
          eye.blinkTimer = 3 + Math.random() * 5;
        }
        
        // Update blink animation
        if (eye.isBlinking) {
          eye.blinkProgress += deltaTime * 8; // Speed of blink
          if (eye.blinkProgress >= 2) { // Full blink cycle (0->1->0)
            eye.isBlinking = false;
            eye.blinkProgress = 0;
          }
        }
        
        // Calculate 3D look direction
        if (mouseActive) {
          const dx = mouseGridX - eye.x;
          const dy = mouseGridY - eye.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist > 0) {
            // Calculate rotation angles for 3D effect
            // Normalize and convert to rotation angles
            const maxRotation = this.config.maxEyeRotation;
            const distFactor = Math.min(1, dist / this.config.eyeTrackingDistance);
            
            // Yaw (left-right rotation)
            eye.targetRotationY = Math.atan2(dx, 30) * distFactor;
            eye.targetRotationY = Math.max(-maxRotation, Math.min(maxRotation, eye.targetRotationY));
            
            // Pitch (up-down rotation)
            eye.targetRotationX = Math.atan2(dy, 30) * distFactor;
            eye.targetRotationX = Math.max(-maxRotation, Math.min(maxRotation, eye.targetRotationX));
            
            // Pupil offset based on rotation
            const maxOffset = eye.radius * this.config.maxPupilOffset;
            eye.targetOffsetX = Math.sin(eye.targetRotationY) * maxOffset;
            eye.targetOffsetY = Math.sin(eye.targetRotationX) * maxOffset;
          }
        } else {
          // Idle movement - slow wandering gaze
          const idleX = Math.cos(this.state.idleAngle + eye.x * 0.1) * 0.3;
          const idleY = Math.sin(this.state.idleAngle * 0.7 + eye.y * 0.1) * 0.2;
          
          eye.targetRotationY = idleX * Math.PI / 6;
          eye.targetRotationX = idleY * Math.PI / 6;
          
          const maxOffset = eye.radius * this.config.maxPupilOffset * 0.5;
          eye.targetOffsetX = Math.sin(eye.targetRotationY) * maxOffset;
          eye.targetOffsetY = Math.sin(eye.targetRotationX) * maxOffset;
        }
        
        // Smooth interpolation for rotation
        eye.rotationX += (eye.targetRotationX - eye.rotationX) * this.config.trackingSpeed;
        eye.rotationY += (eye.targetRotationY - eye.rotationY) * this.config.trackingSpeed;
        
        // Smooth interpolation for pupil
        eye.pupilOffsetX += (eye.targetOffsetX - eye.pupilOffsetX) * this.config.trackingSpeed;
        eye.pupilOffsetY += (eye.targetOffsetY - eye.pupilOffsetY) * this.config.trackingSpeed;
      }
      
      // Clear grid
      for (let i = 0; i < gridRef.cells.length; i++) {
        gridRef.cells[i] = { char: ' ', color: globalConfig.backgroundColor, intensity: 0 };
      }
      
      // Render eyes (sorted by z for proper depth)
      const sortedEyes = [...this.state.eyes].sort((a, b) => b.z - a.z);
      for (const eye of sortedEyes) {
        this.renderEye(gridRef, eye, globalConfig);
      }
    },
    
    renderEye(gridRef, eye, globalConfig) {
      const radius = eye.radius;
      const palette = this.config.palette;
      const chars = this.config.eyeChars;
      
      // Calculate blink factor (0 = open, 1 = closed)
      let blinkFactor = 0;
      if (eye.isBlinking) {
        // Smooth blink: 0->1->0
        blinkFactor = eye.blinkProgress < 1 ? eye.blinkProgress : 2 - eye.blinkProgress;
      }
      
      // 3D deformation based on rotation
      const cosY = Math.cos(eye.rotationY);
      const cosX = Math.cos(eye.rotationX);
      
      // Draw eye shape
      for (let dy = -radius - 2; dy <= radius + 2; dy++) {
        for (let dx = -radius - 3; dx <= radius + 3; dx++) {
          const gx = Math.floor(eye.x + dx);
          const gy = Math.floor(eye.y + dy);
          
          if (gx < 0 || gx >= gridRef.cols || gy < 0 || gy >= gridRef.rows) continue;
          
          const idx = gy * gridRef.cols + gx;
          
          // 3D ellipse with rotation foreshortening
          const scaleX = 1.3 * cosY; // Horizontal compression when looking sideways
          const scaleY = 0.9 * cosX; // Vertical compression when looking up/down (blink reduces this)
          
          // Apply blink (squish vertically)
          const effectiveScaleY = scaleY * (1 - blinkFactor * 0.9);
          
          const normalizedX = dx / (radius * scaleX);
          const normalizedY = dy / (radius * effectiveScaleY);
          const distFromCenter = normalizedX * normalizedX + normalizedY * normalizedY;
          
          // Completely closed eye during blink
          if (blinkFactor > 0.8) {
            if (Math.abs(dy) <= 1 && Math.abs(dx) <= radius * scaleX) {
              gridRef.cells[idx] = {
                char: chars.blink[eye.charVariant % chars.blink.length],
                color: palette.outline,
                intensity: 0.9
              };
            }
            continue;
          }
          
          // Calculate pupil distance
          const pupilX = eye.pupilOffsetX;
          const pupilY = eye.pupilOffsetY * (1 - blinkFactor * 0.5);
          const distFromPupil = Math.sqrt((dx - pupilX) ** 2 + (dy - pupilY) ** 2);
          
          // Iris size varies with 3D rotation (looks like it shrinks when looking away)
          const irisRadius = eye.pupilRadius * 2.5 * Math.max(0.6, cosY * cosX);
          const pupilSize = eye.pupilRadius * Math.max(0.5, cosY * cosX);
          
          if (distFromPupil < pupilSize * 0.5) {
            // Pupil center - darkest
            gridRef.cells[idx] = {
              char: chars.pupil[eye.charVariant % chars.pupil.length],
              color: palette.pupil,
              intensity: 1
            };
          } else if (distFromPupil < pupilSize) {
            // Pupil edge
            gridRef.cells[idx] = {
              char: '#',
              color: palette.pupil,
              intensity: 0.95
            };
          } else if (distFromPupil < irisRadius * 0.6) {
            // Iris inner
            gridRef.cells[idx] = {
              char: chars.iris[eye.charVariant % chars.iris.length],
              color: palette.iris[eye.irisColorIndex],
              intensity: 0.85
            };
          } else if (distFromPupil < irisRadius) {
            // Iris outer
            gridRef.cells[idx] = {
              char: 'o',
              color: palette.iris[eye.irisColorIndex],
              intensity: 0.7
            };
          } else if (distFromCenter < 0.75) {
            // Sclera (white of eye)
            gridRef.cells[idx] = {
              char: chars.sclera[eye.charVariant % chars.sclera.length],
              color: palette.sclera,
              intensity: 0.5
            };
          } else if (distFromCenter < 1.15) {
            // Eye outline
            let outlineChar;
            
            // Determine outline character based on position
            const absNormX = Math.abs(normalizedX);
            const absNormY = Math.abs(normalizedY);
            
            if (absNormY > absNormX * 1.5) {
              // Top or bottom
              outlineChar = normalizedY < 0 ? 
                chars.outline.top[eye.charVariant % chars.outline.top.length] :
                chars.outline.bottom[eye.charVariant % chars.outline.bottom.length];
            } else if (absNormX > absNormY * 1.5) {
              // Left or right
              outlineChar = normalizedX < 0 ?
                chars.outline.left[eye.charVariant % chars.outline.left.length] :
                chars.outline.right[eye.charVariant % chars.outline.right.length];
            } else {
              // Corners
              if (normalizedX < 0 && normalizedY < 0) outlineChar = '/';
              else if (normalizedX > 0 && normalizedY < 0) outlineChar = '\\';
              else if (normalizedX < 0 && normalizedY > 0) outlineChar = '\\';
              else outlineChar = '/';
            }
            
            gridRef.cells[idx] = {
              char: outlineChar,
              color: palette.outline,
              intensity: 0.6
            };
          }
          
          // Add highlight reflection
          const highlightX = pupilX - eye.pupilRadius * 0.8;
          const highlightY = pupilY - eye.pupilRadius * 0.8;
          const distFromHighlight = Math.sqrt((dx - highlightX) ** 2 + (dy - highlightY) ** 2);
          
          if (distFromHighlight < 1.2 && blinkFactor < 0.3) {
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
      // Store current cell positions for morph transition
      const morphCells = [];
      for (let y = 0; y < grid.rows; y++) {
        for (let x = 0; x < grid.cols; x++) {
          const idx = y * grid.cols + x;
          const cell = grid.cells[idx];
          if (cell.char !== ' ' && cell.intensity > 0.1) {
            morphCells.push({
              fromX: x,
              fromY: y,
              toX: x, // Will be updated once new scene renders
              toY: y,
              currentX: x,
              currentY: y,
              char: cell.char,
              color: cell.color,
              intensity: cell.intensity,
              vx: (Math.random() - 0.5) * 2, // Random initial velocity
              vy: (Math.random() - 0.5) * 2,
              assigned: false
            });
          }
        }
      }
      
      // Start transition
      transitionState = {
        fromScene: currentScene,
        toScene: newScene,
        fromGrid: JSON.parse(JSON.stringify(grid.cells)),
        morphCells: morphCells,
        progress: 0,
        duration: config.transitionDuration,
        type: config.transitionType,
        targetsAssigned: false
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
   * Update transition between scenes - supports morph (fluid character movement)
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
    
    // Update new scene to get target positions
    transitionState.toScene.update(grid, config, performance.now() / 1000, deltaTime);
    
    const progress = transitionState.progress;
    
    if (transitionState.type === 'morph') {
      // Morph transition - fluid character movement
      const morphCells = transitionState.morphCells;
      
      // Assign target positions on first frame
      if (!transitionState.targetsAssigned) {
        // Collect target cells from new scene
        const targetCells = [];
        for (let y = 0; y < grid.rows; y++) {
          for (let x = 0; x < grid.cols; x++) {
            const idx = y * grid.cols + x;
            const cell = grid.cells[idx];
            if (cell.char !== ' ' && cell.intensity > 0.1) {
              targetCells.push({ x, y, char: cell.char, color: cell.color, intensity: cell.intensity, assigned: false });
            }
          }
        }
        
        // Match morphCells to nearest targetCells
        for (const mc of morphCells) {
          let minDist = Infinity;
          let closest = null;
          
          for (const tc of targetCells) {
            if (tc.assigned) continue;
            const dx = tc.x - mc.fromX;
            const dy = tc.y - mc.fromY;
            const dist = dx * dx + dy * dy;
            if (dist < minDist) {
              minDist = dist;
              closest = tc;
            }
          }
          
          if (closest) {
            mc.toX = closest.x;
            mc.toY = closest.y;
            mc.targetChar = closest.char;
            mc.targetColor = closest.color;
            mc.targetIntensity = closest.intensity;
            closest.assigned = true;
            mc.assigned = true;
          } else {
            // No target - fade out (scatter)
            mc.toX = mc.fromX + (Math.random() - 0.5) * grid.cols * 0.5;
            mc.toY = mc.fromY + (Math.random() - 0.5) * grid.rows * 0.5;
            mc.fadeOut = true;
          }
        }
        
        // Add new cells that weren't matched
        for (const tc of targetCells) {
          if (!tc.assigned) {
            morphCells.push({
              fromX: tc.x + (Math.random() - 0.5) * grid.cols * 0.5,
              fromY: tc.y + (Math.random() - 0.5) * grid.rows * 0.5,
              toX: tc.x,
              toY: tc.y,
              currentX: tc.x + (Math.random() - 0.5) * grid.cols * 0.5,
              currentY: tc.y + (Math.random() - 0.5) * grid.rows * 0.5,
              char: tc.char,
              color: tc.color,
              intensity: 0,
              targetChar: tc.char,
              targetColor: tc.color,
              targetIntensity: tc.intensity,
              vx: 0,
              vy: 0,
              fadeIn: true,
              assigned: true
            });
          }
        }
        
        transitionState.targetsAssigned = true;
      }
      
      // Ease function for smooth animation
      const easeInOutCubic = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const eased = easeInOutCubic(progress);
      
      // Clear grid for rendering
      for (let i = 0; i < grid.cells.length; i++) {
        grid.cells[i] = { char: ' ', color: config.backgroundColor, intensity: 0 };
      }
      
      // Update and render morph cells
      for (const mc of morphCells) {
        // Interpolate position with easing
        mc.currentX = mc.fromX + (mc.toX - mc.fromX) * eased;
        mc.currentY = mc.fromY + (mc.toY - mc.fromY) * eased;
        
        // Add some swirl/turbulence for organic feel
        const turbulence = Math.sin(progress * Math.PI) * (1 - progress);
        const noise = SimplexNoise.noise2D(mc.currentX * 0.1, mc.currentY * 0.1 + progress * 5);
        mc.currentX += noise * turbulence * 3;
        mc.currentY += Math.cos(progress * Math.PI * 2 + mc.fromX) * turbulence * 2;
        
        // Calculate display position
        const gx = Math.floor(mc.currentX);
        const gy = Math.floor(mc.currentY);
        
        if (gx >= 0 && gx < grid.cols && gy >= 0 && gy < grid.rows) {
          const idx = gy * grid.cols + gx;
          
          // Interpolate intensity
          let intensity = mc.intensity;
          if (mc.fadeOut) {
            intensity = mc.intensity * (1 - progress);
          } else if (mc.fadeIn) {
            intensity = mc.targetIntensity * progress;
          } else {
            intensity = mc.intensity + (mc.targetIntensity - mc.intensity) * progress;
          }
          
          // Interpolate color if different
          let color = mc.color;
          if (mc.targetColor && progress > 0.5) {
            color = mc.targetColor;
          }
          
          // Choose character - transition at midpoint
          let char = mc.char;
          if (mc.targetChar && progress > 0.4 + Math.random() * 0.2) {
            char = mc.targetChar;
          }
          
          if (intensity > grid.cells[idx].intensity) {
            grid.cells[idx] = {
              char: char,
              color: color,
              intensity: Math.min(1, intensity)
            };
          }
        }
      }
    } else if (transitionState.type === 'glitch') {
      // Glitch transition - mix characters randomly
      const glitchChars = ['█', '▓', '▒', '░', '/', '\\', '|', '-', '+', '*'];
      
      for (let i = 0; i < grid.cells.length; i++) {
        if (Math.random() < 0.3 * (1 - Math.abs(progress - 0.5) * 2)) {
          grid.cells[i].char = glitchChars[Math.floor(Math.random() * glitchChars.length)];
          grid.cells[i].color = Math.random() > 0.5 ? '#FFFFFF' : grid.cells[i].color;
        }
      }
      transitionState.opacity = progress;
    } else {
      // Default fade transition
      transitionState.opacity = progress;
    }
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
    
    // Set font - use specific monospace fonts for consistent ASCII rendering
    ctx.font = `${config.cellSize * 0.9}px "Courier New", Consolas, "Liberation Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Calculate opacity for transition (not used for morph transitions)
    let globalOpacity = 1;
    if (transitionState && transitionState.type !== 'morph' && transitionState.opacity !== undefined) {
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
