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
        # Load 50 seconds (Standard)
        duration = librosa.get_duration(path=file_path)
        
        offset = 30
        if duration < 60:
            offset = 0
        elif duration > 120:
            offset = (duration / 2) - 30
            
        y, sr = librosa.load(file_path, sr=22050, offset=offset, duration=50)
        
        if len(y) == 0:
            return {'error': 'Empty audio'}

        # --- 1. SEPARATION ---
        # Standard HPSS (margin 1.0) preserves more detail than high-margin
        # This is better for key detection in complex mixes
        y_harmonic, y_percussive = librosa.effects.hpss(y, margin=1.0)

        # --- 2. BPM ANALYSIS (Classic Global Anchor) ---
        # This method was the most stable in our tests.
        # It uses a global tempo estimation to guide local windows.
        
        # Global Anchor
        onset_env_global = librosa.onset.onset_strength(y=y_percussive, sr=sr, aggregate=np.median)
        t_global = librosa.feature.tempo(onset_envelope=onset_env_global, sr=sr)
        global_bpm = t_global[0] if len(t_global) > 0 else 120
        
        # Windowed Analysis
        window_time = 6.0
        window_size = int(window_time * sr)
        step_size = int(window_size / 2)
        
        candidates = []
        weights = []
        
        for start in range(0, len(y_percussive) - window_size, step_size):
            end = start + window_size
            y_chunk = y_percussive[start:end]
            
            if np.mean(np.abs(y_chunk)) < 0.001: continue
            
            try:
                # Standard Onset Strength
                onset_env = librosa.onset.onset_strength(y=y_chunk, sr=sr)
                clarity = np.std(onset_env)
                
                # Guide local estimation with global anchor
                t = librosa.feature.tempo(onset_envelope=onset_env, sr=sr, start_bpm=global_bpm)
                local_bpm = t[0] if isinstance(t, np.ndarray) else t
                
                # Weighting: Clarity * Proximity to Anchor
                ratio = local_bpm / global_bpm
                anchor_weight = 1.0
                
                # Bonus for being close to anchor or related octaves
                if 0.9 < ratio < 1.1: anchor_weight = 2.0 
                elif 1.9 < ratio < 2.1: anchor_weight = 1.5
                elif 0.45 < ratio < 0.55: anchor_weight = 1.5
                
                if 50 < local_bpm < 220:
                    candidates.append(local_bpm)
                    weights.append(clarity * anchor_weight)
            except:
                continue
        
        # Aggregation (Weighted Histogram)
        if not candidates:
            bpm = global_bpm
        else:
            bins = np.arange(50, 220, 1)
            hist, bin_edges = np.histogram(candidates, bins=bins, weights=weights)
            best_bin_idx = np.argmax(hist)
            bpm = (bin_edges[best_bin_idx] + bin_edges[best_bin_idx+1]) / 2

        # --- 3. KEY ANALYSIS (Chroma CQT + Median) ---
        # We revert to CQT + Median because CENS was too smooth for Trap/Drill.
        # Median aggregation is excellent for ignoring noise in loop-based music.
        
        # Tuning Correction
        tuning = librosa.estimate_tuning(y=y_harmonic, sr=sr)
        
        # CQT (Sharp frequency resolution)
        chroma = librosa.feature.chroma_cqt(y=y_harmonic, sr=sr, tuning=tuning, fmin=librosa.note_to_hz('C2'))
        
        # Median Aggregation (The "Modern" Fix)
        chroma_vals = np.median(chroma, axis=1)
        
        # Temperley Profiles (Robust)
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

        # --- 4. ENERGY & DANCEABILITY (Tunebat-style) ---
        
        # A. ENERGY
        # 1. RMS (Loudness)
        rms = librosa.feature.rms(y=y)[0]
        rms_val = np.mean(rms)
        # Normalize RMS. 
        # 0.05 (-26dB) -> Low Energy
        # 0.20 (-14dB) -> High Energy
        feat_loudness = min(1.0, rms_val / 0.15) 
        
        # 2. Spectral Centroid (Brightness)
        cent = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
        cent_val = np.mean(cent)
        # Normalize Centroid (typical 500 to 5000)
        feat_brightness = min(1.0, cent_val / 3500.0)
        
        # 3. Onset Density (Busyness)
        onset_env = librosa.onset.onset_strength(y=y, sr=sr)
        onset_density = np.mean(onset_env)
        # Normalize (typical 0.5 to 2.0)
        feat_density = min(1.0, onset_density / 1.2)
        
        # Weighted Energy Score
        # Loudness is key, but brightness and density add the "hype"
        # We boost the base value to avoid very low scores for quiet but active tracks
        raw_energy = (0.5 * feat_loudness) + (0.3 * feat_brightness) + (0.2 * feat_density)
        energy = raw_energy
        
        # B. DANCEABILITY
        # 1. Beat Stability (Regularity)
        tempo, beats = librosa.beat.beat_track(onset_envelope=onset_env, sr=sr)
        
        if len(beats) > 2:
            # Calculate Inter-Beat Intervals (IBI)
            beat_times = librosa.frames_to_time(beats, sr=sr)
            ibi = np.diff(beat_times)
            
            # Coefficient of Variation (CV) - Lower is more stable
            cv = np.std(ibi) / (np.mean(ibi) + 0.0001)
            
            # Stability Score (0.0 to 1.0)
            # Relaxed penalty: CV 0.3 (30% var) -> 0.1 score
            stability = max(0.0, min(1.0, 1.0 - (cv * 3)))
            
            # 2. Beat Strength
            beat_strength = np.mean(onset_env[beats])
            # Lower threshold for strength
            feat_strength = min(1.0, beat_strength / 1.5)
            
            # 3. Tempo Preference (100-130 is ideal for dancing)
            # Gaussian curve centered at 120
            tempo_factor = np.exp(-((bpm - 120)**2) / (2 * 40**2))
            
            raw_dance = (0.4 * stability) + (0.4 * feat_strength) + (0.2 * tempo_factor)
            danceability = raw_dance
        else:
            # Fallback: Use regularity of onsets if beats failed
            danceability = min(1.0, onset_density / 2.0) * 0.5
            
        # Clamp to 0.0 - 1.0 range for frontend percentage
        energy = round(min(1.0, max(0.0, energy)), 2)
        danceability = round(min(1.0, max(0.0, danceability)), 2)

        return {
            'bpm': round(float(bpm), 1),
            'key_key': int(key_idx),
            'key_mode': int(mode),
            'energy': round(float(energy), 2),
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
