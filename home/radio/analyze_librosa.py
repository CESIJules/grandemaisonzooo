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
                
            # --- ROBUST ONSET DETECTION ---
            # 1. Broadband (up to 6000Hz) - General Rhythm
            S_broad = librosa.feature.melspectrogram(y=y_chunk, sr=sr, n_mels=128, fmax=6000)
            onset_broad = librosa.onset.onset_strength(S=librosa.power_to_db(S_broad, ref=np.max), sr=sr, aggregate=np.median)
            
            # 2. Low-End (20-250Hz) - The Kick/Sub Foundation
            # This is crucial for Trap/Drill/Techno where the kick drives everything and is often cleaner than the mids
            S_low = librosa.feature.melspectrogram(y=y_chunk, sr=sr, n_mels=64, fmin=20, fmax=250)
            onset_low = librosa.onset.onset_strength(S=librosa.power_to_db(S_low, ref=np.max), sr=sr, aggregate=np.median)
            
            # Combine: Give more weight to the low end (60%) as it's the most reliable timekeeper in modern music
            min_len = min(len(onset_broad), len(onset_low))
            onset_combined = 0.4 * onset_broad[:min_len] + 0.6 * onset_low[:min_len]
            
            # Pulse Clarity (Weight): How distinct is the beat?
            clarity = np.std(onset_combined)
            
            # Calculate Tempo for this chunk
            # prior=None removes the 120 BPM bias
            tempo_arr = librosa.feature.tempo(onset_envelope=onset_combined, sr=sr, prior=None)
            tempo = tempo_arr[0] if isinstance(tempo_arr, np.ndarray) else tempo_arr
            
            if 50 < tempo < 220:
                candidates.append(tempo)
                weights.append(clarity)
        
        if not candidates:
            # Fallback to global analysis if no windows worked (using same logic)
            S_broad = librosa.feature.melspectrogram(y=y_percussive, sr=sr, n_mels=128, fmax=6000)
            onset_broad = librosa.onset.onset_strength(S=librosa.power_to_db(S_broad, ref=np.max), sr=sr, aggregate=np.median)
            
            S_low = librosa.feature.melspectrogram(y=y_percussive, sr=sr, n_mels=64, fmin=20, fmax=250)
            onset_low = librosa.onset.onset_strength(S=librosa.power_to_db(S_low, ref=np.max), sr=sr, aggregate=np.median)
            
            min_len = min(len(onset_broad), len(onset_low))
            onset_combined = 0.4 * onset_broad[:min_len] + 0.6 * onset_low[:min_len]
            
            tempo_arr = librosa.feature.tempo(onset_envelope=onset_combined, sr=sr, prior=None)
            bpm = tempo_arr[0] if isinstance(tempo_arr, np.ndarray) else tempo_arr
        else:
            # Weighted Average of the top cluster
            # 1. Round candidates to group them
            candidates = np.array(candidates)
            weights = np.array(weights)
            
            # Find the most common BPM range (histogram)
            bins = np.arange(50, 220, 2) # 2 BPM bins
            hist, bin_edges = np.histogram(candidates, bins=bins, weights=weights)
            
            best_bin_idx = np.argmax(hist)
            best_bpm_center = (bin_edges[best_bin_idx] + bin_edges[best_bin_idx+1]) / 2
            
            # 2. Refine: Take weighted average of candidates close to this center
            mask = np.abs(candidates - best_bpm_center) <= 4 # +/- 4 BPM
            if np.sum(mask) > 0:
                bpm = np.average(candidates[mask], weights=weights[mask])
            else:
                bpm = best_bpm_center

        # --- 3. Key ---
        # Use ONLY the harmonic component for key detection
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
