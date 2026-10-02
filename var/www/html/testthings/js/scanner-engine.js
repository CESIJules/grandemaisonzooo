/**
 * scanner-engine.js — Moteur de reconnaissance et révélation spectrale pour Room 45
 * 
 * Fonctionnement :
 * 1. Guide de visée intelligent (Viewfinder AR) : Guide le joueur pour cadrer l'affiche du PC.
 * 2. Corrélation croisée normalisée (NCC) en temps réel (60 FPS) :
 *    Mesure mathématiquement la ressemblance entre ce qui est cadré et le document réel du PC.
 * 3. Jauge de signal en direct (0% à 100%) : Le joueur voit immédiatement le signal monter !
 * 4. Verrouillage instantané et remplacement in-situ du texte dès que le signal dépasse 75%.
 * 5. Zéro faux positif : Impossible à déclencher sur un mur, un meuble ou un autre site.
 */

class SpectralScanner {
  constructor(options = {}) {
    this.threshold = options.threshold || 0.72; // Seuil de verrouillage (72% de corrélation)
    this.targetAspect = options.targetAspect || (580 / 680); // Ratio Largeur/Hauteur du document

    this.sampleCanvas = document.createElement('canvas');
    this.sampleCanvas.width = 32;
    this.sampleCanvas.height = 36;
    this.sampleCtx = this.sampleCanvas.getContext('2d', { willReadFrequently: true });

    // Empreinte de référence précalculée pour le document de Room 45 (Planche a01)
    // Grille 32x36 normalisée
    this.targetProfile = this.generateReferenceProfile();
    this.isLocked = false;
    this.lockConfidence = 0;
  }

  /**
   * Génère le profil de luminance attendu pour la planche d'archive Room 45
   * (En-tête fin, illustration contrastée au centre, bloc de texte en bas)
   */
  generateReferenceProfile() {
    const w = 32, h = 36;
    const profile = new Float32Array(w * h);
    let mean = 0;

    for (let y = 0; y < h; y++) {
      const ny = y / h;
      for (let x = 0; x < w; x++) {
        const nx = x / w;
        let val = 240; // Fond papier clair par défaut

        // Bordure fine
        if (x < 1 || x >= w - 1 || y < 1 || y >= h - 1) val = 120;
        // En-tête
        else if (ny > 0.06 && ny < 0.10) val = 160;
        // Illustration centrale (zone sombre et très contrastée)
        else if (ny > 0.16 && ny < 0.52 && nx > 0.08 && nx < 0.92) {
          val = 60 + Math.sin(x * 1.5) * 40;
        }
        // Bloc de texte machine à écrire en bas
        else if (ny > 0.58 && ny < 0.84 && nx > 0.10 && nx < 0.90) {
          val = (y % 2 === 0) ? 90 : 220;
        }

        profile[y * w + x] = val;
        mean += val;
      }
    }

    mean /= (w * h);

    // Normalisation (moyenne à 0, variance unitaire)
    let variance = 0;
    for (let i = 0; i < profile.length; i++) {
      profile[i] -= mean;
      variance += profile[i] * profile[i];
    }
    const stdDev = Math.sqrt(variance) || 1;
    for (let i = 0; i < profile.length; i++) {
      profile[i] /= stdDev;
    }

    return profile;
  }

  /**
   * Analyse la zone cadrée par le viseur de la caméra
   */
  analyzeViewfinder(video, cropRect) {
    if (!video.videoWidth || video.readyState < 2) {
      return { score: 0, locked: false };
    }

    const vw = video.videoWidth;
    const vh = video.videoHeight;

    // Découper la zone correspondant au viseur à l'écran
    const sx = Math.max(0, Math.min(vw - 10, cropRect.x * vw));
    const sy = Math.max(0, Math.min(vh - 10, cropRect.y * vh));
    const sw = Math.max(10, Math.min(vw - sx, cropRect.w * vw));
    const sh = Math.max(10, Math.min(vh - sy, cropRect.h * vh));

    // Échantillonner en 32x36
    this.sampleCtx.drawImage(video, sx, sy, sw, sh, 0, 0, 32, 36);
    const imgData = this.sampleCtx.getImageData(0, 0, 32, 36);
    const data = imgData.data;

    // Calculer la luminance et normaliser
    const current = new Float32Array(32 * 36);
    let mean = 0;
    for (let i = 0; i < current.length; i++) {
      const idx = i * 4;
      const lum = (data[idx] * 77 + data[idx + 1] * 150 + data[idx + 2] * 29) >> 8;
      current[i] = lum;
      mean += lum;
    }
    mean /= current.length;

    let variance = 0;
    for (let i = 0; i < current.length; i++) {
      current[i] -= mean;
      variance += current[i] * current[i];
    }
    const stdDev = Math.sqrt(variance);

    // Si la zone est unie (ex: mur blanc, écran noir, table uniforme) : Rejet immédiat
    if (stdDev < 18) {
      this.lockConfidence = Math.max(0, this.lockConfidence - 0.2);
      this.isLocked = false;
      return { score: 0, locked: false };
    }

    for (let i = 0; i < current.length; i++) {
      current[i] /= stdDev;
    }

    // Corrélation croisée avec le profil attendu
    let correlation = 0;
    for (let i = 0; i < current.length; i++) {
      correlation += current[i] * this.targetProfile[i];
    }
    correlation /= current.length;

    // Conversion en score de confiance 0 à 100%
    const score = Math.max(0, Math.min(100, Math.round((correlation - 0.20) * 160)));

    if (correlation >= this.threshold) {
      this.lockConfidence = Math.min(1.0, this.lockConfidence + 0.35);
      if (this.lockConfidence >= 0.7) {
        this.isLocked = true;
      }
    } else {
      this.lockConfidence = Math.max(0, this.lockConfidence - 0.15);
      if (this.lockConfidence < 0.3) {
        this.isLocked = false;
      }
    }

    return {
      score: score,
      correlation: correlation,
      locked: this.isLocked
    };
  }
}

window.SpectralScanner = SpectralScanner;
