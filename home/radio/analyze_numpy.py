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

        # --- 4. BPM Detection (Spectral Flux + Autocorrelation) ---
        # Improved algorithm: Spectral Flux Difference
        # This detects beats based on energy changes in frequency bands, not just volume.
        
        # STFT Parameters
        n_fft = 2048
        hop_length = 512
        
        # 1. Compute STFT
        # We need to slice the audio into overlapping windows
        n_frames = (len(audio) - n_fft) // hop_length + 1
        if n_frames < 1:
            bpm = 0
        else:
            # Create strided array for efficient STFT
            strides = audio.strides
            frames = np.lib.stride_tricks.as_strided(
                audio, 
                shape=(n_frames, n_fft), 
                strides=(strides[0] * hop_length, strides[0])
            )
            
            # Apply Hanning window
            window = np.hanning(n_fft)
            frames = frames * window
            
            # FFT
            spectrogram = np.abs(np.fft.rfft(frames, axis=1))

            # --- IMPROVEMENT FOR SATURATION/BASS ---
            # 1. Logarithmic compression
            # Helps with saturation/compression by reducing the dominance of loud peaks
            spectrogram = np.log1p(spectrogram * 10)

            # 2. Frequency limiting for Flux
            # Heavy bass/saturation often has high frequency noise. 
            # The beat is usually in the low-mids (0-1000Hz).
            # Bin width = 22050 / 2048 ~= 10.7 Hz
            # We keep bins 0 to 100 (~1000Hz) to focus on Kick/Bass/Snare fundamental
            n_bins_to_keep = 100
            if spectrogram.shape[1] > n_bins_to_keep:
                spectrogram = spectrogram[:, :n_bins_to_keep]
            
            # 2. Spectral Flux
            # Calculate difference between consecutive frames
            # We only care about positive changes (energy increasing)
            diff = np.diff(spectrogram, axis=0)
            flux = np.sum(np.maximum(0, diff), axis=1)
            
            # 3. Smooth the flux (ODF - Onset Detection Function)
            # This ODF is our "rhythm signal"
            # Sampling rate of ODF is sr / hop_length (~43Hz at 22050/512)
            # We want higher precision, but 43Hz is okay for estimation. 
            # Let's interpolate to 200Hz for better resolution.
            
            odf_sr = sr / hop_length
            target_sr = 200
            
            old_indices = np.arange(len(flux))
            new_indices = np.linspace(0, len(flux)-1, int(len(flux) * target_sr / odf_sr))
            flux_resampled = np.interp(new_indices, old_indices, flux)
            
            # Remove DC and normalize
            flux_resampled = flux_resampled - np.mean(flux_resampled)
            flux_resampled /= (np.max(np.abs(flux_resampled)) + 1e-6)
            
            # 4. Autocorrelation
            corr = np.correlate(flux_resampled, flux_resampled, mode='full')
            corr = corr[len(corr)//2:]
            
            # 5. Peak Picking with Tempo Priors
            # We apply a weighting curve to prefer standard tempos (90-140) slightly
            # to avoid harmonics like 60 or 180 when 120 is likely.
            
            min_bpm = 60
            max_bpm = 190
            
            best_bpm = 0
            max_strength = 0
            
            # Scan BPMs
            for b in range(min_bpm, max_bpm + 1):
                lag = int(60 * target_sr / b)
                if lag < len(corr):
                    # Check the peak at this lag
                    # We also check multiples (2x lag, 3x lag) to confirm rhythm
                    strength = corr[lag]
                    
                    # Add harmonics support (if the beat is strong, it repeats)
                    if lag * 2 < len(corr):
                        strength += 0.5 * corr[lag * 2]
                    if lag * 4 < len(corr):
                        strength += 0.25 * corr[lag * 4]
                        
                    # Gaussian weighting centered at 120 BPM (sigma=40)
                    # This gently penalizes extreme BPMs unless the signal is very strong
                    weight = np.exp(-0.5 * ((b - 120) / 40) ** 2)
                    weighted_strength = strength * weight
                    
                    if weighted_strength > max_strength:
                        max_strength = weighted_strength
                        best_bpm = b
            
            bpm = best_bpm

        return {
            "energy": round(float(energy), 2),
            "danceability": round(float(danceability), 2),
            "key_key": int(key_idx),
            "key_mode": int(mode),
            "bpm": round(float(bpm))
        }

    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    print(json.dumps(analyze_pcm()))
