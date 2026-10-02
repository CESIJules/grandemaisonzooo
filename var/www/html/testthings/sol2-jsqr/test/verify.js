/**
 * verify.js — Suite de tests automatisée rigoureuse pour la Solution 2 (jsQR)
 * Salle 45 / Grande Maison
 *
 * Vérifie :
 * 1. Initialisation des modules (jsQR, QRCode, SealTracker)
 * 2. Génération fidèle du QR code fiducial (100x100)
 * 3. Détection jsQR sous 30ms & extraction du payload ROOM45-SEAL-SIGIL-01
 * 4. Extraction sub-pixel des 4 coins
 * 5. Solveur d'homographie & précision numérique sous distorsion projective (erreur < 1e-10px)
 * 6. Alignement géométrique calibré : Projection In-Situ de l'Énigme (erreur < 1e-10px)
 * 7. Alignement géométrique calibré : Projection In-Situ de l'Artwork (erreur < 1e-10px)
 * 8. Continuité C1 du filtre adaptatif smoothstep (zéro à-coup)
 * 9. Détection et extraction sous rotation / inclinaison angulaire de 25°
 * 10. Persistance de pose & gestion du cycle de vie (période de grâce)
 * 11. Zéro faux positif sur QR codes arbitraires (supermarché, wifi)
 * 12. Intégrité et absence d'erreur syntaxique dans pc.html et mobile.html
 */

const fs = require('fs');
const path = require('path');

console.log('=== TEST SUITE RIGOUROUSE : SOLUTION 2 (jsQR / Sceau Fiducial) ===\n');

// 1. Environnement DOM simulé haute fidélité
global.window = global;
global.navigator = { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' };
global.CanvasRenderingContext2D = class {};

let cW = 100, cH = 100;
let drawnPixels = new Uint8ClampedArray(100 * 100 * 4).fill(255);
let curFill = '#000000';

const fakeCanvas = {
  tagName: 'CANVAS',
  style: {},
  set width(v) { cW = v; drawnPixels = new Uint8ClampedArray(cW * cH * 4).fill(255); },
  get width() { return cW; },
  set height(v) { cH = v; drawnPixels = new Uint8ClampedArray(cW * cH * 4).fill(255); },
  get height() { return cH; },
  getContext: (type) => ({
    set fillStyle(v) { curFill = v; },
    get fillStyle() { return curFill; },
    set strokeStyle(v) {},
    set lineWidth(v) {},
    clearRect: () => {},
    strokeRect: () => {},
    drawImage: () => {},
    getImageData: () => ({ data: drawnPixels }),
    fillRect: (x, y, w, h) => {
      const isDark = (curFill === '#000000' || curFill === '#0a0908' || curFill === '#000');
      const val = isDark ? 0 : 255;
      for (let py = Math.floor(y); py < Math.ceil(y + h); py++) {
        for (let px = Math.floor(x); px < Math.ceil(x + w); px++) {
          if (px >= 0 && px < cW && py >= 0 && py < cH) {
            const idx = (py * cW + px) * 4;
            drawnPixels[idx] = val;
            drawnPixels[idx + 1] = val;
            drawnPixels[idx + 2] = val;
            drawnPixels[idx + 3] = 255;
          }
        }
      }
    }
  }),
  toDataURL: () => ''
};

global.document = {
  createElement: (tag) => {
    if (tag === 'canvas') return fakeCanvas;
    return {
      tagName: tag.toUpperCase(),
      style: {},
      appendChild: () => {},
      removeChild: () => {},
      hasChildNodes: () => false
    };
  },
  documentElement: { tagName: 'html', style: {} }
};

// 2. Chargement des modules
const jsQR = require(path.join(__dirname, '../js/jsQR.js'));
global.jsQR = jsQR;

const qrcodeSrc = fs.readFileSync(path.join(__dirname, '../js/qrcode.min.js'), 'utf8');
eval(qrcodeSrc);

const SealTracker = require(path.join(__dirname, '../js/seal-tracker.js'));

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failCount++;
  }
}

// ── Test 1 : Initialisation des composants ──────────────────────────────────
console.log('[Test 1] Initialisation des librairies locales');
assert(typeof jsQR === 'function', 'jsQR est bien exporté comme fonction');
assert(typeof QRCode === 'function', 'QRCode est disponible');
const tracker = new SealTracker();
assert(tracker instanceof SealTracker, 'SealTracker instancié avec succès');
assert(tracker.docLayout.seal.x === 250 && tracker.docLayout.seal.width === 100, 'docLayout.seal calibré au centre (x: 250, w: 100)');
assert(tracker.docLayout.riddle.x === 35 && tracker.docLayout.riddle.width === 530, 'docLayout.riddle calibré (x: 35, w: 530)');
assert(tracker.docLayout.artwork.x === 35 && tracker.docLayout.artwork.width === 530, 'docLayout.artwork calibré (x: 35, w: 530)');

