import { Link, useLocation } from "react-router-dom";
import WalletButton from "./WalletButton";
import NavbarSearch from "./NavbarSearch";
import { useZkLogin } from "../context/useZkLogin";
import { UploadCloud } from "lucide-react";
import styles from "./css/Navbar.module.css";

export default function Navbar() {
  const { account } = useZkLogin();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className={styles.nav}>
      <Link to="/" className={styles.brand}>
        <span className={styles.brandText}>Trainyard</span>
      </Link>

      {account && (
        <div className={styles.links}>
          <Link to="/" className={`${styles.link} ${isActive("/") ? styles.active : styles.inactive}`}>Browse</Link>
          <Link to="/upload" className={`${styles.link} ${isActive("/upload") ? styles.active : styles.inactive}`}>
            <UploadCloud className={styles.linkIcon} />Upload
          </Link>
        </div>
      )}

      <div className="flex items-center gap-1">
        {account && <NavbarSearch />}
        <WalletButton />
      </div>
    </nav>
  );
}
