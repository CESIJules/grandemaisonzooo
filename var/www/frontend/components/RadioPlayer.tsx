"use client";
import { useRadio } from "@/hooks/useRadio";
import { useTrack } from "@/hooks/useTrack";
import AudioVisualizer from "./AudioVisualizer";
import styles from "./RadioPlayer.module.css";

const STREAM_URL = "https://grandemaisonzoo.com/stream";

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function RadioPlayer() {
  const { audioRef, playing, volume, loading, error, toggle, setVolume } = useRadio(STREAM_URL);
  const { track, elapsed } = useTrack(10000);

  const duration = track?.duration ?? 0;
  const progress = duration > 0 ? Math.min((elapsed / duration) * 100, 100) : 0;
  const remaining = duration > 0 ? Math.max(0, duration - elapsed) : null;

  return (
    <div className={styles.player}>
      <div className={styles.vinyl} data-playing={playing}>
        <button
          className={styles.playBtn}
          onClick={toggle}
          aria-label={playing ? "Pause" : "Lire"}
          disabled={loading}
        >
          {loading ? (
            <i className="fas fa-spinner fa-spin" />
          ) : playing ? (
            <i className="fas fa-pause" />
          ) : (
            <i className="fas fa-play" />
          )}
        </button>
      </div>

      <div className={styles.meta}>
        {track ? (
          <>
            <span className={styles.label}>En cours</span>
            <span className={styles.title}>{track.title}</span>
            <span className={styles.artist}>{track.artist}</span>
          </>
        ) : (
          <span className={styles.label}>Chargement...</span>
        )}

        {error && <span className={styles.error}>{error}</span>}

        {track && duration > 0 && (
          <div className={styles.progress}>
            <span>{formatTime(elapsed)}</span>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span>-{remaining !== null ? formatTime(remaining) : "--:--"}</span>
          </div>
        )}
      </div>

      <AudioVisualizer
        audioRef={audioRef}
        playing={playing}
        width={280}
        height={60}
        className={styles.visualizer}
      />

      <div className={styles.volumeRow}>
        <i className="fas fa-volume-down" />
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className={styles.volumeSlider}
          aria-label="Volume"
        />
        <i className="fas fa-volume-up" />
      </div>
    </div>
  );
}
