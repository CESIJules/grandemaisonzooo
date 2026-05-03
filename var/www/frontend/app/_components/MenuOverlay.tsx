export default function MenuOverlay() {
  return (
    <nav id="menu" className="menu-overlay" aria-hidden="true">
      <div className="menu-lines">
        <div className="line-v line-v1"></div>
        <div className="line-v line-v2"></div>
        <div className="line-v line-v3"></div>
        <div className="line-v line-v4"></div>
        <div className="line-v line-v5"></div>
        <div className="line-v line-v6"></div>
        <div className="line-h line-h1"></div>
        <div className="line-h line-h2"></div>
      </div>
      <button className="menu-close" id="menuCloseBtn" aria-label="Fermer le menu">
        <i className="fas fa-times"></i>
      </button>
      <div className="menu-content">
        <ul className="menu-list">
          <li className="menu-item" data-index="0">
            <a href="#accueil" className="menu-link">ACCUEIL</a>
            <span className="menu-number">01</span>
          </li>
          <li className="menu-item" data-index="1">
            <a href="#nelsonnorth" className="menu-link">ARTISTES</a>
            <span className="menu-number">02</span>
          </li>
          <li className="menu-item" data-index="2">
            <a href="#timeline" className="menu-link">TIMELINE</a>
            <span className="menu-number">03</span>
          </li>
          <li className="menu-item" data-index="3">
            <a href="#radio" className="menu-link">RADIO</a>
            <span className="menu-number">04</span>
          </li>
          <li className="menu-item" data-index="4">
            <a href="#contact" className="menu-link">CONTACT</a>
            <span className="menu-number">05</span>
          </li>
        </ul>
      </div>
      <a href="/login" className="menu-login-link" aria-label="Connexion Artiste">
        <i className="fas fa-circle-user"></i>
      </a>
    </nav>
  );
}