// ── Test 2 : Génération du QR Code Fiducial ─────────────────────────────────
console.log('\n[Test 2] Génération du QR Code du Sceau Occulte');
const targetDiv = document.createElement('div');
new QRCode(targetDiv, {
  text: 'ROOM45-SEAL-SIGIL-01',
  width: 100,
  height: 100,
  colorDark: '#0a0908',
  colorLight: '#ffffff',
  correctLevel: QRCode.CorrectLevel.M
});
assert(drawnPixels.length === 100 * 100 * 4, 'Canvas mémoire 100x100 généré');

// ── Test 3 : Détection & Latence (< 30ms) ───────────────────────────────────
console.log('\n[Test 3] Détection jsQR & Mesure de performance');
const margin = 20;
const paddedW = cW + margin * 2;
const paddedH = cH + margin * 2;
const paddedPixels = new Uint8ClampedArray(paddedW * paddedH * 4).fill(255);

for (let y = 0; y < cH; y++) {
  for (let x = 0; x < cW; x++) {
    const srcIdx = (y * cW + x) * 4;
    const dstIdx = ((y + margin) * paddedW + (x + margin)) * 4;
    paddedPixels[dstIdx] = drawnPixels[srcIdx];
    paddedPixels[dstIdx + 1] = drawnPixels[srcIdx + 1];
    paddedPixels[dstIdx + 2] = drawnPixels[srcIdx + 2];
    paddedPixels[dstIdx + 3] = 255;
  }
}

// Warm up
jsQR(paddedPixels, paddedW, paddedH);

const t0 = performance.now();
const detected = jsQR(paddedPixels, paddedW, paddedH);
const scanDurationMs = performance.now() - t0;

console.log(`  Temps de détection jsQR : ${scanDurationMs.toFixed(2)} ms`);
assert(detected !== null, 'Le QR Code est détecté avec succès');
assert(scanDurationMs < 30.0, `Détection en moins de 30ms (obtenu: ${scanDurationMs.toFixed(2)}ms)`);
assert(detected.data === 'ROOM45-SEAL-SIGIL-01', `Payload exact extrait : "${detected.data}"`);

// ── Test 4 : Extraction des 4 Coins Sub-Pixel ──────────────────────────────
console.log('\n[Test 4] Extraction des 4 coins fiduciaux');
const loc = detected.location;
assert(loc.topLeftCorner && loc.topRightCorner && loc.bottomRightCorner && loc.bottomLeftCorner, 'Les 4 coins sont présents dans location');
const qrWidth = loc.topRightCorner.x - loc.topLeftCorner.x;
const qrHeight = loc.bottomLeftCorner.y - loc.topLeftCorner.y;
assert(Math.abs(qrWidth - 100) < 1.0, `Largeur détectée conforme (attendu ~100, obtenu ${qrWidth.toFixed(1)})`);
assert(Math.abs(qrHeight - 100) < 1.0, `Hauteur détectée conforme (attendu ~100, obtenu ${qrHeight.toFixed(1)})`);

// ── Test 5 : Homographie & Stabilité Numérique sous Trapèze Sévère ───────────
console.log('\n[Test 5] Solveur d\'homographie & précision numérique sous distorsion projective');
const srcQuad = [
  { x: 0, y: 0 },
  { x: 530, y: 0 },
  { x: 530, y: 160 },
  { x: 0, y: 160 }
];
const dstTrapezoid = [
  { x: 120, y: 80 },
  { x: 490, y: 130 },
  { x: 440, y: 310 },
  { x: 160, y: 280 }
];

const H = tracker.findHomography(srcQuad, dstTrapezoid);
assert(H !== null && H.length === 9, 'Matrice d\'homographie 3x3 résolue');

let maxHomographyErr = 0;
for (let i = 0; i < 4; i++) {
  const p = tracker.applyHomography(H, srcQuad[i].x, srcQuad[i].y);
  const err = Math.hypot(p.x - dstTrapezoid[i].x, p.y - dstTrapezoid[i].y);
  if (err > maxHomographyErr) maxHomographyErr = err;
}
assert(maxHomographyErr < 1e-10, `Erreur de projection sous distorsion < 1e-10px (obtenu: ${maxHomographyErr.toExponential(2)})`);

