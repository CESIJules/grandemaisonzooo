/**
 * seal-tracker.js — Moteur de suivi haute précision par Sceau Fiducial (jsQR)
 * Salle 45 / Grande Maison
 *
 * Détection instantanée (< 20ms) via jsQR.
 * Extraction des 4 coins au sous-pixel (location.topLeftCorner, topRightCorner, bottomRightCorner, bottomLeftCorner).
 * Solveur d'homographie 3D complet produisant la matrice CSS matrix3d.
 * Filtrage adaptatif anti-tremblement et persistance de pose pour une fluidité à 60 FPS.
 */

class SealTracker {
  constructor(options = {}) {
    this.expectedPrefix = options.expectedPrefix || 'ROOM45-SEAL';
    this.processWidth = options.processWidth || 512;
    this.smoothingAlpha = options.smoothingAlpha !== undefined ? options.smoothingAlpha : 0.65;
    this.maxGraceFrames = options.maxGraceFrames !== undefined ? options.maxGraceFrames : 8;

    // Canvas interne de traitement
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

    // État de suivi
    this.lastCorners = null;
    this.smoothedCorners = null;
    this.graceCount = 0;
    this.isLocked = false;
    this.lastPayload = null;
    this.lastScanTimeMs = 0;
    this.frameCount = 0;

    // Géométrie du document PC calibrée au pixel près (repères relatifs au document 600 x 760)
    // Document de référence : Largeur 600px, Hauteur 760px
    this.docLayout = {
      docWidth: 600,
      docHeight: 760,
      // Emplacement précis du QR code fiducial (centré en X à 300px, Y à 540px, taille 100x100)
      seal: { x: 250, y: 540, width: 100, height: 100 },
      // Emplacement précis de la zone énigme (texte à remplacer in-situ, 530x160)
      riddle: { x: 35, y: 310, width: 530, height: 160 },
      // Emplacement précis de la gravure centrale (artwork à remplacer in-situ, 530x170)
      artwork: { x: 35, y: 115, width: 530, height: 170 }
    };

    if (options.docLayout) {
      this.docLayout = Object.assign(this.docLayout, options.docLayout);
    }
  }

