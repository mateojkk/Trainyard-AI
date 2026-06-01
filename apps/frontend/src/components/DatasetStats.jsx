import { FileSpreadsheet, Lock, ArrowUpRight, Database, Download, User } from "lucide-react";
import { formatBytes } from "../lib/sui";
import { PAYMENT_SYMBOL, formatPaymentAmount } from "../lib/payments";
import styles from "./css/DatasetStats.module.css";

export default function DatasetStats({ dataset, onBuyClick }) {
  return (
    <div className="space-y-6">
      <div className={styles.card}>
        <div className={styles.hero}>
          <span className={styles.licenseLabel}>Dataset Access License</span>
          <div className={styles.price}>
            {formatPaymentAmount(dataset.price_sui)}
            <span className={styles.priceLabel}>{PAYMENT_SYMBOL}</span>
          </div>
          <button onClick={onBuyClick} className={styles.buyBtn}>
            <Lock className="w-4 h-4" />
            Buy and Decrypt
          </button>
        </div>

        <div className={styles.details}>
          <div className={styles.detailRow}>
            <span className={styles.label}>File Format</span>
            <span className={styles.value}>
              <FileSpreadsheet className="w-3.5 h-3.5 text-brand-blue" />
              {dataset.file_type}
            </span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.label}>Uncompressed Size</span>
            <span className={styles.value}>{formatBytes(dataset.file_size_bytes)}</span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.label}>Downloads</span>
            <span className={styles.value}>
              <Download className="w-3 h-3 text-gray-500" />
              {dataset.download_count || 0}
            </span>
          </div>

          {dataset.seller_profile ? (
            <div className={styles.detailSection}>
              <span className={styles.sectionLabel}>Contributor</span>
              <a href={`/profile/${dataset.seller_profile.username}`} onClick={(e) => { e.preventDefault(); window.location.href = `/profile/${dataset.seller_profile.username}`; }}
                className="flex items-center gap-2 mt-1 hover:bg-[#2f2f2f] rounded p-1.5 transition no-underline"
              >
                {dataset.seller_profile.avatar_url ? (
                  <img src={dataset.seller_profile.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover border border-[#3a322f]" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#3a322f] flex items-center justify-center"><User className="w-3.5 h-3.5 text-gray-400" /></div>
                )}
                <div>
                  <p className="text-xs text-gray-200 font-semibold">{dataset.seller_profile.display_name || dataset.seller_profile.username}</p>
                  <p className="text-[10px] text-gray-500">@{dataset.seller_profile.username}</p>
                </div>
              </a>
            </div>
          ) : (
            <div className={styles.detailSection}>
              <span className={styles.sectionLabel}>Contributor Address</span>
              <span className={styles.sectionVal} title={dataset.seller_address}>{dataset.seller_address}</span>
            </div>
          )}
        </div>
      </div>

      <div className={styles.walrusCard}>
        <h4 className={styles.walrusTitle}>
          <Database className="w-4 h-4 text-brand-blue" />
          Walrus Integration
        </h4>
        <div className="space-y-2 text-xs">
          <div>
            <span className={styles.sectionLabel}>Encrypted Blob ID</span>
            <span className={styles.sectionVal} title={dataset.blob_id}>
              {dataset.blob_id}
            </span>
          </div>
          <a
            href={dataset.walrus_explorer_url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.walrusLink}
          >
            Walrus Explorer
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
