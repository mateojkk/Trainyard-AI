import { Eye, Shield, Loader2 } from "lucide-react";
import PreviewRenderer from "./PreviewRenderer";
import styles from "./css/DatasetInfo.module.css";

const CATEGORY_MAP = {
  nlp: { name: "NLP", class: styles.nlp },
  vision: { name: "Vision", class: styles.vision },
  audio: { name: "Audio", class: styles.audio },
  tabular: { name: "Tabular", class: styles.tabular },
  multimodal: { name: "Multimodal", class: styles.multimodal },
  other: { name: "Other", class: styles.otherCategory },
};

export default function DatasetInfo({ dataset, previewText, loadingPreview }) {
  const cat = CATEGORY_MAP[dataset.category?.toLowerCase()] || CATEGORY_MAP.other;

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.meta}>
          <span className={`${styles.badge} ${cat.class}`}>{cat.name}</span>
          <span className={styles.typeBadge}>{dataset.file_type.toUpperCase()}</span>
        </div>
        <h1 className={styles.title}>{dataset.title}</h1>
        <p className={styles.desc}>{dataset.description}</p>
        <div className={styles.tags}>
          {dataset.tags.map((tag, idx) => (
            <span key={idx} className={styles.tag}>#{tag}</span>
          ))}
        </div>
      </div>

      <div className={styles.previewCard}>
        <div className={styles.previewHeader}>
          <span className={styles.previewTitle}>
            <Eye className="w-4 h-4 text-brand-blue" />
            Plaintext Dataset Preview
          </span>
          <span className={styles.previewSub}>Hosted publicly on Walrus</span>
        </div>
        <div className={styles.previewBody}>
          {loadingPreview ? (
            <div className={styles.loadingText}>
              <Loader2 className="w-3.5 h-3.5 text-brand-blue animate-spin" />
              Fetching preview bytes...
            </div>
          ) : (
            <PreviewRenderer dataset={dataset} previewText={previewText} />
          )}
        </div>
      </div>

      <div className={styles.shieldCard}>
        <Shield className={styles.shieldIcon} />
        <div>
          <h4 className={styles.shieldTitle}>Secure Cryptographic Storage</h4>
          <p className={styles.shieldDesc}>
            This dataset has been encrypted client-side in the contributor's browser with AES-256-GCM. The unencrypted file is never transmitted to the platform servers. The ciphertext is stored permanently on Walrus. The decryption key is automatically released after verified USDC settlement on Sui.
          </p>
        </div>
      </div>
    </div>
  );
}
