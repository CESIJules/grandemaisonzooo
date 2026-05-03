"use client";
import { useState } from "react";
import styles from "./Nav.module.css";

const LINKS = [
  { label: "ACCUEIL", href: "#accueil", num: "01" },
  { label: "ARTISTES", href: "#artistes", num: "02" },
  { label: "TIMELINE", href: "#timeline", num: "03" },
  { label: "RADIO", href: "#radio", num: "04" },
  { label: "CONTACT", href: "#contact", num: "05" },
];

export default function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className={styles.burger}
        onClick={() => setOpen(true)}
        aria-label="Ouvrir le menu"
      >
        ☰
      </button>

      <nav
        className={`${styles.overlay} ${open ? styles.open : ""}`}
        aria-hidden={!open}
        aria-label="Navigation principale"
      >
        <button
          className={styles.close}
          onClick={() => setOpen(false)}
          aria-label="Fermer le menu"
        >
          <i className="fas fa-times" />
        </button>

        <ul className={styles.list}>
          {LINKS.map((l, i) => (
            <li
              key={l.href}
              className={styles.item}
              style={{ "--i": i } as React.CSSProperties}
            >
              <a
                href={l.href}
                className={styles.link}
                onClick={() => setOpen(false)}
              >
                {l.label}
              </a>
              <span className={styles.num}>{l.num}</span>
            </li>
          ))}
        </ul>

        <a href="/login" className={styles.loginLink} aria-label="Connexion">
          <i className="fas fa-circle-user" />
        </a>
      </nav>
    </>
  );
}
