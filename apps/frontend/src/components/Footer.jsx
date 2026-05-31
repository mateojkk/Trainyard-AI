import styles from "./css/Footer.module.css";

function Footer({ variant = "app" }) {
  return (
    <footer className={`${styles.footer} ${variant === "landing" ? styles.landing : ""}`}>
      <div className={styles.container}>
        <div className={styles.copyright}>
          &copy; 2026 Trainyard AI. Decentralized AI Training Data Marketplace.
        </div>
      </div>
    </footer>
  );
}

export default Footer;
