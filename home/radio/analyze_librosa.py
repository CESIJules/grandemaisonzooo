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
            return {'error': 'Empty audio'}

        # --- 1. SEPARATION ---
        # Use a high margin for the harmonic component to filter out "muddy" modern mixes
        # margin=(4.0, 1.0) -> Harmonic must be 4x stronger than Percussive to be kept.
        # Percussive stays standard (1.0) to preserve BPM accuracy.
        y_harmonic, y_percussive = librosa.effects.hpss(y, margin=(4.0, 1.0))

        # --- 1.5 GLOBAL ANCHOR ---
        # Calculate a global BPM on the whole file to act as a stabilizer
        # This helps avoid "rhythmic aliases" (e.g. detecting 1.33x or 1.5x tempo)
        onset_env_global = librosa.onset.onset_strength(y=y_percussive, sr=sr, aggregate=np.median)
        t_global = librosa.feature.tempo(onset_envelope=onset_env_global, sr=sr)
        
        # Robustly extract scalar BPM
        if np.ndim(t_global) > 0:
            global_bpm = t_global[0] if len(t_global) > 0 else 120
        else:
            global_bpm = t_global

        # --- 2. BPM ANALYSIS (Hybrid Voting System) ---
        # We combine two analysis passes to get the best of both worlds:
        # 1. Standard Resolution (hop=512): Robust to noise and distortion (Good for 'Dirty' tracks)
        # 2. High Resolution (hop=256): Sensitive to fast details (Good for Trap/Drill hi-hats)
        
        window_time = 6.0 
        window_size = int(window_time * sr)
        step_size = int(window_size / 2)
        
        candidates = []
        weights = []

        def get_anchor_weight(candidate, anchor):
            if anchor == 0: return 1.0
            ratio = candidate / anchor
            
            # Exact match or octave (strong support)
            if 0.90 < ratio < 1.10: return 2.0
            if 1.90 < ratio < 2.10: return 1.5
            if 0.45 < ratio < 0.55: return 1.5
            
            # Common aliases (3/2, 4/3) - Penalize to avoid "drifting"
            # 1.33 (4/3) and 1.5 (3/2) are common errors
            if 1.25 < ratio < 1.75: return 0.5 
            
            return 0.8 # Neutral for others
        
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
                
                # Vote with Anchor Weighting
                w_std = get_anchor_weight(tempo_std, global_bpm)
                w_hi = get_anchor_weight(tempo_hi, global_bpm)

                if 50 < tempo_std < 220:
                    candidates.append(tempo_std)
                    weights.append(clarity_std * 1.2 * w_std) # Bonus for stability + Anchor
                    
                if 50 < tempo_hi < 220:
                    candidates.append(tempo_hi)
                    weights.append(clarity_hi * w_hi) # Pure clarity + Anchor
            except:
                continue
        
        # --- 3. AGGREGATION ---
        if not candidates:
            bpm = global_bpm if global_bpm > 0 else 120
        else:
            # Weighted Histogram
            bins = np.arange(50, 220, 1) # 1 BPM precision
            hist, bin_edges = np.histogram(candidates, bins=bins, weights=weights)
            
            best_bin_idx = np.argmax(hist)
            bpm = (bin_edges[best_bin_idx] + bin_edges[best_bin_idx+1]) / 2

        # --- 4. ENERGY & DANCEABILITY ---
        rms = librosa.feature.rms(y=y)[0]
        energy = np.mean(rms)
        
        # Danceability (using the global onset we already computed)
        danceability = np.std(onset_env_global)

        # --- 5. DOUBLE TIME CHECK (REMOVED) ---
        # We rely on the Hybrid Voting (High Res pass) and Global Anchor to find the correct octave.
        # Hardcoded energy checks often fail for Boom Bap (High Energy, Low BPM).

        # --- 6. KEY ---
        try:
            # 1. Tuning Correction
            if np.mean(np.abs(y_harmonic)) < 0.001:
                tuning = 0.0
            else:
                tuning = librosa.estimate_tuning(y=y_harmonic, sr=sr)
            
            # 2. Chroma CQT with Tuning
            # Filter out very low frequencies (often muddy 808s) by starting at C2 (approx 65Hz)
            chroma = librosa.feature.chroma_cqt(y=y_harmonic, sr=sr, tuning=tuning, fmin=librosa.note_to_hz('C2'))
            
            # 3. Median Aggregation (The "Modern" Fix)
            # Instead of averaging (which is sensitive to loud bridges/effects), we take the MEDIAN.
            # In modern loop-based music (Trap, Drill, Pop), the key is the set of notes present
            # >50% of the time. Median captures this perfectly and ignores transient noise.
            chroma_vals = np.median(chroma, axis=1)
            
            # 4. Temperley Profiles (Robust for Modern Music)
            maj_profile = np.array([5.0, 2.0, 3.5, 2.0, 4.5, 4.0, 2.0, 4.5, 2.0, 3.5, 1.5, 4.0])
            min_profile = np.array([5.0, 2.0, 3.5, 4.5, 2.0, 4.0, 2.0, 4.5, 3.5, 2.0, 1.5, 4.0])
            
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
        except:
            key_idx = 0
            mode = 1

        return {
            'bpm': round(float(bpm), 1),
            'key_key': int(key_idx),
            'key_mode': int(mode),
            'energy': round(float(energy * 10), 2), # Scale up
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
