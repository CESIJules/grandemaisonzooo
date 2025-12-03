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
        # We load 50 seconds to have enough chunks
        y, sr = librosa.load(file_path, sr=22050, offset=offset, duration=50)
        
        if len(y) == 0:
            return {"error": "Empty audio"}

        # --- 1. SEPARATION ---
        y_harmonic, y_percussive = librosa.effects.hpss(y)

        # --- 2. ROBUST BPM (Windowed Voting) ---
        # Instead of analyzing the whole 50s at once (which can be confused by breakdowns),
        # we slice the track into 5-second windows and vote.
        
        window_size = 5 * sr # 5 seconds
        hop_length = int(2.5 * sr) # 50% overlap
        
        candidates = []
        weights = []
        
        # Iterate through windows
        for start in range(0, len(y_percussive) - window_size, hop_length):
            end = start + window_size
            y_chunk = y_percussive[start:end]
            
            # Skip silent chunks
            if np.mean(np.abs(y_chunk)) < 0.001:
                continue
                
        # --- 2. BPM ANALYSIS (Hybrid Voting System) ---
        # We combine two analysis passes to get the best of both worlds:
        # 1. Standard Resolution (hop=512): Robust to noise and distortion (Good for "Dirty" tracks)
        # 2. High Resolution (hop=256): Sensitive to fast details (Good for Trap/Drill hi-hats)
        
        window_time = 6.0 
        window_size = int(window_time * sr)
        step_size = int(window_size / 2)
        
        candidates = []
        weights = []
        
        # Iterate through windows
        for start in range(0, len(y_percussive) - window_size, step_size):
            end = start + window_size
            y_chunk = y_percussive[start:end]
            
            if np.mean(np.abs(y_chunk)) < 0.001: continue
                
            try:
                # PASS 1: Standard (Robust)
                hop_std = 512
                S_std = librosa.feature.melspectrogram(y=y_chunk, sr=sr, n_mels=128, fmax=8000, hop_length=hop_std)
                onset_std = librosa.onset.onset_strength(S=librosa.power_to_db(S_std, ref=np.max), sr=sr, hop_length=hop_std, aggregate=np.median)
                clarity_std = np.std(onset_std)
                
                t_std = librosa.feature.tempo(onset_envelope=onset_std, sr=sr, hop_length=hop_std, prior=None)
                tempo_std = t_std[0] if isinstance(t_std, np.ndarray) else t_std
                
                # PASS 2: High-Res (Sensitive)
                hop_hi = 256
                S_hi = librosa.feature.melspectrogram(y=y_chunk, sr=sr, n_mels=128, fmax=8000, hop_length=hop_hi)
                onset_hi = librosa.onset.onset_strength(S=librosa.power_to_db(S_hi, ref=np.max), sr=sr, hop_length=hop_hi, aggregate=np.median)
                clarity_hi = np.std(onset_hi)
                
                t_hi = librosa.feature.tempo(onset_envelope=onset_hi, sr=sr, hop_length=hop_hi, prior=None)
                tempo_hi = t_hi[0] if isinstance(t_hi, np.ndarray) else t_hi
                
                # Vote
                if 50 < tempo_std < 220:
                    candidates.append(tempo_std)
                    weights.append(clarity_std * 1.2) # Bonus for stability
                    
                if 50 < tempo_hi < 220:
                    candidates.append(tempo_hi)
                    weights.append(clarity_hi) # Pure clarity
            except:
                continue
        
        # --- 3. AGGREGATION ---
        if not candidates:
            bpm = 120 # Fail safe
        else:
            # Weighted Histogram
            bins = np.arange(50, 220, 1) # 1 BPM precision
            hist, bin_edges = np.histogram(candidates, bins=bins, weights=weights)
            
            best_bin_idx = np.argmax(hist)
            bpm = (bin_edges[best_bin_idx] + bin_edges[best_bin_idx+1]) / 2

        # --- 4. ENERGY & DANCEABILITY ---
        rms = librosa.feature.rms(y=y)[0]
        energy = np.mean(rms)
        
        # Recalculate global onset for danceability
        onset_env_global = librosa.onset.onset_strength(y=y, sr=sr)
        danceability = np.std(onset_env_global)

        # --- 5. DOUBLE TIME CHECK (Internal) ---
        # If energy is high and BPM is low, it's likely Trap/DnB
        # We do this here because we have the raw energy data
        # Threshold 0.1 is conservative for RMS
        if bpm < 100 and energy > 0.1: 
             bpm *= 2

        # --- 6. KEY ---
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
