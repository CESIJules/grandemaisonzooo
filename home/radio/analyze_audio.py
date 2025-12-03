import sys
import json
import os

# Suppress warnings
import warnings
warnings.filterwarnings('ignore')

# Import numpy first
import numpy as np

# Try importing librosa safely
try:
    import librosa
except ImportError:
    print(json.dumps({"status": "error", "message": "Failed to import librosa"}))
    sys.exit(1)

def estimate_key(y, sr):
    # Chroma CQT is robust for key detection
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
    chroma_avg = np.mean(chroma, axis=1)
    
    # Krumhansl-Schmuckler key profiles
    major_profile = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
    minor_profile = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
    
    # Normalize
    major_profile /= np.sum(major_profile)
    minor_profile /= np.sum(minor_profile)
    
    max_corr = -1
    best_key = None
    best_mode = None
    
    # Pitch classes
    notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    
    # Camelot mapping (approximate)
    # Major: B=1B, F#=2B, Db=3B, Ab=4B, Eb=5B, Bb=6B, F=7B, C=8B, G=9B, D=10B, A=11B, E=12B
    # Minor: Ab=1A, Eb=2A, Bb=3A, F=4A, C=5A, G=6A, D=7A, A=8A, E=9A, B=10A, F#=11A, Db=12A
    
    camelot_major = {
        'B': '1B', 'F#': '2B', 'C#': '3B', 'G#': '4B', 'D#': '5B', 'A#': '6B', 
        'F': '7B', 'C': '8B', 'G': '9B', 'D': '10B', 'A': '11B', 'E': '12B'
    }
    # Handle enharmonics for Major
    camelot_major.update({'Db': '3B', 'Ab': '4B', 'Eb': '5B', 'Bb': '6B', 'Gb': '2B'})

    camelot_minor = {
        'G#': '1A', 'D#': '2A', 'A#': '3A', 'F': '4A', 'C': '5A', 'G': '6A', 
        'D': '7A', 'A': '8A', 'E': '9A', 'B': '10A', 'F#': '11A', 'C#': '12A'
    }
    # Handle enharmonics for Minor
    camelot_minor.update({'Ab': '1A', 'Eb': '2A', 'Bb': '3A', 'Db': '12A', 'Gb': '11A'})

    for i in range(12):
        # Major
        profile_rot = np.roll(major_profile, i)
        corr = np.corrcoef(chroma_avg, profile_rot)[0, 1]
        if corr > max_corr:
            max_corr = corr
            note = notes[i]
            best_key = f"{note} Major"
            best_mode = 'Major'
            camelot = camelot_major.get(note, 'Unknown')
            
        # Minor
        profile_rot = np.roll(minor_profile, i)
        corr = np.corrcoef(chroma_avg, profile_rot)[0, 1]
        if corr > max_corr:
            max_corr = corr
            note = notes[i]
            best_key = f"{note} Minor"
            best_mode = 'Minor'
            camelot = camelot_minor.get(note, 'Unknown')
            
    return best_key, camelot

def analyze(file_path):
    try:
        # Load audio (first 30s is usually enough for BPM/Key)
        # sr=None loads at native sampling rate, avoiding resampling (and resampy dependency for load)
        y, sr = librosa.load(file_path, duration=30, sr=None)
        
        # BPM
        # Use a simpler beat tracker if the default one is causing issues
        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
        bpm = round(float(tempo))
        
        # Key
        key_str, camelot = estimate_key(y, sr)
        
        return {
            "status": "success",
            "bpm": bpm,
            "key": key_str,
            "camelot": camelot
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"status": "error", "message": "No file provided"}))
        sys.exit(1)
        
    file_path = sys.argv[1]
    if not os.path.exists(file_path):
        print(json.dumps({"status": "error", "message": "File not found"}))
        sys.exit(1)
        
    result = analyze(file_path)
    print(json.dumps(result))
