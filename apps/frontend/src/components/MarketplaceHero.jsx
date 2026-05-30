import { Link } from "react-router-dom";
import { Database } from "lucide-react";
import styles from "./css/MarketplaceHero.module.css";

export default function MarketplaceHero() {
  return (
    <div className={styles.hero}>
      <h1 className={styles.title}>
        <Database className={styles.icon} />
        Trainyard <span className={styles.highlight}>AI</span>
      </h1>
      <p className={styles.desc}>
        The decentralized marketplace for AI training data. End-to-end client-side encryption, permanent hosting on Walrus mainnet, and trustless SUI-settled key delivery.
      </p>
      <div className={styles.action}>
        <Link to="/upload" className={styles.button}>
          Sell Your Dataset
        </Link>
      </div>
    </div>
  );
}
