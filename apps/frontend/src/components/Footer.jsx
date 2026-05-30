import styles from "./css/Footer.module.css";

function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.copyright}>
          &copy; 2026 Trainyard AI. Decentralized AI Training Data Marketplace.
        </div>
      </div>
    </footer>
  );
}

export default Footer;
