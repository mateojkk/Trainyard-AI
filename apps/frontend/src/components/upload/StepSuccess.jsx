import { ShieldCheck, Copy, ExternalLink, ArrowRight } from "lucide-react";

export default function StepSuccess({
  result,
  copiedKey,
  copiedBlob,
  handleCopy,
  navigate,
}) {
  return (
    <div className="bg-[#111111] border border-[#1a1a1a] rounded-lg p-6 space-y-6 text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-950/30 border border-emerald-500/20 text-emerald-400">
        <ShieldCheck className="w-8 h-8 animate-pulse" />
      </div>

      <div className="space-y-1">
        <h3 className="text-base font-bold text-gray-100 uppercase tracking-wide">Dataset Live on Walrus!</h3>
        <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
          Your file was encrypted successfully and stored permanently on the Walrus mainnet storage network.
        </p>
      </div>

      <div className="space-y-4 text-left border-t border-b border-[#1a1a1a] py-6">
        <div className="space-y-1">
          <span className="text-[10px] text-gray-500 uppercase tracking-widest font-mono flex items-center justify-between">
            <span>Encrypted Walrus Blob ID</span>
            <span className="text-[9px] text-emerald-500">Permanent</span>
          </span>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={result.blob_id}
              className="flex-grow bg-[#141414] border border-[#2e2e2e] rounded p-2 text-xs font-mono text-gray-300 focus:outline-none"
            />
            <button
              onClick={() => handleCopy(result.blob_id, "blob")}
              className="px-3 border border-[#2e2e2e] hover:border-gray-500 rounded text-gray-400 hover:text-gray-200 transition cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
          {copiedBlob && <span className="text-[9px] text-emerald-500 block font-mono">Copied Blob ID!</span>}
        </div>

        <div className="space-y-1 bg-amber-950/10 border border-brand-amber/10 p-3.5 rounded">
          <span className="text-[10px] text-brand-amber uppercase tracking-widest font-bold font-mono block">
            Decryption Key (Save this!)
          </span>
          <p className="text-[10px] text-gray-500 leading-normal">
            This key is stored on our secure API nodes and will only be released to buyers who send SUI to your wallet. Keep a copy in your records.
          </p>
          
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              readOnly
              value={result.key_base64}
              className="flex-grow bg-[#0c0c0c] border border-brand-amber/20 rounded p-2 text-xs font-mono text-brand-amber focus:outline-none"
            />
            <button
              onClick={() => handleCopy(result.key_base64, "key")}
              className="px-3 bg-brand-amber/10 border border-brand-amber/20 hover:bg-brand-amber/20 rounded text-brand-amber transition cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
          {copiedKey && <span className="text-[9px] text-brand-amber block font-mono mt-1">Copied Decryption Key!</span>}
        </div>

        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-500">Walrusscan Mainnet link</span>
          <a
            href={result.walrus_explorer_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-amber hover:underline flex items-center gap-1 font-mono text-[11px]"
          >
            View Blob
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      <button
        onClick={() => navigate(`/dataset/${result.id}`)}
        className="w-full flex items-center justify-center gap-2 py-3 bg-[#f59e0b] hover:bg-[#d97706] text-black font-bold rounded text-xs uppercase tracking-wider transition cursor-pointer"
      >
        View in Marketplace
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
