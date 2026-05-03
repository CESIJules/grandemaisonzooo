import Script from "next/script";

export default function LoginPage() {
  return (
    <>
      <main>
        <section id="login" className="screen">
          <h2>Admin Login</h2>
          <form id="loginForm" className="contact-form">
            <input type="text" id="username" placeholder="Nom d'utilisateur" required />
            <input type="password" id="password" placeholder="Mot de passe" required />
            <button type="submit" className="btn">Login</button>
            <span id="loginMessage"></span>
          </form>
        </section>
      </main>
      <Script src="/login.js" strategy="afterInteractive" />
    </>
  );
}
