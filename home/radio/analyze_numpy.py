import sys
import numpy as np
import json

def analyze_pcm():
    try:
        # Read raw PCM data from stdin (16-bit signed integer, 22050Hz, Mono)
        raw_data = sys.stdin.buffer.read()
        if not raw_data:
            return {"error": "No audio data received"}

        # Convert to numpy array
        audio = np.frombuffer(raw_data, dtype=np.int16).astype(np.float32)
        
        # Normalize to -1.0 to 1.0
        if len(audio) > 0:
            audio /= 32768.0
        else:
            return {"error": "Empty audio data"}

        sr = 22050

        # --- 1. Energy (RMS) ---
        rms = np.sqrt(np.mean(audio**2))
        energy = min(1.0, rms * 5) # Scale up a bit

        # --- 2. Danceability (Simple Heuristic) ---
        # Without complex onset detection, we use the variance of the amplitude envelope
        # High variance often implies strong beats/rhythm
        # This is a very rough approximation compared to librosa/essentia
        window_size = 1024
        # Calculate amplitude envelope
        envelope = np.abs(audio)
        # Smooth envelope
        envelope_smooth = np.convolve(envelope, np.ones(window_size)/window_size, mode='same')
        # Variance of the derivative of the envelope (how much the beat "punches")
        diff_env = np.diff(envelope_smooth)
        danceability = min(1.0, np.std(diff_env) * 100)

        # --- 3. Key Detection (FFT -> Chroma) ---
        # Perform FFT
        n_fft = 4096
        # We only need a few frames to estimate key, let's take the center of the clip
        center = len(audio) // 2
        start = max(0, center - (sr * 5)) # 5 seconds window
        end = min(len(audio), center + (sr * 5))
        segment = audio[start:end]
        
        if len(segment) < n_fft:
            segment = audio # Use all if too short

        # Windowing
        window = np.hanning(len(segment))
        spectrum = np.fft.rfft(segment * window)
        frequencies = np.fft.rfftfreq(len(segment), 1/sr)
        magnitudes = np.abs(spectrum)

        # Map to Chroma (12 semitones)
        chroma = np.zeros(12)
        
        # A4 = 440Hz
        # Note index = 12 * log2(freq / 440) + 69 (MIDI note)
        # We want C=0, C#=1...
        # MIDI: C4=60. 60%12 = 0 (C). So MIDI%12 gives pitch class.
        
        for i, freq in enumerate(frequencies):
            if freq < 50 or freq > 2000: continue # Filter range
            
            # Calculate MIDI note
            if freq > 0:
                midi_note = 12 * np.log2(freq / 440.0) + 69
                pitch_class = int(round(midi_note)) % 12
                chroma[pitch_class] += magnitudes[i]

        # Normalize Chroma
        if np.max(chroma) > 0:
            chroma /= np.max(chroma)

        # Template Matching (Krumhansl-Schmuckler)
        maj_profile = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
        min_profile = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
        
        # Normalize profiles
        maj_profile /= np.max(maj_profile)
        min_profile /= np.max(min_profile)

        maj_corrs = []
        min_corrs = []
        
        for i in range(12):
            # Correlation
            maj_corrs.append(np.corrcoef(np.roll(maj_profile, i), chroma)[0, 1])
            min_corrs.append(np.corrcoef(np.roll(min_profile, i), chroma)[0, 1])

        max_maj = np.max(maj_corrs)
        max_min = np.max(min_corrs)
        
        if max_maj > max_min:
            key_idx = np.argmax(maj_corrs)
            mode = 1 # Major
        else:
            key_idx = np.argmax(min_corrs)
            mode = 0 # Minor

        return {
            "energy": round(float(energy), 2),
            "danceability": round(float(danceability), 2),
            "key_key": int(key_idx),
            "key_mode": int(mode)
        }

    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    print(json.dumps(analyze_pcm()))
