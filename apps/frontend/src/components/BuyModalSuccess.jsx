import { CheckCircle2 } from "lucide-react";

export default function BuyModalSuccess({ decryptionKey, onClose }) {
  return (
    <div className="text-center py-6 space-y-6">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#242424] border border-[#e7c88f]/25 text-[#e7c88f]">
        <CheckCircle2 className="w-8 h-8 animate-pulse" />
      </div>
      <div>
        <h3 className="text-base font-bold text-[#fff7ed] uppercase tracking-wide">Purchase Successful</h3>
        <p className="text-xs text-[#f3e4cf] mt-1 max-w-xs mx-auto">
          Payment verified and dataset has been decrypted locally in your browser. The file download has started.
        </p>
      </div>

      <div className="bg-[#1f1f1f] border border-[#3a322f] p-3 rounded text-left">
        <span className="text-[10px] text-[#f3e4cf] uppercase tracking-widest font-mono block">Released Decryption Key</span>
        <code className="text-xs text-[#e7c88f] font-mono select-all break-all block mt-1">
          {decryptionKey}
        </code>
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
