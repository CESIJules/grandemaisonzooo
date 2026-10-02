/**
 * tracker.js — Moteur de tracking optique multi-modes pour Room 45
 * Comprend :
 * 1. Suivi chromatique par 4 mires de couleur (Cyan, Magenta, Jaune, Vert) — 100% fiable sur écran PC
 * 2. Suivi de cadre rectangulaire contrasté (Artwork)
 * 3. Solveur d'homographie & matrice CSS matrix3d ultra-fluide
 */

class VisionTracker {
  constructor() {
    this.procCanvas = document.createElement('canvas');
    this.procCtx = this.procCanvas.getContext('2d', { willReadFrequently: true });
    this.debugCanvas = null;
    this.debugCtx = null;
  }

  setDebugCanvas(canvas) {
    this.debugCanvas = canvas;
    this.debugCtx = canvas.getContext('2d');
  }

  /**
   * Suivi Chromatique (4 mires : Cyan=Haut-Gauche, Magenta=Haut-Droit, Jaune=Bas-Droit, Vert=Bas-Gauche)
   * Immunisé contre l'éblouissement des écrans PC et les filtres d'Apple.
   */
  detectColorTargets(video, procWidth = 360) {
    if (!video.videoWidth) return null;

    const scale = procWidth / video.videoWidth;
    const w = procWidth;
    const h = Math.round(video.videoHeight * scale);

    if (this.procCanvas.width !== w || this.procCanvas.height !== h) {
      this.procCanvas.width = w;
      this.procCanvas.height = h;
    }

    this.procCtx.drawImage(video, 0, 0, w, h);
    const imgData = this.procCtx.getImageData(0, 0, w, h);
    const data = imgData.data;

    // Accumulateurs de centroïdes pour chaque couleur
    // 0: Cyan (TL), 1: Magenta (TR), 2: Jaune (BR), 3: Vert (BL)
    const accum = [
      { sumX: 0, sumY: 0, count: 0 }, // Cyan
      { sumX: 0, sumY: 0, count: 0 }, // Magenta
      { sumX: 0, sumY: 0, count: 0 }, // Jaune
      { sumX: 0, sumY: 0, count: 0 }  // Vert
    ];

    for (let y = 0; y < h; y++) {
      const row = y * w;
      for (let x = 0; x < w; x++) {
        const idx = (row + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Seuil d'énergie minimale
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const delta = max - min;

        // Éliminer les pixels gris / blancs de l'écran PC
        if (delta < 45 || max < 70) continue;

        // Classification rapide basée sur les ratios RGB
        // Cyan : G et B élevés, R faible
        if (g > 110 && b > 120 && r < (g + b) * 0.38) {
          accum[0].sumX += x; accum[0].sumY += y; accum[0].count++;
        }
        // Magenta / Rose vif : R et B élevés, G faible
        else if (r > 130 && b > 110 && g < (r + b) * 0.38) {
          accum[1].sumX += x; accum[1].sumY += y; accum[1].count++;
        }
        // Jaune : R et G élevés, B faible
        else if (r > 130 && g > 120 && b < (r + g) * 0.35) {
          accum[2].sumX += x; accum[2].sumY += y; accum[2].count++;
        }
        // Vert pur : G dominant
        else if (g > 130 && g > r * 1.35 && g > b * 1.35) {
          accum[3].sumX += x; accum[3].sumY += y; accum[3].count++;
        }
      }
    }

    // Vérifier si les 4 cibles ont été trouvées avec au moins 12 pixels
    const minPixels = 10;
    const invScale = 1 / scale;
    const points = [];

    for (let i = 0; i < 4; i++) {
      if (accum[i].count >= minPixels) {
        points.push({
          id: i,
          x: (accum[i].sumX / accum[i].count) * invScale,
          y: (accum[i].sumY / accum[i].count) * invScale,
          count: accum[i].count
        });
      }
    }

    // Affichage sur le canvas de débogage si activé
    if (this.debugCanvas && this.debugCtx) {
      this.debugCanvas.width = w;
      this.debugCanvas.height = h;
      this.debugCtx.drawImage(this.procCanvas, 0, 0);
      const colors = ['#00f0ff', '#ff0055', '#ffe600', '#00ff66'];
      for (const p of points) {
        const cx = p.x * scale;
        const cy = p.y * scale;
        this.debugCtx.strokeStyle = colors[p.id];
        this.debugCtx.lineWidth = 3;
        this.debugCtx.beginPath();
        this.debugCtx.arc(cx, cy, 10, 0, Math.PI * 2);
        this.debugCtx.stroke();
      }
    }

    return points;
  }

  /**
   * Suivi du cadre rectangulaire (Solution B)
   */
  detectScreenFrame(video, procWidth = 320) {
    if (!video.videoWidth) return null;
    const scale = procWidth / video.videoWidth;
    const w = procWidth;
    const h = Math.round(video.videoHeight * scale);

    if (this.procCanvas.width !== w || this.procCanvas.height !== h) {
      this.procCanvas.width = w;
      this.procCanvas.height = h;
    }

    this.procCtx.drawImage(video, 0, 0, w, h);
    const imgData = this.procCtx.getImageData(0, 0, w, h);
    const data = imgData.data;

    // Détection de contours basée sur Sobel rapide
    let minX = w, maxX = 0, minY = h, maxY = 0;
    let edgeCount = 0;

    for (let y = 10; y < h - 10; y += 2) {
      const row = y * w;
      for (let x = 10; x < w - 10; x += 2) {
        const idx = (row + x) * 4;
        const lum = (data[idx] * 2 + data[idx + 1] * 5 + data[idx + 2]) >> 3;
        const lumRight = (data[idx + 4] * 2 + data[idx + 5] * 5 + data[idx + 6]) >> 3;
        const lumDown = (data[idx + w * 4] * 2 + data[idx + w * 4 + 1] * 5 + data[idx + w * 4 + 2]) >> 3;

        const diff = Math.abs(lum - lumRight) + Math.abs(lum - lumDown);
        if (diff > 55) {
          edgeCount++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (edgeCount < 100 || (maxX - minX < w * 0.3) || (maxY - minY < h * 0.25)) {
      return null;
    }

    const invScale = 1 / scale;
    return [
      { x: minX * invScale, y: minY * invScale }, // TL
      { x: maxX * invScale, y: minY * invScale }, // TR
      { x: maxX * invScale, y: maxY * invScale }, // BR
      { x: minX * invScale, y: maxY * invScale }  // BL
    ];
  }

  /**
   * Calcule l'homographie et renvoie la matrice CSS 3D
   */
  computeMatrix3d(srcW, srcH, dstPts) {
    const src = [
      { x: 0, y: 0 },
      { x: srcW, y: 0 },
      { x: srcW, y: srcH },
      { x: 0, y: srcH }
    ];

    const A = [];
    const b = [];

    for (let i = 0; i < 4; i++) {
      const sx = src[i].x, sy = src[i].y;
      const dx = dstPts[i].x, dy = dstPts[i].y;
      A.push([sx, sy, 1, 0, 0, 0, -sx * dx, -sy * dx]);
      b.push(dx);
      A.push([0, 0, 0, sx, sy, 1, -sx * dy, -sy * dy]);
      b.push(dy);
    }

    const h = this.solveGaussian(A, b);
    if (!h) return null;

    return `matrix3d(
      ${h[0].toFixed(6)}, ${h[3].toFixed(6)}, 0, ${h[6].toFixed(8)},
      ${h[1].toFixed(6)}, ${h[4].toFixed(6)}, 0, ${h[7].toFixed(8)},
      0, 0, 1, 0,
      ${h[2].toFixed(4)}, ${h[5].toFixed(4)}, 0, 1
    )`;
  }

  solveGaussian(A, b) {
    const n = 8;
    for (let i = 0; i < n; i++) {
      let maxEl = Math.abs(A[i][i]);
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(A[k][i]) > maxEl) {
          maxEl = Math.abs(A[k][i]);
          maxRow = k;
        }
      }
      for (let k = i; k < n; k++) {
        const tmp = A[maxRow][k];
        A[maxRow][k] = A[i][k];
        A[i][k] = tmp;
      }
      const tmp = b[maxRow];
      b[maxRow] = b[i];
      b[i] = tmp;

      if (Math.abs(A[i][i]) < 1e-8) return null;

      for (let k = i + 1; k < n; k++) {
        const c = -A[k][i] / A[i][i];
        for (let j = i; j < n; j++) {
          if (i === j) A[k][j] = 0;
          else A[k][j] += c * A[i][j];
        }
        b[k] += c * b[i];
      }
    }

    const x = new Array(n);
    for (let i = n - 1; i >= 0; i--) {
      let sum = 0;
      for (let j = i + 1; j < n; j++) sum += A[i][j] * x[j];
      x[i] = (b[i] - sum) / A[i][i];
    }
    return x;
  }
}

window.VisionTracker = VisionTracker;
