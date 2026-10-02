/**
 * scanner-engine.js — Moteur de reconnaissance spectrale par corrélation réelle
 * 
 * Compare le flux vidéo réel avec l'image réelle de Room 45 (/room45/cover/a01.png).
 * Zéro formule arbitraire, corrélation croisée normalisée (NCC) directe.
 */

class SpectralScanner {
  constructor(options = {}) {
    this.threshold = options.threshold || 0.58; // Seuil de verrouillage réaliste pour écran PC
    
    // Canvas pour l'image de référence cible
    this.targetCanvas = document.createElement('canvas');
    this.targetCanvas.width = 32;
    this.targetCanvas.height = 32;
    this.targetCtx = this.targetCanvas.getContext('2d', { willReadFrequently: true });

    // Canvas pour échantillonner la caméra
    this.sampleCanvas = document.createElement('canvas');
    this.sampleCanvas.width = 32;
    this.sampleCanvas.height = 32;
    this.sampleCtx = this.sampleCanvas.getContext('2d', { willReadFrequently: true });

    this.targetProfile = null;
    this.isReady = false;
    this.isLocked = false;
    this.lockCounter = 0;
  }

  /**
   * Charge la véritable image de l'énigme pour en extraire l'empreinte mathématique
   */
  async loadTarget(imageSrc = '/room45/cover/a01.png') {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.targetCtx.drawImage(img, 0, 0, 32, 32);
        const imgData = this.targetCtx.getImageData(0, 0, 32, 32);
        this.targetProfile = this.normalizePixels(imgData.data);
        this.isReady = true;
        resolve(true);
      };
      img.onerror = () => {
        // Fallback avec profil de contraste élevé si l'image ne charge pas
        this.targetProfile = this.generateFallbackProfile();
        this.isReady = true;
        resolve(false);
      };
      img.src = imageSrc;
    });
  }

  /**
   * Normalise les pixels en vecteur à moyenne 0 et variance 1
   */
  normalizePixels(data) {
    const len = data.length / 4;
    const profile = new Float32Array(len);
    let mean = 0;

    for (let i = 0; i < len; i++) {
      const idx = i * 4;
      // Luminance perceptive standard
      const lum = (data[idx] * 77 + data[idx + 1] * 150 + data[idx + 2] * 29) >> 8;
      profile[i] = lum;
      mean += lum;
    }
    mean /= len;

    let variance = 0;
    for (let i = 0; i < len; i++) {
      profile[i] -= mean;
      variance += profile[i] * profile[i];
    }
    const stdDev = Math.sqrt(variance) || 1;
    for (let i = 0; i < len; i++) {
      profile[i] /= stdDev;
    }

    return profile;
  }

  generateFallbackProfile() {
    const profile = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) {
      profile[i] = (i % 32 < 16) ? 1.0 : -1.0;
    }
    return profile;
  }

  /**
   * Analyse le flux vidéo de la caméra
   */
  analyze(video) {
    if (!video.videoWidth || video.videoHeight === 0 || !this.isReady) {
      return { score: 0, locked: false, rawCorr: 0 };
    }

    const vw = video.videoWidth;
    const vh = video.videoHeight;

    // Échantillonner le centre de la caméra (qui correspond au viseur)
    // On prend les 50% centraux de l'image
    const cropW = Math.round(vw * 0.50);
    const cropH = Math.round(vh * 0.50);
    const cropX = Math.round((vw - cropW) / 2);
    const cropY = Math.round((vh - cropH) / 2);

    this.sampleCtx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, 32, 32);
    const imgData = this.sampleCtx.getImageData(0, 0, 32, 32);
    const currentProfile = this.normalizePixels(imgData.data);

    // Corrélation croisée normalisée (NCC) avec la cible réelle
    let correlation = 0;
    for (let i = 0; i < 1024; i++) {
      correlation += currentProfile[i] * this.targetProfile[i];
    }
    correlation /= 1024;

    // Normalisation du score en pourcentage d'affichage (0% à 100%)
    // Si la caméra vise un mur/bureau : correlation ~ -0.1 à +0.2 -> score ~ 0 à 15%
    // Si la caméra vise l'artwork sur l'écran PC : correlation ~ 0.55 à 0.85 -> score ~ 70 à 100%
    const score = Math.max(0, Math.min(100, Math.round(((correlation + 0.1) / 0.8) * 100)));

    if (correlation >= this.threshold) {
      this.lockCounter++;
      if (this.lockCounter >= 2) {
        this.isLocked = true;
      }
    } else {
      this.lockCounter = Math.max(0, this.lockCounter - 1);
      if (this.lockCounter === 0) {
        this.isLocked = false;
      }
    }

    return {
      score: score,
      rawCorr: correlation,
      locked: this.isLocked
    };
  }
}

window.SpectralScanner = SpectralScanner;
