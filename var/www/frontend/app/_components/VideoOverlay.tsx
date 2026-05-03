export default function VideoOverlay() {
  return (
    <div id="videoOverlay" className="video-overlay">
      <video
        id="landingVideo"
        playsInline
        preload="none"
        poster="vid/landing-poster.jpg"
      >
        <source src="vid/landing-720p.mp4?v=2" type="video/mp4" media="(max-width: 768px)" />
        <source src="vid/landing.mp4?v=2" type="video/mp4" />
      </video>
    </div>
  );
}
