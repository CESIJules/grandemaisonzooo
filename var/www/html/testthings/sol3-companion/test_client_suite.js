/**
 * test_client_suite.js — Suite de tests automatisée pour Solution 3 ARG
 * Valide qr.js, spectral.js, audio.js, sync-client.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

console.log('=== SUITE DE TEST AUTOMATISÉE SOLUTION 3 (ARG COMPANION) ===\n');

// ── 1. Test de qr.js ────────────────────────────────────────────────────────
console.log('1. Test du générateur de QR Code (qr.js)...');
const qrCode = fs.readFileSync(path.join(__dirname, 'js/qr.js'), 'utf8');
const qrSandbox = { window: {}, console: console };
qrSandbox.window = qrSandbox;
vm.createContext(qrSandbox);
vm.runInContext(qrCode, qrSandbox);
const ARGQRCode = qrSandbox.ARGQRCode;

assert(ARGQRCode && ARGQRCode.Model, 'ARGQRCode.Model doit exister');

// Test 1.1 : URL courte (~50 chars)
const shortUrl = 'https://grandemaisonzoo.com/testthings/sol3-companion/mobile.html?session=R45-A1B2';
const modelShort = new ARGQRCode.Model(0, 0);
modelShort.addData(shortUrl);
modelShort.make();
assert(modelShort.getModuleCount() > 20, 'Module count URL courte > 20');
console.log(`   ✓ URL standard (${shortUrl.length} car.) générée: ${modelShort.getModuleCount()}x${modelShort.getModuleCount()} modules`);

// Test 1.2 : URL longue (> 230 chars, dépasse Version 10)
const longUrl = 'https://grandemaisonzoo.com/testthings/sol3-companion/mobile.html?session=R45-12345678901234567890&extra=parameters_that_can_occur_in_real_world_networks_when_using_proxies_or_auth_tokens_and_much_longer_strings_that_exceed_version_10';
const modelLong = new ARGQRCode.Model(0, 0);
modelLong.addData(longUrl);
modelLong.make();
assert(modelLong.getModuleCount() >= 57, 'Module count URL longue doit dépasser Version 10');
console.log(`   ✓ URL longue (${longUrl.length} car.) générée sans crash: ${modelLong.getModuleCount()}x${modelLong.getModuleCount()} modules (Version ${modelLong.typeNumber})`);

// ── 2. Test de spectral.js ──────────────────────────────────────────────────
console.log('\n2. Test du moteur spectral (spectral.js)...');

// Mock DOM Canvas et Contexte 2D
function createMockCanvas(width, height) {
  const pixels = new Uint8Array(width * height * 4);
  return {
    width,
    height,
    tagName: 'CANVAS',
    getContext: (type) => ({
      drawImage: (src, sx, sy, sw, sh, dx, dy, dw, dh) => {},
      getImageData: (x, y, w, h) => ({
        data: pixels,
        width: w,
        height: h
      }),
      putImageData: (imgData, x, y) => {},
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      strokeRect: () => {},
      fillText: () => {}
    })
  };
}

const spectralCode = fs.readFileSync(path.join(__dirname, 'js/spectral.js'), 'utf8');
const spectralSandbox = {
  window: {},
  document: {
    createElement: (tag) => {
      if (tag === 'canvas') return createMockCanvas(80, 80);
      return {};
    }
  },
  Uint32Array: Uint32Array,
  console: console
};
spectralSandbox.window = spectralSandbox;
vm.createContext(spectralSandbox);
vm.runInContext(spectralCode, spectralSandbox);
const SpectralEngine = spectralSandbox.SpectralEngine;

assert(SpectralEngine, 'SpectralEngine doit exister');
const engine = new SpectralEngine({ threshold: 0.65 });

// Test 2.1 : Analyse d'un mock canvas
const testCanvas = createMockCanvas(640, 480);
const analysis = engine.analyzeCenter(testCanvas);
assert(typeof analysis.score === 'number', 'Le score doit être un nombre');
assert(typeof analysis.locked === 'boolean', 'locked doit être un booléen');
console.log(`   ✓ Analyse optique opérationnelle: score initial = ${analysis.score}%, locked = ${analysis.locked}`);

// Test 2.2 : Capture et application des filtres spectraux
const destCanvas = createMockCanvas(640, 480);
engine.captureAndFilter(testCanvas, destCanvas, 'xray');
assert(engine.rawCanvas !== null, 'rawCanvas doit conserver la capture brute');
console.log('   ✓ captureAndFilter (X-Ray Négatif) exécuté avec succès');

engine.reapplyFilter(destCanvas, 'thermal');
console.log('   ✓ reapplyFilter (Thermique UV) appliqué sur la capture brute');

engine.reapplyFilter(destCanvas, 'phosphor');
console.log('   ✓ reapplyFilter (Phosphore CRT) appliqué sur la capture brute');

engine.resetScore();
assert(engine.currentScore === 0, 'resetScore doit réinitialiser currentScore');
console.log('   ✓ resetScore réinitialise les métriques');

// ── 3. Test de audio.js ─────────────────────────────────────────────────────
console.log('\n3. Test du moteur audio procédural (audio.js)...');
const audioCode = fs.readFileSync(path.join(__dirname, 'js/audio.js'), 'utf8');

class MockAudioContext {
  constructor() {
    this.currentTime = 0;
    this.state = 'running';
    this.sampleRate = 44100;
    this.destination = {};
  }
  createGain() {
    return {
      gain: {
        setValueAtTime: () => {},
        setTargetAtTime: () => {},
        linearRampToValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {}
      },
      connect: () => {},
      disconnect: () => {}
    };
  }
  createOscillator() {
    return {
      frequency: {
        setValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {}
      },
      type: 'sine',
      connect: () => {},
      disconnect: () => {},
      start: () => {},
      stop: () => {}
    };
  }
  createBiquadFilter() {
    return {
      frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
      Q: { setValueAtTime: () => {} },
      type: 'lowpass',
      connect: () => {},
      disconnect: () => {}
    };
  }
  createBuffer(channels, length, sampleRate) {
    return {
      getChannelData: () => new Float32Array(length)
    };
  }
  createBufferSource() {
    return {
      buffer: null,
      connect: () => {},
      disconnect: () => {},
      start: () => {},
      stop: () => {}
    };
  }
  createAnalyser() {
    return {
      fftSize: 64,
      smoothingTimeConstant: 0.8,
      connect: () => {},
      disconnect: () => {},
      getByteFrequencyData: (arr) => arr.fill(128)
    };
  }
}

const audioSandbox = {
  window: {
    addEventListener: () => {},
    removeEventListener: () => {}
  },
  AudioContext: MockAudioContext,
  console: console
};
audioSandbox.window = audioSandbox;
vm.createContext(audioSandbox);
vm.runInContext(audioCode, audioSandbox);
const ARGAudio = audioSandbox.ARGAudio;

assert(ARGAudio, 'ARGAudio doit être instancié');
ARGAudio.init();
assert(ARGAudio.analyser !== null, 'AnalyserNode doit être configuré');

const freqArr = new Uint8Array(24);
const gotFreq = ARGAudio.getFrequencyData(freqArr);
assert(gotFreq === true, 'getFrequencyData doit retourner true');
assert(freqArr[0] === 128, 'Fréquence mock lue');
console.log('   ✓ AnalyserNode Web Audio actif avec lecture spectrale');

ARGAudio.playBeep(440, 0.05);
ARGAudio.playLockTone();
ARGAudio.playScanningPulse(0.5);
ARGAudio.playShutter();
ARGAudio.playDecryptionTick(1.2);
ARGAudio.playRevelationBoom();
console.log('   ✓ Tous les générateurs procéduraux (Beep, Lock, Pulse, Shutter, DecryptionTick, Boom) exécutés sans erreur');

// ── 4. Test de sync-client.js ───────────────────────────────────────────────
console.log('\n4. Test du client de synchronisation (sync-client.js)...');
const syncCode = fs.readFileSync(path.join(__dirname, 'js/sync-client.js'), 'utf8');

class MockBroadcastChannel {
  constructor(name) {
    this.name = name;
    this.onmessage = null;
  }
  postMessage(data) {}
  close() {}
}

const win = {
  BroadcastChannel: MockBroadcastChannel,
  location: { search: '?session=R45-TEST' },
  URLSearchParams: URLSearchParams
};
win.window = win;

const syncSandbox = {
  window: win,
  location: win.location,
  URLSearchParams: URLSearchParams,
  setInterval: setInterval,
  clearInterval: clearInterval,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  fetch: async (url) => {
    // Simuler le fallback si fetch échoue (ex: réseau indisponible)
    throw new Error('Simulated Network Down');
  },
  console: console
};
vm.createContext(syncSandbox);
vm.runInContext(syncCode, syncSandbox);
const ARGSyncClient = win.ARGSyncClient || syncSandbox.ARGSyncClient;

assert(ARGSyncClient, 'ARGSyncClient doit être défini');
const client = new ARGSyncClient({ role: 'pc' });
assert(client.sessionId === 'R45-TEST', 'L extraction de la session URL doit fonctionner');

let receivedState = null;
client.onStateChange((state) => {
  receivedState = state;
});

// Test fallback offline automatique
client.init().then(async (sid) => {
  assert(sid === 'R45-TEST', 'Session ID conservé en mode offline');
  assert(client.isStandalone === true, 'Bascule automatique en mode standalone offline');
  console.log('   ✓ Initialisation robuste avec bascule autonome fail-safe (isStandalone = true)');

  await client.notifyScanStart();
  assert(client.currentState === 'scanning', 'État scanning émis');
  console.log('   ✓ notifyScanStart émis et synchronisé localement');

  await client.notifyReveal('SUFFOCATION');
  assert(client.currentState === 'revealed', 'État revealed émis');
  console.log('   ✓ notifyReveal émis et synchronisé localement');

  await client.rescanSession();
  assert(client.currentState === 'connected', 'État connected après rescan');
  console.log('   ✓ rescanSession réinitialise à connected pour un nouveau scan');

  await client.resetSession();
  assert(client.currentState === 'standby', 'État standby après reset');
  console.log('   ✓ resetSession réinitialise à standby');

  client.stopPolling();
  console.log('\n>>> TOUS LES TESTS JAVASCRIPT ET ALGORITHMIQUES ONT RÉUSSI AVEC SUCCÈS ! <<<');
});
