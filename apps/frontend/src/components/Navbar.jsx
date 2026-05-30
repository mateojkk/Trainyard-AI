import { Link, useLocation } from "react-router-dom";
import WalletButton from "./WalletButton";
import { Database, UploadCloud } from "lucide-react";
import styles from "./css/Navbar.module.css";

export default function Navbar() {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className={styles.nav}>
      {/* Brand logo */}
      <Link to="/" className={styles.brand}>
        <Database className={styles.logo} />
        <span className={styles.brandText}>
          Trainyard <span className={styles.brandHighlight}>AI</span>
        </span>
      </Link>

      {/* Navigation links */}
      <div className={styles.links}>
        <Link
          to="/"
          className={`${styles.link} ${isActive("/") ? styles.active : styles.inactive}`}
        >
          Browse
        </Link>
        <Link
          to="/upload"
          className={`${styles.link} ${isActive("/upload") ? styles.active : styles.inactive}`}
        >
          <UploadCloud className={styles.linkIcon} />
          Upload
        </Link>
      </div>

      {/* Wallet Connect Button */}
      <div>
        <WalletButton />
      </div>
    </nav>
  );
}