  /**
   * Analyse une frame vidéo
   * @param {HTMLVideoElement} videoElement
   * @returns {Object|null}
   */
  processFrame(videoElement) {
    if (!videoElement || !videoElement.videoWidth || videoElement.videoHeight === 0) {
      return null;
    }

    const t0 = performance.now();
    const vw = videoElement.videoWidth;
    const vh = videoElement.videoHeight;

    // Calcul de la résolution de traitement optimisée (480-512px)
    const scale = this.processWidth / vw;
    const pw = this.processWidth;
    const ph = Math.round(vh * scale);

    if (this.canvas.width !== pw || this.canvas.height !== ph) {
      this.canvas.width = pw;
      this.canvas.height = ph;
    }

    let code = null;
    try {
      this.ctx.drawImage(videoElement, 0, 0, pw, ph);
      const imgData = this.ctx.getImageData(0, 0, pw, ph);

      // Exécution de jsQR
      if (typeof jsQR !== 'undefined') {
        code = jsQR(imgData.data, pw, ph, {
          inversionAttempts: 'dontInvert'
        });
      }
    } catch (err) {
      // Ignorer les erreurs d'extraction de trame transitoires
    }

    const scanTimeMs = performance.now() - t0;
    this.lastScanTimeMs = scanTimeMs;
    this.frameCount++;

    // Vérification du QR Code trouvé et de son préfixe de sécurité
    const validSeal = code && code.data && (
      !this.expectedPrefix ||
      code.data.startsWith(this.expectedPrefix) ||
      code.data.indexOf('ROOM45') !== -1
    );

    if (validSeal) {
      this.graceCount = this.maxGraceFrames;
      this.isLocked = true;
      this.lastPayload = code.data;

      // Parsing dynamique optionnel de géométrie si présent dans le payload (ROOM45-SEAL@...)
      if (code.data.includes('@')) {
        try {
          const parts = code.data.split('@')[1].split(':');
          if (parts.length >= 2) {
            const [sx, sy, sw, sh] = parts[0].split(',').map(Number);
            const [rx, ry, rw, rh] = parts[1].split(',').map(Number);
            if (!isNaN(sx) && !isNaN(sw)) this.docLayout.seal = { x: sx, y: sy, width: sw, height: sh };
            if (!isNaN(rx) && !isNaN(rw)) this.docLayout.riddle = { x: rx, y: ry, width: rw, height: rh };
            if (parts.length >= 3) {
              const [ax, ay, aw, ah] = parts[2].split(',').map(Number);
              if (!isNaN(ax) && !isNaN(aw)) this.docLayout.artwork = { x: ax, y: ay, width: aw, height: ah };
            }
          }
        } catch (_) {}
      }

      // Remettre les coordonnées à l'échelle vidéo d'origine (vw, vh)
      const invScale = 1 / scale;
      const rawCorners = [
        { x: code.location.topLeftCorner.x * invScale, y: code.location.topLeftCorner.y * invScale },
        { x: code.location.topRightCorner.x * invScale, y: code.location.topRightCorner.y * invScale },
        { x: code.location.bottomRightCorner.x * invScale, y: code.location.bottomRightCorner.y * invScale },
        { x: code.location.bottomLeftCorner.x * invScale, y: code.location.bottomLeftCorner.y * invScale }
      ];

      // Filtrage adaptatif anti-tremblement
      this.smoothedCorners = this.smoothCorners(rawCorners);
      this.lastCorners = rawCorners;
    } else if (this.graceCount > 0 && this.smoothedCorners) {
      // Période de grâce : maintenir la pose si détection manquée temporairement
      this.graceCount--;
      this.isLocked = true;
    } else {
      this.isLocked = false;
      this.smoothedCorners = null;
      this.lastCorners = null;
    }

    if (!this.isLocked || !this.smoothedCorners) {
      return {
        locked: false,
        scanTimeMs: this.lastScanTimeMs,
        payload: null
      };
    }

    return {
      locked: true,
      scanTimeMs: this.lastScanTimeMs,
      payload: this.lastPayload,
      rawCorners: this.lastCorners,
      sealCorners: this.smoothedCorners,
      // Méthodes géométriques disponibles sur le résultat
      getHomographyForSeal: (targetW, targetH) => {
        return this.computeMatrix3dForRect(0, 0, targetW, targetH, this.smoothedCorners);
      },
      getHomographyForRiddle: (targetW, targetH) => {
        return this.computeHomographyForSubZone(this.docLayout.seal, this.docLayout.riddle, this.smoothedCorners, targetW, targetH);
      },
      getHomographyForArtwork: (targetW, targetH) => {
        return this.computeHomographyForSubZone(this.docLayout.seal, this.docLayout.artwork, this.smoothedCorners, targetW, targetH);
      },
      getHomographyForDocument: (targetW, targetH) => {
        const docRect = { x: 0, y: 0, width: this.docLayout.docWidth, height: this.docLayout.docHeight };
        return this.computeHomographyForSubZone(this.docLayout.seal, docRect, this.smoothedCorners, targetW, targetH);
      }
    };
  }

  /**
   * Lissage adaptatif des 4 coins (Interpolation continue smoothstep)
   * Élimine complètement les tremblements sub-pixel à l'arrêt tout en assurant zéro latence en mouvement.
   */
  smoothCorners(newCorners) {
    if (!this.smoothedCorners) {
      return newCorners.map(p => ({ x: p.x, y: p.y }));
    }

    // Calcul de la distance maximale de déplacement parmi les 4 coins
    let maxDist = 0;
    for (let i = 0; i < 4; i++) {
      const dx = newCorners[i].x - this.smoothedCorners[i].x;
      const dy = newCorners[i].y - this.smoothedCorners[i].y;
      const d = Math.hypot(dx, dy);
      if (d > maxDist) maxDist = d;
    }

    // Interpolation continue C1 (smoothstep) :
    // - Micro-tremblements (< 1.5px) : alpha = 0.25 (ultra-stable)
    // - Mouvements rapides (> 20px) : alpha = 1.0 (zéro latence)
    // - Entre les deux : transition continue sans à-coup
    let alpha;
    if (maxDist <= 1.5) {
      alpha = 0.25;
    } else if (maxDist >= 20.0) {
      alpha = 1.0;
    } else {
      const t = (maxDist - 1.5) / (20.0 - 1.5);
      const s = t * t * (3 - 2 * t);
      alpha = 0.25 + s * 0.75;
    }

    return this.smoothedCorners.map((oldP, i) => ({
      x: oldP.x + (newCorners[i].x - oldP.x) * alpha,
      y: oldP.y + (newCorners[i].y - oldP.y) * alpha
    }));
  }

