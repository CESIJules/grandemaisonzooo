/**
 * aruco.js — Moteur de tracking ArUco 4x4 & solveur d'homographie en JavaScript pur
 * Optimisé pour WebAR mobile (iPhone / Safari / Android) à 60 FPS.
 * Aucun framework externe requis.
 */

// ── Dictionnaire ArUco 4x4 (4 marqueurs distincts pour les 4 coins) ──────────
// Représentation binaire 4x4 : chaque ligne est un entier sur 4 bits
const ARUCO_4X4_DICTS = {
  0: [ [1,0,0,0], [1,0,1,1], [0,1,1,0], [1,0,1,0] ], // Coin Haut-Gauche (ID 0)
  1: [ [0,1,1,0], [1,0,0,1], [1,0,1,0], [0,1,0,1] ], // Coin Haut-Droit  (ID 1)
  2: [ [1,1,0,1], [0,1,0,0], [1,0,0,1], [1,1,1,0] ], // Coin Bas-Droit   (ID 2)
  3: [ [0,0,1,1], [1,1,0,0], [0,1,0,1], [1,0,1,1] ]  // Coin Bas-Gauche  (ID 3)
};

class ArUcoEngine {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this.subCanvas = document.createElement('canvas');
    this.subCanvas.width = 36;
    this.subCanvas.height = 36;
    this.subCtx = this.subCanvas.getContext('2d', { willReadFrequently: true });
  }

  /**
   * Dessine un marqueur ArUco dans un canvas HTML
   */
  static drawMarker(canvas, id, size = 120) {
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const bits = ARUCO_4X4_DICTS[id];
    if (!bits) return;

    const cellSize = size / 6; // 4x4 bits intérieurs + bordure de 1 bit noir

    // Fond blanc
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    // Bordure noire (1 bit tout autour)
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cellSize, cellSize, size - cellSize * 2, size - cellSize * 2);

    // Grille intérieure 4x4
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        ctx.fillStyle = bits[r][c] === 1 ? '#ffffff' : '#000000';
        ctx.fillRect((c + 1) * cellSize, (r + 1) * cellSize, cellSize, cellSize);
      }
    }
  }

  /**
   * Détecte les marqueurs ArUco dans une image vidéo
   */
  detect(videoElement, processWidth = 640) {
    if (!videoElement.videoWidth) return [];

    const scale = processWidth / videoElement.videoWidth;
    const w = processWidth;
    const h = Math.round(videoElement.videoHeight * scale);

    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }

    // Dessiner la frame redimensionnée
    this.ctx.drawImage(videoElement, 0, 0, w, h);
    const imgData = this.ctx.getImageData(0, 0, w, h);
    const gray = this.toGrayscale(imgData);
    const binary = this.adaptiveThreshold(gray, w, h);
    const contours = this.findContours(binary, w, h);
    const candidates = this.filterPolygons(contours, w, h);

    const detectedMarkers = [];
    const invScale = 1 / scale;

    for (const quad of candidates) {
      const marker = this.identifyMarker(gray, w, h, quad);
      if (marker !== null) {
        // Remettre les coordonnées à l'échelle vidéo d'origine
        const scaledCorners = marker.corners.map(pt => ({
          x: pt.x * invScale,
          y: pt.y * invScale
        }));
        detectedMarkers.push({
          id: marker.id,
          rotation: marker.rotation,
          corners: scaledCorners
        });
      }
    }

    return detectedMarkers;
  }

  toGrayscale(imgData) {
    const data = imgData.data;
    const len = data.length / 4;
    const gray = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      const idx = i * 4;
      gray[i] = (data[idx] * 77 + data[idx + 1] * 150 + data[idx + 2] * 29) >> 8;
    }
    return gray;
  }

  adaptiveThreshold(gray, w, h) {
    const binary = new Uint8Array(w * h);
    const s = Math.floor(w / 16);
    const t = 7;
    const integral = new Uint32Array(w * h);

    // Image intégrale
    for (let y = 0; y < h; y++) {
      let sum = 0;
      for (let x = 0; x < w; x++) {
        sum += gray[y * w + x];
        integral[y * w + x] = (y === 0 ? 0 : integral[(y - 1) * w + x]) + sum;
      }
    }

    // Seuil adaptatif
    for (let y = 0; y < h; y++) {
      const y1 = Math.max(0, y - s);
      const y2 = Math.min(h - 1, y + s);
      for (let x = 0; x < w; x++) {
        const x1 = Math.max(0, x - s);
        const x2 = Math.min(w - 1, x + s);
        const count = (x2 - x1) * (y2 - y1);
        const sum = integral[y2 * w + x2] - integral[y1 * w + x2] - integral[y2 * w + x1] + integral[y1 * w + x1];
        binary[y * w + x] = (gray[y * w + x] * count < sum * (100 - t) / 100) ? 0 : 255;
      }
    }
    return binary;
  }

  findContours(binary, w, h) {
    // Tracing simple des contours noirs fermés
    const visited = new Uint8Array(w * h);
    const contours = [];
    const minPerimeter = 60;
    const maxPerimeter = (w + h) * 1.5;

    for (let y = 2; y < h - 2; y += 2) {
      for (let x = 2; x < w - 2; x += 2) {
        const idx = y * w + x;
        if (binary[idx] === 0 && !visited[idx]) {
          const contour = this.traceContour(binary, visited, w, h, x, y);
          if (contour && contour.length >= 4) {
            const p = this.arcLength(contour);
            if (p >= minPerimeter && p <= maxPerimeter) {
              contours.push(contour);
            }
          }
        }
      }
    }
    return contours;
  }

  traceContour(binary, visited, w, h, startX, startY) {
    const points = [];
    let cx = startX, cy = startY;
    const dx = [1, 1, 0, -1, -1, -1, 0, 1];
    const dy = [0, 1, 1, 1, 0, -1, -1, -1];
    let dir = 0;
    let maxSteps = 1200;

    while (maxSteps-- > 0) {
      points.push({ x: cx, y: cy });
      visited[cy * w + cx] = 1;
      let found = false;
      for (let i = 0; i < 8; i++) {
        const ndir = (dir + i) % 8;
        const nx = cx + dx[ndir];
        const ny = cy + dy[ndir];
        if (nx >= 0 && nx < w && ny >= 0 && ny < h && binary[ny * w + nx] === 0) {
          cx = nx;
          cy = ny;
          dir = (ndir + 4) % 8;
          found = true;
          break;
        }
      }
      if (!found || (cx === startX && cy === startY && points.length > 3)) break;
    }
    return points.length > 10 ? points : null;
  }

  arcLength(pts) {
    let len = 0;
    for (let i = 0; i < pts.length; i++) {
      const next = pts[(i + 1) % pts.length];
      const dX = pts[i].x - next.x;
      const dY = pts[i].y - next.y;
      len += Math.sqrt(dX * dX + dY * dY);
    }
    return len;
  }

  filterPolygons(contours, w, h) {
    const quads = [];
    for (const c of contours) {
      const approx = this.approxPolyDP(c, this.arcLength(c) * 0.04);
      if (approx.length === 4 && this.isConvex(approx)) {
        // Vérifier que le polygone est ordonné dans le sens horaire
        const ordered = this.orderClockwise(approx);
        quads.push(ordered);
      }
    }
    return quads;
  }

  approxPolyDP(points, epsilon) {
    if (points.length <= 4) return points;
    let dmax = 0;
    let index = 0;
    const end = points.length - 1;

    for (let i = 1; i < end; i++) {
      const d = this.perpendicularDistance(points[i], points[0], points[end]);
      if (d > dmax) {
        index = i;
        dmax = d;
      }
    }

    if (dmax > epsilon) {
      const rec1 = this.approxPolyDP(points.slice(0, index + 1), epsilon);
      const rec2 = this.approxPolyDP(points.slice(index), epsilon);
      return rec1.slice(0, -1).concat(rec2);
    } else {
      return [points[0], points[end]];
    }
  }

  perpendicularDistance(p, p1, p2) {
    const num = Math.abs((p2.y - p1.y) * p.x - (p2.x - p1.x) * p.y + p2.x * p1.y - p2.y * p1.x);
    const den = Math.sqrt((p2.y - p1.y) ** 2 + (p2.x - p1.x) ** 2);
    return den === 0 ? 0 : num / den;
  }

  isConvex(pts) {
    let sign = false;
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const dx1 = pts[(i + 1) % n].x - pts[i].x;
      const dy1 = pts[(i + 1) % n].y - pts[i].y;
      const dx2 = pts[(i + 2) % n].x - pts[(i + 1) % n].x;
      const dy2 = pts[(i + 2) % n].y - pts[(i + 1) % n].y;
      const cross = dx1 * dy2 - dy1 * dx2;
      if (i === 0) sign = cross > 0;
      else if ((cross > 0) !== sign) return false;
    }
    return true;
  }

  orderClockwise(pts) {
    const center = pts.reduce((acc, p) => ({ x: acc.x + p.x / 4, y: acc.y + p.y / 4 }), { x: 0, y: 0 });
    return [...pts].sort((a, b) => {
      const angA = Math.atan2(a.y - center.y, a.x - center.x);
      const angB = Math.atan2(b.y - center.y, b.x - center.x);
      return angA - angB;
    });
  }

  identifyMarker(gray, w, h, quad) {
    // Échantillonner la grille 6x6 du marqueur (1 bordure + 4x4 data + 1 bordure)
    const size = 6;
    const grid = [];
    const H = this.computeHomography([
      { x: 0, y: 0 }, { x: size, y: 0 }, { x: size, y: size }, { x: 0, y: size }
    ], quad);

    if (!H) return null;

    let blackBorderCount = 0;
    let totalBorderCount = 0;

    for (let r = 0; r < size; r++) {
      grid[r] = [];
      for (let c = 0; c < size; c++) {
        // Point au centre de la case
        const pt = this.applyHomography(H, c + 0.5, r + 0.5);
        const x = Math.round(pt.x);
        const y = Math.round(pt.y);
        let val = 255;
        if (x >= 0 && x < w && y >= 0 && y < h) {
          val = gray[y * w + x];
        }
        const bit = val < 128 ? 0 : 1;
        grid[r][c] = bit;

        // Tester si c'est la bordure (doit être noire = 0)
        if (r === 0 || r === size - 1 || c === 0 || c === size - 1) {
          totalBorderCount++;
          if (bit === 0) blackBorderCount++;
        }
      }
    }

    // Si la bordure n'est pas majoritairement noire, ce n'est pas un marqueur
    if (blackBorderCount / totalBorderCount < 0.75) return null;

    // Extraire la matrice 4x4 intérieure
    const inner = [];
    for (let r = 0; r < 4; r++) {
      inner[r] = [];
      for (let c = 0; c < 4; c++) {
        inner[r][c] = grid[r + 1][c + 1];
      }
    }

    // Tester les 4 rotations pour chaque ID
    for (let id = 0; id <= 3; id++) {
      const ref = ARUCO_4X4_DICTS[id];
      for (let rot = 0; rot < 4; rot++) {
        const rotatedRef = this.rotateMatrix(ref, rot);
        let match = 0;
        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 4; c++) {
            if (inner[r][c] === rotatedRef[r][c]) match++;
          }
        }
        if (match >= 15) { // Tolérance de 1 bit erroné
          // Ajuster l'ordre des coins selon la rotation
          const orderedCorners = [];
          for (let i = 0; i < 4; i++) {
            orderedCorners[i] = quad[(i + rot) % 4];
          }
          return { id, rotation: rot, corners: orderedCorners };
        }
      }
    }

    return null;
  }

  rotateMatrix(mat, rot) {
    let res = mat;
    for (let i = 0; i < rot; i++) {
      const n = res.length;
      const next = [];
      for (let r = 0; r < n; r++) {
        next[r] = [];
        for (let c = 0; c < n; c++) {
          next[r][c] = res[n - 1 - c][r];
        }
      }
      res = next;
    }
    return res;
  }

  computeHomography(src, dst) {
    // Résout le système 8x8 pour l'homographie de 4 points src -> dst
    const A = [];
    const b = [];

    for (let i = 0; i < 4; i++) {
      const sx = src[i].x, sy = src[i].y;
      const dx = dst[i].x, dy = dst[i].y;
      A.push([sx, sy, 1, 0, 0, 0, -sx * dx, -sy * dx]);
      b.push(dx);
      A.push([0, 0, 0, sx, sy, 1, -sx * dy, -sy * dy]);
      b.push(dy);
    }

    const h = this.solveGaussian(A, b);
    if (!h) return null;
    return [
      h[0], h[1], h[2],
      h[3], h[4], h[5],
      h[6], h[7], 1
    ];
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
      for (let j = i + 1; j < n; j++) {
        sum += A[i][j] * x[j];
      }
      x[i] = (b[i] - sum) / A[i][i];
    }
    return x;
  }

  applyHomography(H, x, y) {
    const d = H[6] * x + H[7] * y + H[8];
    return {
      x: (H[0] * x + H[1] * y + H[2]) / d,
      y: (H[3] * x + H[4] * y + H[5]) / d
    };
  }
}

