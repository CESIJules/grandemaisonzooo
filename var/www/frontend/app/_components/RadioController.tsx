export default function RadioController() {
  return (
    <div id="radioController" className="rc-container docked hidden">
      <div className="rc-handle" id="rcHandle">
        <div className="rc-toggle-btn" id="rcToggleBtn">
          <i className="fas fa-chevron-left"></i>
        </div>
      </div>
      <div className="rc-content">
        <div className="rc-top-row">
          <button id="rcPlayPause" className="rc-btn-play">
            <i className="fas fa-play"></i>
          </button>
          <div className="rc-volume-container" id="rcCircularVolume">
            <svg className="rc-volume-ring" width="46" height="46" viewBox="0 0 32 32">
              <circle
                className="rc-ring-bg"
                cx="16" cy="16" r="14"
                strokeWidth="3" fill="none"
                stroke="rgba(255,255,255,0.2)"
                strokeLinecap="round"
                strokeDasharray="65.97 87.96"
                transform="rotate(135 16 16)"
              />
              <circle
                className="rc-ring-progress"
                cx="16" cy="16" r="14"
                strokeWidth="3" fill="none"
                stroke="#fff"
                strokeLinecap="round"
                strokeDasharray="65.97 87.96"
                strokeDashoffset="0"
                transform="rotate(135 16 16)"
              />
            </svg>
            <div className="rc-volume-icon-center">
              <i className="fas fa-volume-up" id="rcVolumeIcon"></i>
            </div>
          </div>

          <div id="rcCover" className="rc-cover">
            <img id="rcCoverImg" src={undefined} alt="Cover" style={{ opacity: 0 }} />
            <div className="rc-cover-placeholder">
              <i className="fas fa-compact-disc"></i>
            </div>
          </div>
          <div className="rc-meta">
            <h1 id="rcTitle">Titre</h1>
            <h2 id="rcArtist">Artiste</h2>
          </div>
        </div>
        <div className="rc-bottom-row">
          <span id="rcElapsed">0:00</span>
          <div className="rc-progress-track" id="rcProgressTrack">
            <div className="rc-progress-fill" id="rcProgressBar"></div>
          </div>
          <span id="rcRemaining">0:00</span>
        </div>
      </div>
    </div>
  );
}