  /**
   * Résout l'homographie directe d'un rectangle source (w, h) vers un quadrilatère destination
   * et retourne la chaîne CSS matrix3d(...)
   */
  computeMatrix3dForRect(x0, y0, w, h, dstQuad) {
    const srcQuad = [
      { x: x0, y: y0 },
      { x: x0 + w, y: y0 },
      { x: x0 + w, y: y0 + h },
      { x: x0, y: y0 + h }
    ];
    return this.solveHomographyToMatrix3d(srcQuad, dstQuad);
  }

  /**
   * Calcule la projection 3D d'une sous-zone du document (ex: zone énigme)
   * à partir de la position observée du sceau fiducial
   */
  computeHomographyForSubZone(sealDocRect, targetDocRect, sealCamCorners, elemW, elemH) {
    // 1. Calcul de l'homographie document -> caméra basée sur le sceau
    const sealDocQuad = [
      { x: sealDocRect.x, y: sealDocRect.y },
      { x: sealDocRect.x + sealDocRect.width, y: sealDocRect.y },
      { x: sealDocRect.x + sealDocRect.width, y: sealDocRect.y + sealDocRect.height },
      { x: sealDocRect.x, y: sealDocRect.y + sealDocRect.height }
    ];

    const H_doc2cam = this.findHomography(sealDocQuad, sealCamCorners);
    if (!H_doc2cam) return null;

    // 2. Projection des 4 coins de la cible du document vers l'espace caméra
    const targetDocQuad = [
      { x: targetDocRect.x, y: targetDocRect.y },
      { x: targetDocRect.x + targetDocRect.width, y: targetDocRect.y },
      { x: targetDocRect.x + targetDocRect.width, y: targetDocRect.y + targetDocRect.height },
      { x: targetDocRect.x, y: targetDocRect.y + targetDocRect.height }
    ];

    const targetCamQuad = targetDocQuad.map(p => this.applyHomography(H_doc2cam, p.x, p.y));

    // 3. Calcul de la matrix3d pour l'élément HTML affiché de dimension (elemW, elemH)
    const elemSrcQuad = [
      { x: 0, y: 0 },
      { x: elemW, y: 0 },
      { x: elemW, y: elemH },
      { x: 0, y: elemH }
    ];

    return {
      matrix3d: this.solveHomographyToMatrix3d(elemSrcQuad, targetCamQuad),
      camQuad: targetCamQuad
    };
  }

  /**
   * Résout le système linéaire 8x8 pour trouver la matrice de transformation homographique
   */
  findHomography(src, dst) {
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
      h[6], h[7], 1.0
    ];
  }

  applyHomography(H, x, y) {
    const w = H[6] * x + H[7] * y + 1.0;
    return {
      x: (H[0] * x + H[1] * y + H[2]) / w,
      y: (H[3] * x + H[4] * y + H[5]) / w
    };
  }

  solveHomographyToMatrix3d(srcQuad, dstQuad) {
    const H = this.findHomography(srcQuad, dstQuad);
    if (!H) return null;

    // Format CSS matrix3d (ordonnancement par colonnes)
    // [ h00, h10, 0, h20,
    //   h01, h11, 0, h21,
    //   0,   0,   1, 0,
    //   h02, h12, 0, 1 ]
    return `matrix3d(
      ${H[0].toFixed(8)}, ${H[3].toFixed(8)}, 0, ${H[6].toFixed(10)},
      ${H[1].toFixed(8)}, ${H[4].toFixed(8)}, 0, ${H[7].toFixed(10)},
      0, 0, 1, 0,
      ${H[2].toFixed(6)}, ${H[5].toFixed(6)}, 0, 1
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

      const tmpA = A[maxRow]; A[maxRow] = A[i]; A[i] = tmpA;
      const tmpB = b[maxRow]; b[maxRow] = b[i]; b[i] = tmpB;

      if (Math.abs(A[i][i]) < 1e-11) return null;

      for (let k = i + 1; k < n; k++) {
        const factor = A[k][i] / A[i][i];
        b[k] -= factor * b[i];
        for (let j = i; j < n; j++) {
          A[k][j] -= factor * A[i][j];
        }
      }
    }

    const x = new Array(n);
    for (let i = n - 1; i >= 0; i--) {
      let sum = b[i];
      for (let j = i + 1; j < n; j++) {
        sum -= A[i][j] * x[j];
      }
      x[i] = sum / A[i][i];
    }
    return x;
  }
}

if (typeof window !== 'undefined') {
  window.SealTracker = SealTracker;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SealTracker;
}
