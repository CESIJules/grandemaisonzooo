import sys
import json
import os
import numpy as np
import warnings

# Attempt to prevent segfaults related to Threading (keep JIT enabled as disabling it causes errors in recent librosa)
os.environ['OMP_NUM_THREADS'] = '1'
os.environ['MKL_NUM_THREADS'] = '1'

# Suppress warnings to keep stdout clean for JSON
warnings.filterwarnings('ignore')

def analyze_track(file_path):
    try:
        import librosa
    except ImportError:
        return {"error": "Librosa not installed"}

    try:
        # 1. Load only 15 seconds from the middle to save RAM
        # Get duration first (fast)
        try:
            duration = librosa.get_duration(path=file_path)
        except:
            duration = 30 # Fallback
            
        offset = max(0, (duration - 15) / 2)
        
        # OPTIMIZATION: sr=None avoids resampling (which is memory intensive and causes segfaults)
        # We will work with the native sample rate.
        y, sr = librosa.load(file_path, sr=None, mono=True, offset=offset, duration=15)

        # 2. BPM
        # Use a faster, lighter beat tracker if possible, or standard
        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
        bpm = float(tempo)

        # 3. Key (Simple Chroma)
        # Reduce resolution of STFT to save memory
        n_fft = 2048
        if len(y) < n_fft:
            n_fft = len(y)
            
        chroma = librosa.feature.chroma_stft(y=y, sr=sr, n_fft=n_fft)
        chroma_avg = np.mean(chroma, axis=1)
        
        # Simple template matching for Major/Minor
        maj_profile = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
        min_profile = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
        
        maj_corrs = []
        min_corrs = []
        for i in range(12):
            maj_corrs.append(np.corrcoef(np.roll(maj_profile, i), chroma_avg)[0, 1])
            min_corrs.append(np.corrcoef(np.roll(min_profile, i), chroma_avg)[0, 1])
            
        max_maj = np.max(maj_corrs)
        max_min = np.max(min_corrs)
        
        notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
        
        if max_maj > max_min:
            key_idx = np.argmax(maj_corrs)
            mode = 1 # Major
            key_str = notes[key_idx]
        else:
            key_idx = np.argmax(min_corrs)
            mode = 0 # Minor
            key_str = notes[key_idx]

        # 4. Energy (RMS)
        rms = librosa.feature.rms(y=y)
        energy = float(np.mean(rms))
        # Normalize energy roughly (0.0 to 0.3 is typical RMS, scale to 0-1)
        energy_norm = min(1.0, energy * 5) 

        # 5. Danceability (Heuristic based on beat strength)
        onset_env = librosa.onset.onset_strength(y=y, sr=sr)
        pulse = librosa.beat.plp(onset_envelope=onset_env, sr=sr)
        danceability = float(np.mean(pulse)) # Proxy for beat clarity
        
        return {
            "bpm": round(bpm),
            "key_key": key_idx,
            "key_mode": mode,
            "key_string": key_str + (" Major" if mode == 1 else " Minor"),
            "energy": round(energy_norm, 2),
            "danceability": round(danceability, 2),
            "valence": 0.5, 
            "acousticness": 0.0
        }

    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No file provided"}))
        sys.exit(1)
        
    file_path = sys.argv[1]
    if not os.path.exists(file_path):
        print(json.dumps({"error": "File not found"}))
        sys.exit(1)
        
    result = analyze_track(file_path)
    print(json.dumps(result))
