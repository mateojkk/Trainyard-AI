import { useState } from "react";
import { CheckCircle2, Copy, Download, Check } from "lucide-react";

export default function BuyModalSuccess({ decryptionKey, fileName, onDownload, onClose }) {
  const [copied, setCopied] = useState(false);

  const copyKey = async () => {
    await navigator.clipboard.writeText(decryptionKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="text-center py-6 space-y-6">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#242424] border border-[#e7c88f]/25 text-[#e7c88f]">
        <CheckCircle2 className="w-8 h-8 animate-pulse" />
      </div>
      <div>
        <h3 className="text-base font-bold text-[#fff7ed] uppercase tracking-wide">Purchase Successful</h3>
        <p className="text-xs text-[#f3e4cf] mt-1 max-w-xs mx-auto">
          Payment verified. Trainyard already used the key to decrypt the dataset locally in your browser.
        </p>
      </div>

      <button
        onClick={onDownload}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#D89F55] hover:bg-[#f0c57a] text-[#23120A] font-bold rounded text-xs tracking-wider uppercase transition cursor-pointer"
      >
        <Download className="w-4 h-4" />
        Download {fileName || "Decrypted File"}
      </button>

      <div className="bg-[#1f1f1f] border border-[#3a322f] p-3 rounded text-left">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] text-[#f3e4cf] uppercase tracking-widest font-mono block">Backup Decryption Key</span>
          <button
            onClick={copyKey}
            className="inline-flex items-center gap-1 text-[10px] text-[#e7c88f] hover:text-[#f0c57a] bg-transparent border-0 p-0 cursor-pointer"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <code className="text-xs text-[#e7c88f] font-mono select-all break-all block mt-1">
          {decryptionKey}
        </code>
        <p className="text-[10px] text-[#d1d5db] mt-2 leading-relaxed">
          You do not need to paste this anywhere for this purchase. Keep it only as a backup if you later need to decrypt the Walrus blob manually.
        </p>
      </div>

      <button
        onClick={onClose}
        className="w-full py-2 bg-[#242424] hover:bg-[#2f2f2f] text-[#fff7ed] font-semibold rounded text-xs tracking-wider uppercase transition cursor-pointer"
      >
        Return to Dataset
      </button>
    </div>
  );
}