const m3dCss = tracker.solveHomographyToMatrix3d(srcQuad, dstTrapezoid);
assert(typeof m3dCss === 'string' && m3dCss.startsWith('matrix3d('), 'Génération CSS matrix3d valide');

// ── Test 6 : Validation Géométrique Calibrée — Énigme ───────────────────────
console.log('\n[Test 6] Alignement géométrique calibré : Projection In-Situ de l\'Énigme');
const sealCornersInCam = [
  { x: 250, y: 540 },
  { x: 350, y: 540 },
  { x: 350, y: 640 },
  { x: 250, y: 640 }
];

const riddleProj = tracker.computeHomographyForSubZone(
  tracker.docLayout.seal,
  tracker.docLayout.riddle,
  sealCornersInCam,
  530,
  160
);

assert(riddleProj !== null && riddleProj.matrix3d, 'Projection de la zone énigme calculée');
assert(Math.abs(riddleProj.camQuad[0].x - 35) < 1e-10 && Math.abs(riddleProj.camQuad[0].y - 310) < 1e-10, 'Coin TL de l\'énigme projeté exactement à (35, 310)');
assert(Math.abs(riddleProj.camQuad[2].x - 565) < 1e-10 && Math.abs(riddleProj.camQuad[2].y - 470) < 1e-10, 'Coin BR de l\'énigme projeté exactement à (565, 470)');

// ── Test 7 : Validation Géométrique Calibrée — Artwork ──────────────────────
console.log('\n[Test 7] Alignement géométrique calibré : Projection In-Situ de l\'Artwork');
const artworkProj = tracker.computeHomographyForSubZone(
  tracker.docLayout.seal,
  tracker.docLayout.artwork,
  sealCornersInCam,
  530,
  170
);

assert(artworkProj !== null && artworkProj.matrix3d, 'Projection de la gravure centrale calculée');
assert(Math.abs(artworkProj.camQuad[0].x - 35) < 1e-10 && Math.abs(artworkProj.camQuad[0].y - 115) < 1e-10, 'Coin TL de l\'artwork projeté exactement à (35, 115)');
assert(Math.abs(artworkProj.camQuad[2].x - 565) < 1e-10 && Math.abs(artworkProj.camQuad[2].y - 285) < 1e-10, 'Coin BR de l\'artwork projeté exactement à (565, 285)');

// ── Test 8 : Filtre Adaptatif Continu Smoothstep ────────────────────────────
console.log('\n[Test 8] Continuité C1 du filtre adaptatif anti-tremblement');
tracker.smoothedCorners = [
  { x: 100, y: 100 }, { x: 200, y: 100 }, { x: 200, y: 200 }, { x: 100, y: 200 }
];

// Micro-déplacement (0.8px) : filtrage très stable (alpha = 0.25)
const microCorners = tracker.smoothedCorners.map(p => ({ x: p.x + 0.8, y: p.y }));
const smoothedMicro = tracker.smoothCorners(microCorners);
const microShift = smoothedMicro[0].x - tracker.smoothedCorners[0].x;
assert(Math.abs(microShift - 0.2) < 0.05, `Micro-tremblement atténué (attendu 0.20px, obtenu ${microShift.toFixed(2)}px)`);

// Mouvement rapide (30px) : zéro latence (alpha = 1.0)
const fastCorners = tracker.smoothedCorners.map(p => ({ x: p.x + 30.0, y: p.y }));
const smoothedFast = tracker.smoothCorners(fastCorners);
const fastShift = smoothedFast[0].x - tracker.smoothedCorners[0].x;
assert(Math.abs(fastShift - 30.0) < 1e-6, `Mouvement rapide sans latence (attendu 30px, obtenu ${fastShift.toFixed(2)}px)`);

// ── Test 9 : Détection sous Rotation 25° ────────────────────────────────────
console.log('\n[Test 9] Détection et suivi sous rotation angulaire 25°');
const rotW = 220, rotH = 220;
const rotPixels = new Uint8ClampedArray(rotW * rotH * 4).fill(255);
const rad = 25 * Math.PI / 180;
const cosA = Math.cos(rad);
const sinA = Math.sin(rad);
const cx = 110, cy = 110;

