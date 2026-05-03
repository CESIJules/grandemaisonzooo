import Script from "next/script";
import LoadingScreen from "./_components/LoadingScreen";
import VideoOverlay from "./_components/VideoOverlay";
import RadioController from "./_components/RadioController";
import MenuOverlay from "./_components/MenuOverlay";
import RadioSection from "./_components/RadioSection";
import ContactSection from "./_components/ContactSection";
import TerminalOverlay from "./_components/TerminalOverlay";

export default function HomePage() {
  return (
    <>
      <LoadingScreen />
      <VideoOverlay />
      <canvas id="asciiBg"></canvas>
      <button className="burger" id="burgerBtn" aria-label="Menu" style={{ opacity: 0 }}>
        <i className="fas fa-bars"></i>
      </button>
      <RadioController />
      <div id="scrollArrow" className="scroll-arrow">
        <i className="fas fa-chevron-down"></i>
      </div>
      <MenuOverlay />
      <main>
        <section id="accueil" className="screen">
          <video id="backgroundVideo" className="background-video" loop muted playsInline>
            <source src="vid/introboucle.mp4" type="video/mp4" />
          </video>
          <h1 id="titleAccueil" style={{ opacity: 0 }}>
            <span className="line-grande">GRANDE</span>
            <span className="line-maison">
              MAI<span id="secretS">S</span>ON
            </span>
          </h1>
        </section>
        <div id="artists-container"></div>
        <section id="timeline" className="screen">
          <div className="timeline-header-wrapper">
            <div className="timeline-filters"></div>
          </div>
          <div className="timeline-container"></div>
        </section>
        <RadioSection />
        <ContactSection />
      </main>
      <TerminalOverlay />
      <Script src="/script.js" strategy="afterInteractive" />
    </>
  );
}
