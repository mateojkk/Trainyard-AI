import { Link } from "react-router-dom";
import styles from "./css/MarketplaceHero.module.css";

export default function MarketplaceHero({ account, onLogin }) {
  return (
    <div className={styles.hero}>
      <div className={styles.overlay}></div>
      <div className={styles.content}>
        <h1 className={styles.title}>
          Trainyard <span className={styles.highlight}>AI</span>
        </h1>
        <p className={styles.desc}>
          The decentralized marketplace for AI training data. Secure client-side encryption, permanent Walrus hosting, and trustless automated key delivery on the Sui Network.
        </p>
        <div className={styles.action}>
          {account ? (
            <Link to="/upload" className={styles.button}>
              Sell Your Dataset
            </Link>
          ) : (
            <button onClick={onLogin} className={styles.button}>
              Connect via zkLogin
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
