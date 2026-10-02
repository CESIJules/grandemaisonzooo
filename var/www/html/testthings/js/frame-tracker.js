/**
 * frame-tracker.js — Détecteur de cadre d'image naturelle (Solution B)
 * Détecte les 4 coins du cadre rectangulaire de l'artwork/écran PC sans aucun marqueur ArUco
 * et calcule la matrice d'homographie en temps réel.
 */
class FrameTracker {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this.engine = new ArUcoEngine();
  }

  detect(videoElement, processWidth = 480) {
    if (!videoElement.videoWidth) return null;

    const scale = processWidth / videoElement.videoWidth;
    const w = processWidth;
    const h = Math.round(videoElement.videoHeight * scale);

    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }

    this.ctx.drawImage(videoElement, 0, 0, w, h);
    const imgData = this.ctx.getImageData(0, 0, w, h);
    const gray = this.engine.toGrayscale(imgData);
    const binary = this.engine.adaptiveThreshold(gray, w, h);
    const contours = this.engine.findContours(binary, w, h);

    // Trouver le plus grand quadrilatère convexe proche du centre
    let bestQuad = null;
    let maxArea = 0;
    const minArea = (w * h) * 0.08; // Au moins 8% de l'écran de la caméra

    for (const c of contours) {
      const approx = this.engine.approxPolyDP(c, this.engine.arcLength(c) * 0.035);
      if (approx.length === 4 && this.engine.isConvex(approx)) {
        const area = this.polygonArea(approx);
        if (area > maxArea && area >= minArea) {
          maxArea = area;
          bestQuad = this.engine.orderClockwise(approx);
        }
      }
    }

    if (!bestQuad) return null;

    // Remettre à l'échelle d'origine
    const invScale = 1 / scale;
    return bestQuad.map(p => ({
      x: p.x * invScale,
      y: p.y * invScale
    }));
  }

  polygonArea(pts) {
    let area = 0;
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += pts[i].x * pts[j].y;
      area -= pts[j].x * pts[i].y;
    }
    return Math.abs(area) / 2;
  }
}

window.FrameTracker = FrameTracker;
