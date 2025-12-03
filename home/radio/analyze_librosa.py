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
        # Load only 45 seconds (compromise)
        # Get duration first (lightweight)
        duration = librosa.get_duration(path=file_path)
        
        offset = 30
        if duration < 60:
            offset = 0
        elif duration > 120:
            offset = (duration / 2) - 30
            
        # Load audio
        # sr=22050 is standard for music analysis, mono=True saves RAM
        y, sr = librosa.load(file_path, sr=22050, offset=offset, duration=45)
        
        if len(y) == 0:
            return {"error": "Empty audio"}

        # --- 1. BPM ---
        # Use dynamic beat tracking
        onset_env = librosa.onset.onset_strength(y=y, sr=sr)
        tempo, _ = librosa.beat.beat_track(onset_envelope=onset_env, sr=sr)
        
        # Librosa returns a scalar or a 1-element array
        if isinstance(tempo, np.ndarray):
            bpm = tempo.item()
        else:
            bpm = tempo

        # --- 2. Key ---
        # Harmonic-Percussive separation (better for key detection)
        y_harmonic, _ = librosa.effects.hpss(y)
        chroma = librosa.feature.chroma_cqt(y=y_harmonic, sr=sr)
        
        # Sum over time
        chroma_vals = np.sum(chroma, axis=1)
        
        # Major/Minor profiles
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

        # --- 3. Energy & Danceability ---
        rms = librosa.feature.rms(y=y)[0]
        energy = np.mean(rms)
        
        # Danceability proxy: Pulse clarity / beat strength
        # We use the variance of the onset envelope as a proxy for "punchiness"
        danceability = np.std(onset_env)

        return {
            "bpm": round(float(bpm), 1),
            "key_key": int(key_idx),
            "key_mode": int(mode),
            "energy": round(float(energy * 10), 2), # Scale up
            "danceability": round(float(danceability), 2)
        }

    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No file provided"}))
        sys.exit(1)
        
    file_path = sys.argv[1]
    # Ensure file exists
    if not os.path.exists(file_path):
        print(json.dumps({"error": f"File not found: {file_path}"}))
        sys.exit(1)

    print(json.dumps(analyze_audio(file_path)))
