export default function ContactSection() {
  return (
    <section id="contact" className="screen">
      <h2>CONTACT</h2>
      <form
        id="contactForm"
        className="contact-form"
        action="https://formspree.io/f/mblewpzb"
        method="POST"
      >
        <input type="text" name="name" placeholder="Nom" />
        <input type="email" name="email" placeholder="Email" />
        <textarea name="message" placeholder="Message"></textarea>
        <button type="submit" className="btn">Envoyer</button>
        <span id="formMessage"></span>
      </form>
      <div className="social-links">
        <a href="https://www.instagram.com/grandemaisonzoo/" target="_blank" rel="noreferrer" className="social-btn">
          <i className="fab fa-instagram"></i>
        </a>
        <a href="https://discord.gg/H8hVEuksXA" target="_blank" rel="noreferrer" className="social-btn">
          <i className="fab fa-discord"></i>
        </a>
        <a href="https://www.youtube.com/@GRANDEMAISONzoo" target="_blank" rel="noreferrer" className="social-btn">
          <i className="fab fa-youtube"></i>
        </a>
        <a href="https://www.twitch.tv/grandemaison" target="_blank" rel="noreferrer" className="social-btn">
          <i className="fab fa-twitch"></i>
        </a>
      </div>
    </section>
  );
}