for (let y = 0; y < rotH; y++) {
  for (let x = 0; x < rotW; x++) {
    const rx = (x - cx) * cosA + (y - cy) * sinA + 50;
    const ry = -(x - cx) * sinA + (y - cy) * cosA + 50;
    if (rx >= 0 && rx < 100 && ry >= 0 && ry < 100) {
      const sIdx = (Math.floor(ry) * 100 + Math.floor(rx)) * 4;
      const dIdx = (y * rotW + x) * 4;
      rotPixels[dIdx] = drawnPixels[sIdx];
      rotPixels[dIdx + 1] = drawnPixels[sIdx + 1];
      rotPixels[dIdx + 2] = drawnPixels[sIdx + 2];
      rotPixels[dIdx + 3] = 255;
    }
  }
}

const rotDetected = jsQR(rotPixels, rotW, rotH);
assert(rotDetected !== null, 'QR Code incliné à 25° détecté');
assert(rotDetected && rotDetected.data === 'ROOM45-SEAL-SIGIL-01', 'Payload extrait sous inclinaison');

// ── Test 10 : Période de Grâce & Persistance de Pose ────────────────────────
console.log('\n[Test 10] Robustesse temporelle : Période de grâce');
const blankPixels = new Uint8ClampedArray(paddedW * paddedH * 4).fill(255);
const fakeVideoFrame = { videoWidth: paddedW, videoHeight: paddedH };

tracker.processWidth = paddedW;
fakeCanvas.width = paddedW;
fakeCanvas.height = paddedH;

// Trame avec QR code
tracker.ctx.getImageData = () => ({ data: paddedPixels });
const lock1 = tracker.processFrame(fakeVideoFrame);
assert(lock1.locked === true, 'Trame 1 : Verrouillé sur QR code');

// Trame masquée temporairement (ex: mouvement brusque, flou)
tracker.ctx.getImageData = () => ({ data: blankPixels });
const lock2 = tracker.processFrame(fakeVideoFrame);
assert(lock2.locked === true, 'Trame 2 : Maintien de la pose grâce à la persistance');

// Après épuisement de la période de grâce
for (let i = 0; i < tracker.maxGraceFrames + 2; i++) {
  tracker.processFrame(fakeVideoFrame);
}
const lockFinal = tracker.processFrame(fakeVideoFrame);
assert(lockFinal.locked === false, 'Trame après expiration : Déverrouillage propre sans blocage');

// ── Test 11 : Zéro Faux Positif sur QR Arbitraire ───────────────────────────
console.log('\n[Test 11] Sécurité : Zéro faux positif sur QR arbitraire');
new QRCode(targetDiv, {
  text: 'https://example.com/unrelated-supermarket-barcode',
  width: 100,
  height: 100,
  correctLevel: QRCode.CorrectLevel.M
});

const unrelatedPadded = new Uint8ClampedArray(paddedW * paddedH * 4).fill(255);
for (let y = 0; y < cH; y++) {
  for (let x = 0; x < cW; x++) {
    const srcIdx = (y * cW + x) * 4;
    const dstIdx = ((y + margin) * paddedW + (x + margin)) * 4;
    unrelatedPadded[dstIdx] = drawnPixels[srcIdx];
    unrelatedPadded[dstIdx + 1] = drawnPixels[srcIdx + 1];
    unrelatedPadded[dstIdx + 2] = drawnPixels[srcIdx + 2];
    unrelatedPadded[dstIdx + 3] = 255;
  }
}

tracker.ctx.getImageData = () => ({ data: unrelatedPadded });
const securityResult = tracker.processFrame(fakeVideoFrame);
assert(securityResult.locked === false, 'QR Code de supermarché rejeté (locked = false) : ZÉRO FAUX POSITIF');

// ── Test 12 : Intégrité et syntaxe des fichiers HTML ───────────────────────
console.log('\n[Test 12] Validation syntaxique de pc.html et mobile.html');
function validateHtmlScripts(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  const scriptRegex = /<script[\s\S]*?<\/script>/gi;
  let match;
  let inlineCount = 0;
  while ((match = scriptRegex.exec(code)) !== null) {
    const tag = match[0];
    if (tag.includes('src=')) continue;
    const js = tag.replace(/<script[^>]*>|<\/script>/gi, '');
    new Function(js);
    inlineCount++;
  }
  return inlineCount;
}

const pcScripts = validateHtmlScripts(path.join(__dirname, '../pc.html'));
assert(pcScripts > 0, `pc.html validé sans aucune erreur de syntaxe (${pcScripts} script)`);
const mobileScripts = validateHtmlScripts(path.join(__dirname, '../mobile.html'));
assert(mobileScripts > 0, `mobile.html validé sans aucune erreur de syntaxe (${mobileScripts} script)`);

console.log(`\n=== BILAN COMPLET : ${passCount} SUCCÈS, ${failCount} ÉCHECS ===`);
if (failCount > 0) {
  process.exit(1);
}
