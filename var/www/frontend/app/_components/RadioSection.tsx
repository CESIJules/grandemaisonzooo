export default function RadioSection() {
  return (
    <section id="radio" className="screen">
      <div className="radio-header">
        <canvas id="visualizer"></canvas>
        <div className="volume-container" id="circularVolume">
          <svg className="volume-ring" width="60" height="60" viewBox="0 0 60 60">
            <circle
              className="ring-bg"
              cx="30" cy="30" r="26"
              strokeWidth="4" fill="none"
              stroke="rgba(255,255,255,0.2)"
              strokeLinecap="round"
              strokeDasharray="122.52 163.36"
              transform="rotate(135 30 30)"
            />
            <circle
              className="ring-progress"
              cx="30" cy="30" r="26"
              strokeWidth="4" fill="none"
              stroke="#fff"
              strokeLinecap="round"
              strokeDasharray="122.52 163.36"
              strokeDashoffset="122.52"
              transform="rotate(135 30 30)"
            />
          </svg>
          <div className="volume-icon-center">
            <i className="fas fa-volume-up" id="volumeIcon"></i>
          </div>
          <input type="hidden" id="volumeControl" defaultValue="1" />
        </div>
        <button id="mainPipBtn" className="btn-pip-main" title="Mini Lecteur">
          <i className="fas fa-external-link-alt"></i>
        </button>
        <div id="currentSong">
          <div id="mainCover" className="main-cover">
            <img id="mainCoverImg" src={undefined} alt="Cover" style={{ opacity: 0 }} />
            <div className="main-cover-placeholder">
              <i className="fas fa-compact-disc"></i>
            </div>
          </div>
          <div className="current-song-content">
            <div className="song-info">
              <span className="label">En cours de lecture : </span>
              <span className="title">Chargement du titre...</span>
            </div>
            <div id="progress-info">
              <span id="elapsed-time">0:00</span>
              <div id="progress-container">
                <div id="progress-bar"></div>
              </div>
              <span id="remaining-time">0:00</span>
            </div>
            <div className="song-buttons-container">
              <div id="history-toggle" title="Voir l&#39;historique">
                <span>HISTORIQUE</span>
                <i className="fas fa-chevron-down" id="history-chevron"></i>
              </div>
              <div id="info-toggle" title="Infos du morceau">
                <span>INFOS</span>
                <i className="fas fa-chevron-down" id="info-chevron"></i>
              </div>
            </div>
          </div>
          <div id="history-dropdown">
            <div id="history-list"></div>
          </div>
          <div id="info-dropdown">
            <div id="info-content">
              <div className="info-item">
                <span className="info-label">BPM</span>
                <span className="info-value" id="info-bpm">--</span>
              </div>
              <div className="info-item">
                <span className="info-label">KEY</span>
                <span className="info-value" id="info-key">--</span>
              </div>
              <div className="info-item">
                <span className="info-label">GENRE</span>
                <span className="info-value" id="info-genre">--</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <audio id="radioPlayer" crossOrigin="anonymous">
        <source src="https://grandemaisonzoo.com/stream" type="audio/mpeg" />
      </audio>
      <div className="player">
        <div id="vinyl-disc-container">
          <div id="vinyl-disc">
            <canvas id="radarPoints"></canvas>
          </div>
          <button
            id="playRadio"
            data-src="https://grandemaisonzoo.com/stream"
            className="btn-play"
          >
            <i className="fas fa-play"></i>
          </button>
        </div>
      </div>
      <div id="radioStatus" className="status"></div>
      <div id="listenerCount" className="listeners"></div>
    </section>
  );
}
