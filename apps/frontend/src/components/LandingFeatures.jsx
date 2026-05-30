import { Shield, HardDrive, Fingerprint, Coins } from "lucide-react";
import styles from "./css/LandingFeatures.module.css";

export default function LandingFeatures({ onLogin }) {
  const features = [
    {
      icon: <Shield className={styles.featureIcon} />,
      title: "Client-Side Encryption",
      desc: "All datasets are encrypted in-browser using AES-256-GCM prior to transmission. Your raw, plaintext training data is never exposed to the network.",
    },
    {
      icon: <HardDrive className={styles.featureIcon} />,
      title: "Permanent Decentralized Storage",
      desc: "Encrypted payloads are hosted permanently on Walrus, the high-throughput decentralized blob storage engine built on top of the Sui network.",
    },
    {
      icon: <Fingerprint className={styles.featureIcon} />,
      title: "Zero-Knowledge Access",
      desc: "Sign up and authenticate securely with Google using Sui zkLogin. No wallet browser extensions are required to list or download datasets.",
    },
    {
      icon: <Coins className={styles.featureIcon} />,
      title: "Trustless Automated Delivery",
      desc: "Buyers pay in USDC. Tatum RPC validators monitor the ledger to verify payment, releasing symmetric decryption keys instantly and automatically.",
    },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        {features.map((feat, idx) => (
          <div key={idx} className={styles.featureCard}>
            {feat.icon}
            <h3 className={styles.featureTitle}>{feat.title}</h3>
            <p className={styles.featureDesc}>{feat.desc}</p>
          </div>
        ))}
      </div>

      <div className={styles.cta}>
        <h2 className={styles.ctaTitle}>Start Training Better Models</h2>
        <p className={styles.ctaDesc}>
          Access verified, securely encrypted training datasets, or monetize your AI assets with automated, trustless settlement.
        </p>
        <button onClick={onLogin} className={styles.ctaBtn}>
          Connect via zkLogin
        </button>
      </div>
    </div>
  );
}
