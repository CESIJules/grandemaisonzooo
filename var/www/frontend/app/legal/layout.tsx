import Footer from "../_components/Footer";
import styles from "./legal.module.css";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.scrollWrap}>
      {children}
      <Footer />
    </div>
  );
}
