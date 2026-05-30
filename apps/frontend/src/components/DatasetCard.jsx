import { useNavigate } from "react-router-dom";
import { FileCode, Download } from "lucide-react";
import { truncateAddress, formatBytes } from "../lib/sui";
import { PAYMENT_SYMBOL, formatPaymentAmount } from "../lib/payments";
import styles from "./css/DatasetCard.module.css";

const CATEGORY_MAP = {
  nlp: { name: "NLP", class: styles.nlp },
  vision: { name: "Vision", class: styles.vision },
  audio: { name: "Audio", class: styles.audio },
  tabular: { name: "Tabular", class: styles.tabular },
  multimodal: { name: "Multimodal", class: styles.multimodal },
  other: { name: "Other", class: styles.otherCategory },
};

export default function DatasetCard({ dataset }) {
  const navigate = useNavigate();
  const cat = CATEGORY_MAP[dataset.category?.toLowerCase()] || CATEGORY_MAP.other;

  return (
    <div onClick={() => navigate(`/dataset/${dataset.id}`)} className={styles.card}>
      {/* Card Header: Category & File type info */}
      <div className={styles.header}>
        <span className={`${styles.badge} ${cat.class}`}>
          {cat.name}
        </span>
        <div className={styles.fileMeta}>
          <FileCode className={styles.fileMetaIcon} />
          <span>{dataset.file_type.toUpperCase()}</span>
          <span>&bull;</span>
          <span>{formatBytes(dataset.file_size_bytes)}</span>
        </div>
      </div>

      {/* Card Body: Title and Description */}
      <div className={styles.body}>
        <h3 className={styles.title}>{dataset.title}</h3>
        <p className={styles.desc}>{dataset.description}</p>

        {/* Tags */}
        <div className={styles.tags}>
          {dataset.tags.slice(0, 3).map((tag, idx) => (
            <span key={idx} className={styles.tag}>
              #{tag}
            </span>
          ))}
          {dataset.tags.length > 3 && (
            <span className={styles.moreTags}>
              +{dataset.tags.length - 3} more
            </span>
          )}
        </div>
      </div>

      {/* Card Footer: Address, Downloads, Price */}
      <div className={styles.footer}>
        <div className={styles.footerLeft}>
          <div className={styles.seller}>
            <span>Seller:</span>
            <span className={styles.sellerHighlight}>{truncateAddress(dataset.seller_address)}</span>
          </div>
          <div className={styles.downloads}>
            <Download className={styles.downloadsIcon} />
            <span>{dataset.download_count} purchases</span>
          </div>
        </div>

        <div className={styles.footerRight}>
          <div className={styles.priceLabel}>Price</div>
          <div className={styles.price}>
            <span>{formatPaymentAmount(dataset.price_sui)}</span>
            <span className={styles.suiLabel}>{PAYMENT_SYMBOL}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
