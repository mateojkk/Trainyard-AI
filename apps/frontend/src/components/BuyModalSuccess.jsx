import { CheckCircle2 } from "lucide-react";

export default function BuyModalSuccess({ decryptionKey, onClose }) {
  return (
    <div className="text-center py-6 space-y-6">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-950/30 border border-blue-300/20 text-blue-200">
        <CheckCircle2 className="w-8 h-8 animate-pulse" />
      </div>
      <div>
        <h3 className="text-base font-bold text-gray-100 uppercase tracking-wide">Purchase Successful</h3>
        <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
          Payment verified and dataset has been decrypted locally in your browser. The file download has started.
        </p>
      </div>

      <div className="bg-[#0c0c0c] border border-[#1a1a1a] p-3 rounded text-left">
        <span className="text-[10px] text-gray-500 uppercase tracking-widest font-mono block">Released Decryption Key</span>
        <code className="text-xs text-[#38bdf8] font-mono select-all break-all block mt-1">
          {decryptionKey}
        </code>
      </div>

      <button
        onClick={onClose}
        className="w-full py-2 bg-[#1c1c1c] hover:bg-[#2e2e2e] text-gray-300 font-semibold rounded text-xs tracking-wider uppercase transition cursor-pointer"
      >
        Return to Dataset
      </button>
    </div>
  );
}
