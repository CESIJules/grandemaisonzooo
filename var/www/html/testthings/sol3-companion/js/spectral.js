/**
 * spectral.js — Moteur de Traitement d'Image Spectrale & Analyseur de Signal ARG
 * Filtres X-Ray Négatif, Thermique Ultraviolet, Phosphore CRT et calcul de résonance optique
 */
(function (global) {
  'use strict';

  class SpectralEngine {
    constructor(options) {
      this.options = Object.assign({
        threshold: 0.65,
        filterMode: 'xray' // 'xray' | 'thermal' | 'phosphor'
      }, options);

      this.sampleWidth = 80;
      this.sampleHeight = 80;
      this.sampleCanvas = document.createElement('canvas');
      this.sampleCtx = this.sampleCanvas.getContext('2d', { willReadFrequently: true });
      this.sampleCanvas.width = this.sampleWidth;
      this.sampleCanvas.height = this.sampleHeight;

      this.rawCanvas = null;
      this.thermalLUT = this._buildThermalLUT();
      this.lockFrames = 0;
      this.currentScore = 0;
    }

    setFilterMode(mode) {
      if (['xray', 'thermal', 'phosphor'].includes(mode)) {
        this.options.filterMode = mode;
      }
    }

    resetScore() {
      this.currentScore = 0;
      this.lockFrames = 0;
    }

    _buildThermalLUT() {
      // Palette thermique / UV ARG (256 entrées RGBA)
      const lut = new Uint32Array(256);
      for (let i = 0; i < 256; i++) {
        const t = i / 255;
        let r = 0, g = 0, b = 0;

        if (t < 0.25) {
          // Noir -> Violet néon (0 -> 140, 0 -> 20, 0 -> 220)
          const f = t / 0.25;
          r = Math.floor(140 * f);
          g = Math.floor(20 * f);
          b = Math.floor(220 * f);
        } else if (t < 0.5) {
          // Violet -> Bleu cyan électrique
          const f = (t - 0.25) / 0.25;
          r = Math.floor(140 * (1 - f));
          g = Math.floor(20 + 200 * f);
          b = 220;
        } else if (t < 0.75) {
          // Cyan -> Jaune ambré
          const f = (t - 0.5) / 0.25;
          r = Math.floor(255 * f);
          g = Math.floor(220 + 35 * f);
          b = Math.floor(220 * (1 - f));
        } else {
          // Jaune -> Blanc incandescent
          const f = (t - 0.75) / 0.25;
          r = 255;
          g = 255;
          b = Math.floor(255 * f);
        }

        // Little-endian RGBA packing (A B G R)
        lut[i] = (255 << 24) | (b << 16) | (g << 8) | r;
      }
      return lut;
    }

    /**
     * Analyse en temps réel la zone centrale du viseur
     * Compatible video, canvas ou img
     * Retourne un score de cohérence spectrale (0 - 100%)
     */
    analyzeCenter(source) {
      if (!source) return { score: 0, locked: false };

      const isVideo = source.tagName === 'VIDEO';
      if (isVideo && (source.readyState < 2 || source.videoWidth === 0)) {
        return { score: 0, locked: false };
      }

      const vw = source.videoWidth || source.width || 0;
      const vh = source.videoHeight || source.height || 0;
      if (vw === 0 || vh === 0) return { score: 0, locked: false };

      const cropSize = Math.floor(Math.min(vw, vh) * 0.45);
      const sx = Math.floor((vw - cropSize) / 2);
      const sy = Math.floor((vh - cropSize) / 2);

      this.sampleCtx.drawImage(source, sx, sy, cropSize, cropSize, 0, 0, this.sampleWidth, this.sampleHeight);
      const imgData = this.sampleCtx.getImageData(0, 0, this.sampleWidth, this.sampleHeight);
      const data = imgData.data;
      const len = data.length;

      let sumLum = 0;
      let sumSqDiff = 0;
      let edges = 0;
      const totalPixels = this.sampleWidth * this.sampleHeight;

      // 1. Calcul de la moyenne de luminance
      for (let i = 0; i < len; i += 4) {
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        sumLum += lum;
      }
      const avgLum = sumLum / totalPixels;

      // 2. Calcul du contraste (écart type exact) et détection de gradient/bords
      const stride = this.sampleWidth * 4;
      for (let y = 1; y < this.sampleHeight - 1; y++) {
        const row = y * stride;
        for (let x = 1; x < this.sampleWidth - 1; x++) {
          const idx = row + (x * 4);
          const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
          const diff = lum - avgLum;
          sumSqDiff += diff * diff;

          // Gradient horizontal et vertical (Sobel allégé)
          const lumRight = 0.299 * data[idx + 4] + 0.587 * data[idx + 5] + 0.114 * data[idx + 6];
          const lumDown = 0.299 * data[idx + stride] + 0.587 * data[idx + stride + 1] + 0.114 * data[idx + stride + 2];
          const delta = Math.abs(lum - lumRight) + Math.abs(lum - lumDown);
          if (delta > 22) edges++;
        }
      }

      const sampledInnerPixels = (this.sampleWidth - 2) * (this.sampleHeight - 2);
      const contrast = Math.sqrt(sumSqDiff / sampledInnerPixels); // 0 à ~120
      const edgeDensity = (edges / sampledInnerPixels) * 100; // 0 à 100%

      // Score combiné : l'écran de PC a un bon contraste (> 25) et une forte densité de bords (texte + cadre)
      let score = 0;
      if (avgLum > 25 && avgLum < 240) {
        const contrastNorm = Math.min(contrast / 45, 1.0);
        const edgeNorm = Math.min(edgeDensity / 35, 1.0);
        score = Math.floor((contrastNorm * 0.55 + edgeNorm * 0.45) * 100);
      }

      // Lissage exponentiel du score
      this.currentScore = Math.floor(this.currentScore * 0.65 + score * 0.35);

      if (this.currentScore >= 65) {
        this.lockFrames++;
      } else {
        this.lockFrames = Math.max(0, this.lockFrames - 1);
      }

      const locked = this.lockFrames >= 6; // Verrouillé après 6 frames stables
      return {
        score: this.currentScore,
        locked: locked,
        metrics: {
          contrast: Math.round(contrast),
          edgeDensity: Math.round(edgeDensity),
          brightness: Math.round(avgLum)
        }
      };
    }

    /**
     * Capture une image haute résolution, stocke le brut et applique le filtre
     */
    captureAndFilter(source, destCanvas, filterMode = null) {
      if (!source || !destCanvas) return;

      const w = source.videoWidth || source.width || 1280;
      const h = source.videoHeight || source.height || 720;

      // Conserver le brut pour permettre de re-filtrer sans recapturer le flux direct
      if (!this.rawCanvas) {
        this.rawCanvas = document.createElement('canvas');
      }
      this.rawCanvas.width = w;
      this.rawCanvas.height = h;
      const rawCtx = this.rawCanvas.getContext('2d');
      rawCtx.drawImage(source, 0, 0, w, h);

      return this.applyFilter(this.rawCanvas, destCanvas, filterMode);
    }

    /**
     * Ré-applique un filtre sur la dernière capture figée sans perdre l'image capturée
     */
    reapplyFilter(destCanvas, filterMode = null) {
      if (!this.rawCanvas || this.rawCanvas.width === 0) return;
      return this.applyFilter(this.rawCanvas, destCanvas, filterMode);
    }

    /**
     * Application du filtre spectral sur le canevas de destination
     */
    applyFilter(sourceCanvas, destCanvas, filterMode = null) {
      if (!sourceCanvas || !destCanvas) return;
      const mode = filterMode || this.options.filterMode;

      const w = sourceCanvas.width;
      const h = sourceCanvas.height;
      destCanvas.width = w;
      destCanvas.height = h;

      const ctx = destCanvas.getContext('2d');
      ctx.drawImage(sourceCanvas, 0, 0, w, h);

      const imgData = ctx.getImageData(0, 0, w, h);
      const data32 = new Uint32Array(imgData.data.buffer);
      const numPixels = data32.length;

      if (mode === 'xray') {
        // ── X-Ray Négatif Spectral : Inversion + Contraste Cyan/Émeraude ─────
        for (let y = 0; y < h; y++) {
          const isScanline = (y % 3 === 0);
          const scanFactor = isScanline ? 0.7 : 1.0;
          const rowOffset = y * w;
          for (let x = 0; x < w; x++) {
            const i = rowOffset + x;
            const pixel = data32[i];
            const r = pixel & 0xFF;
            const g = (pixel >> 8) & 0xFF;
            const b = (pixel >> 16) & 0xFF;

            // Inversion
            const invR = Math.floor((255 - r) * 0.35 * scanFactor);
            const invG = Math.min(255, Math.floor((255 - g) * 1.35 * scanFactor));
            const invB = Math.min(255, Math.floor((255 - b) * 1.45 * scanFactor));

            data32[i] = (255 << 24) | (invB << 16) | (invG << 8) | invR;
          }
        }
      } else if (mode === 'thermal') {
        // ── Thermique Ultraviolet ARG ───────────────────────────────────────
        const lut = this.thermalLUT;
        for (let i = 0; i < numPixels; i++) {
          const pixel = data32[i];
          const r = pixel & 0xFF;
          const g = (pixel >> 8) & 0xFF;
          const b = (pixel >> 16) & 0xFF;

          const lum = (r * 77 + g * 150 + b * 29) >> 8; // Luminance rapide 0-255
          data32[i] = lut[lum];
        }
      } else if (mode === 'phosphor') {
        // ── Phosphore CRT Vert Matrice ─────────────────────────────────────
        for (let y = 0; y < h; y++) {
          const scan = (y % 2 === 0) ? 0.75 : 1.0;
          const rowOffset = y * w;
          for (let x = 0; x < w; x++) {
            const i = rowOffset + x;
            const pixel = data32[i];
            const r = pixel & 0xFF;
            const g = (pixel >> 8) & 0xFF;
            const b = (pixel >> 16) & 0xFF;

            let lum = (r * 77 + g * 150 + b * 29) >> 8;
            lum = lum < 40 ? 0 : Math.min(255, Math.floor((lum - 40) * 1.4));

            const phosphorR = Math.floor(lum * 0.1 * scan);
            const phosphorG = Math.floor(lum * 1.05 * scan);
            const phosphorB = Math.floor(lum * 0.55 * scan);

            data32[i] = (255 << 24) |
                        (phosphorB << 16) |
                        (phosphorG << 8) |
                        phosphorR;
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);

      // Superposer une grille d'alignement holographique
      this._drawHoloOverlay(ctx, w, h);
    }

    _drawHoloOverlay(ctx, w, h) {
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 255, 136, 0.25)';
      ctx.lineWidth = 1;

      // Lignes de cadrage
      const marginX = w * 0.1;
      const marginY = h * 0.1;
      ctx.strokeRect(marginX, marginY, w - marginX * 2, h - marginY * 2);

      // Réticule central
      const cx = w / 2;
      const cy = h / 2;
      ctx.beginPath();
      ctx.moveTo(cx - 30, cy); ctx.lineTo(cx + 30, cy);
      ctx.moveTo(cx, cy - 30); ctx.lineTo(cx, cy + 30);
      ctx.stroke();

      // Texte télémétrique
      ctx.fillStyle = '#00ff88';
      ctx.font = 'bold 14px "Courier New", monospace';
      ctx.fillText('[ CAPTURE SPECTRALE NATIVE // SPECTRAL LENS v3.2 ]', marginX + 12, marginY + 24);
      ctx.fillText('TIMESTAMP: ' + new Date().toISOString(), marginX + 12, marginY + 42);

      ctx.restore();
    }
  }

  global.SpectralEngine = SpectralEngine;
})(typeof window !== 'undefined' ? window : this);
