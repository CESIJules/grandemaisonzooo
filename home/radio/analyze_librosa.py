import sys
import os

# Set Numba cache dir to a writable location just in case
os.environ['NUMBA_CACHE_DIR'] = '/tmp'

# Redirect stderr to null immediately to prevent library warnings from breaking JSON output
try:
    sys.stderr = open(os.devnull, 'w')
except:
    pass

import json
import numpy as np
import librosa
import warnings

# Suppress warnings
warnings.filterwarnings('ignore')

def analyze_audio(file_path):
    try:
        # --- LOAD AUDIO ---
        # Load 60 seconds to get a good representation
        duration = librosa.get_duration(path=file_path)
        
        offset = 30
        if duration < 60:
            offset = 0
        elif duration > 120:
            offset = (duration / 2) - 30
            
        y, sr = librosa.load(file_path, sr=22050, offset=offset, duration=60)
        
        if len(y) == 0:
            return {'error': 'Empty audio'}

        # --- 1. BPM ANALYSIS (Standard Global Anchor) ---
        # We use standard HPSS for separation
        y_harmonic, y_percussive = librosa.effects.hpss(y)
        
        # Global BPM (The Anchor)
        # Use beat_track which is very robust for finding the main pulse
        tempo, _ = librosa.beat.beat_track(y=y_percussive, sr=sr)
        global_bpm = tempo
        
        # Windowed Analysis to refine stability
        window_time = 6.0
        window_size = int(window_time * sr)
        step_size = int(window_size / 2)
        
        candidates = []
        
        for start in range(0, len(y_percussive) - window_size, step_size):
            end = start + window_size
            y_chunk = y_percussive[start:end]
            
            # Skip silent chunks
            if np.mean(np.abs(y_chunk)) < 0.001: continue
            
            # Local tempo estimation guided by global_bpm
            onset_env = librosa.onset.onset_strength(y=y_chunk, sr=sr)
            t = librosa.feature.tempo(onset_envelope=onset_env, sr=sr, start_bpm=global_bpm)
            
            local_bpm = t[0] if isinstance(t, np.ndarray) else t
            
            # Only keep candidates that are somewhat related to the global anchor
            # (Same octave, or close)
            ratio = local_bpm / global_bpm
            if 0.8 < ratio < 1.2 or 1.8 < ratio < 2.2 or 0.4 < ratio < 0.6:
                candidates.append(local_bpm)
        
        # Aggregation
        if not candidates:
            bpm = global_bpm
        else:
            # Simple median of valid candidates is very robust
            bpm = np.median(candidates)

        # --- 2. KEY ANALYSIS (Chroma CENS) ---
        # CENS (Chroma Energy Normalized Statistics) is robust to loudness and timbre
        # It smooths the chroma over time, making it perfect for global key detection
        
        # Tuning correction first
        tuning = librosa.estimate_tuning(y=y_harmonic, sr=sr)
        
        # CENS with tuning
        # fmin=C1 to avoid low rumble, n_octaves=7
        chroma_cens = librosa.feature.chroma_cens(y=y_harmonic, sr=sr, tuning=tuning, fmin=librosa.note_to_hz('C1'))
        
        # Sum over time (CENS is already normalized, so sum is fine)
        chroma_vals = np.sum(chroma_cens, axis=1)
        
        # Standard Profiles (Krumhansl-Schmuckler)
        # These work well with CENS
        maj_profile = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
        min_profile = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
        
        maj_corrs = []
        min_corrs = []
        
        for i in range(12):
            maj_corrs.append(np.corrcoef(np.roll(maj_profile, i), chroma_vals)[0, 1])
            min_corrs.append(np.corrcoef(np.roll(min_profile, i), chroma_vals)[0, 1])
            
        max_maj = np.max(maj_corrs)
        max_min = np.max(min_corrs)
        
        if max_maj > max_min:
            key_idx = np.argmax(maj_corrs)
            mode = 1 # Major
        else:
            key_idx = np.argmax(min_corrs)
            mode = 0 # Minor

        # --- 3. ENERGY & DANCEABILITY ---
        rms = librosa.feature.rms(y=y)[0]
        energy = np.mean(rms)
        
        # Danceability: variance of the global onset envelope
        onset_env_global = librosa.onset.onset_strength(y=y_percussive, sr=sr)
        danceability = np.std(onset_env_global)

        return {
            'bpm': round(float(bpm), 1),
            'key_key': int(key_idx),
            'key_mode': int(mode),
            'energy': round(float(energy * 10), 2),
            'danceability': round(float(danceability), 2)
        }

    except Exception as e:
        return {'error': str(e)}

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'No file provided'}))
        sys.exit(1)
        
    file_path = sys.argv[1]
    # Ensure file exists
    if not os.path.exists(file_path):
        print(json.dumps({'error': f'File not found: {file_path}'}))
        sys.exit(1)

    print(json.dumps(analyze_audio(file_path)))
