import { ShieldCheck, Copy, ExternalLink, ArrowRight } from "lucide-react";

export default function StepSuccess({
  result,
  copiedKey,
  copiedBlob,
  handleCopy,
  navigate,
}) {
  return (
    <div className="bg-[#242424] border border-[#3a322f] rounded-lg p-6 space-y-6 text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#2f2f2f] border border-[#e7c88f]/20 text-[#e7c88f]">
        <ShieldCheck className="w-8 h-8 animate-pulse" />
      </div>

      <div className="space-y-1">
        <h3 className="text-base font-bold text-[#fff7ed] uppercase tracking-wide">Dataset Live on Walrus!</h3>
        <p className="text-xs text-[#f3e4cf] max-w-xs mx-auto leading-relaxed">
          Your file was encrypted successfully and stored permanently on the Walrus mainnet storage network.
        </p>
      </div>

      <div className="space-y-4 text-left border-t border-b border-[#3a322f] py-6">
        <div className="space-y-1">
          <span className="text-[10px] text-[#f3e4cf] uppercase tracking-widest font-mono flex items-center justify-between">
            <span>Encrypted Walrus Blob ID</span>
            <span className="text-[9px] text-[#f0c57a]">Permanent</span>
          </span>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={result.blob_id}
              className="flex-grow bg-[#2f2f2f] border border-[#3a322f] rounded p-2 text-xs font-mono text-[#fff7ed] focus:outline-none"
            />
            <button
              onClick={() => handleCopy(result.blob_id, "blob")}
              className="px-3 border border-[#3a322f] hover:border-[#e7c88f] rounded text-[#f3e4cf] hover:text-[#fff7ed] transition cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
          {copiedBlob && <span className="text-[9px] text-[#f0c57a] block font-mono">Copied Blob ID!</span>}
        </div>

        <div className="space-y-1 bg-[#1f1f1f] border border-brand-blue/10 p-3.5 rounded">
          <span className="text-[10px] text-brand-blue uppercase tracking-widest font-bold font-mono block">
            Decryption Key (Save this!)
          </span>
          <p className="text-[10px] text-[#f3e4cf] leading-normal">
            This key is stored on our secure API nodes and will only be released after verified USDC payment on Sui. Keep a copy in your records.
          </p>
          
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              readOnly
              value={result.key_base64}
              className="flex-grow bg-[#1f1f1f] border border-brand-blue/20 rounded p-2 text-xs font-mono text-brand-blue focus:outline-none"
            />
            <button
              onClick={() => handleCopy(result.key_base64, "key")}
              className="px-3 bg-brand-blue/10 border border-brand-blue/20 hover:bg-brand-blue/20 rounded text-brand-blue transition cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
          {copiedKey && <span className="text-[9px] text-brand-blue block font-mono mt-1">Copied Decryption Key!</span>}
        </div>

        <div className="flex justify-between items-center text-xs">
          <span className="text-[#f3e4cf]">Walrusscan Mainnet link</span>
          <a
            href={result.walrus_explorer_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-blue hover:underline flex items-center gap-1 font-mono text-[11px]"
          >
            View Blob
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      <button
        onClick={() => navigate(`/dataset/${result.id}`)}
        className="w-full flex items-center justify-center gap-2 py-3 bg-brand-blue hover:bg-[#f0c57a] text-[#1e90ff] font-bold rounded text-xs uppercase tracking-wider transition cursor-pointer"
      >
        View in Marketplace
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