// ── Solveur & convertisseur CSS Matrix3D ─────────────────────────────────────
/**
 * Convertit 4 points de destination en une matrice CSS transform: matrix3d(...)
 * Source : boîte rectangulaire [0, 0] -> [width, height]
 * Destination : 4 points d'écran dans l'ordre [Haut-Gauche, Haut-Droit, Bas-Droit, Bas-Gauche]
 */
function getCssMatrix3d(srcW, srcH, dstPts) {
  const engine = new ArUcoEngine();
  const srcPts = [
    { x: 0, y: 0 },
    { x: srcW, y: 0 },
    { x: srcW, y: srcH },
    { x: 0, y: srcH }
  ];
  const H = engine.computeHomography(srcPts, dstPts);
  if (!H) return null;

  // Conversion Homographie 3x3 -> CSS Matrix3D 4x4
  // CSS matrix3d(a1, b1, c1, d1, a2, b2, c2, d2, a3, b3, c3, d3, a4, b4, c4, d4)
  return `matrix3d(
    ${H[0].toFixed(6)}, ${H[3].toFixed(6)}, 0, ${H[6].toFixed(8)},
    ${H[1].toFixed(6)}, ${H[4].toFixed(6)}, 0, ${H[7].toFixed(8)},
    0, 0, 1, 0,
    ${H[2].toFixed(4)}, ${H[5].toFixed(4)}, 0, ${H[8].toFixed(6)}
  )`;
}

// Export global pour navigateur
window.ArUcoEngine = ArUcoEngine;
window.getCssMatrix3d = getCssMatrix3d;
