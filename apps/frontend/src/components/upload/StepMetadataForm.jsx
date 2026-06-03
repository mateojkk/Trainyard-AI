import { Loader2, Sparkles, Database, Info, Lock } from "lucide-react";
const CATEGORY_GUIDELINES = {vision:".zip: images + annotation .json/.csv inside",audio:".zip: audio + transcript .csv inside",nlp:".txt, .csv, or .json (text/corpus data)",tabular:".csv — structured labeled data",multimodal:".zip: images, text, audio",other:".zip, .csv, .json, .txt"};

export default function StepMetadataForm({
  file,
  metadata,
  setMetadata,
  loadingAi,
  error,
  account,
  handleUploadAndStore,
  setStep,
}) {
  return (
    <div className="bg-[#242424] border border-[#3a322f] rounded-lg overflow-hidden space-y-6">
      <div className="border-b border-[#3a322f] p-4 bg-[#1f1f1f] flex justify-between items-center">
        <h3 className="text-xs font-bold text-[#fff7ed] uppercase tracking-wider flex items-center gap-2">
          <Database className="w-4 h-4 text-brand-blue" />
          Configure Listing Metadata
        </h3>
        <span className="text-[10px] text-[#f3e4cf] font-mono truncate max-w-[150px]">{file.name}</span>
      </div>

      <div className="p-6 pt-0 space-y-5">
        {loadingAi ? (
          <div className="flex items-center gap-3 bg-brand-blue/10 border border-brand-blue/20 p-4 rounded text-xs text-[#fff7ed]">
            <Loader2 className="w-4 h-4 text-brand-blue animate-spin flex-shrink-0" />
            <div className="space-y-0.5">
              <span className="font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-brand-blue animate-pulse" />
                AI Description Prefill...
              </span>
              <p className="text-[10px] text-[#f3e4cf]">
                Groq is generating an optimized description and keywords for your listing.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-[#1f1f1f] border border-[#3a322f] p-2.5 rounded text-[10px] text-[#f3e4cf]">
            <Info className="w-4 h-4 text-[#f3e4cf] flex-shrink-0" />
            <span>Description and tags were pre-filled via LLM analysis. Feel free to edit.</span>
          </div>
        )}

        <div className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="text-[#f3e4cf] block font-semibold">Dataset Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Labeled Medical Reviews for NLP"
              value={metadata.title}
              onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
              className="w-full bg-[#2f2f2f] border border-[#3a322f] focus:border-brand-blue rounded p-2.5 text-[#fff7ed] placeholder-[#d1d5db] focus:outline-none transition duration-150"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[#f3e4cf] block font-semibold">Marketplace Description</label>
            <textarea
              required
              rows={4}
              placeholder="Describe the data format, target ML application..."
              value={metadata.description}
              onChange={(e) => setMetadata({ ...metadata, description: e.target.value })}
              className="w-full bg-[#2f2f2f] border border-[#3a322f] focus:border-brand-blue rounded p-2.5 text-[#fff7ed] placeholder-[#d1d5db] focus:outline-none transition duration-150 font-sans"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[#f3e4cf] block font-semibold">ML Category</label>
              <select
                value={metadata.category}
                onChange={(e) => setMetadata({ ...metadata, category: e.target.value })}
                className="w-full bg-[#2f2f2f] border border-[#3a322f] focus:border-brand-blue rounded p-2.5 text-[#fff7ed] focus:outline-none transition duration-150 cursor-pointer"
              >
                <option value="nlp">Natural Language Processing (NLP)</option>
                <option value="vision">Computer Vision</option>
                <option value="audio">Audio / Speech Processing</option>
                <option value="tabular">Tabular / Labeled Features</option>
                <option value="multimodal">Multimodal (RAG / Embeddings)</option>
                <option value="other">Other / Custom</option>
              </select>
              <p className="text-[10px] text-[#e7c88f] mt-1">{CATEGORY_GUIDELINES[metadata.category]}</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[#f3e4cf] block font-semibold">Price (USDC)</label>
              <input
                type="number"
                min="0.20"
                step="0.01"
                required
                value={metadata.price_sui}
                onChange={(e) => setMetadata({ ...metadata, price_sui: e.target.value })}
                className="w-full bg-[#2f2f2f] border border-[#3a322f] focus:border-brand-blue rounded p-2.5 text-[#fff7ed] placeholder-[#d1d5db] focus:outline-none transition duration-150 font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[#f3e4cf] block font-semibold">Keywords / Tags (comma separated)</label>
            <input
              type="text"
              placeholder="e.g. sentiment, pytorch, medical"
              value={metadata.tags}
              onChange={(e) => setMetadata({ ...metadata, tags: e.target.value })}
              className="w-full bg-[#2f2f2f] border border-[#3a322f] focus:border-brand-blue rounded p-2.5 text-[#fff7ed] placeholder-[#d1d5db] focus:outline-none transition duration-150"
            />
          </div>
        </div>

        {error && <div className="bg-red-950/10 border border-red-900/30 text-xs text-red-400 p-3 rounded">{error}</div>}

        <div className="flex gap-4 pt-2">
          <button
            type="button"
            onClick={() => setStep(0)}
            className="w-1/3 py-2.5 border border-[#3a322f] hover:border-[#e7c88f] text-[#f3e4cf] font-semibold rounded text-xs uppercase tracking-wider transition cursor-pointer"
          >
            Back
          </button>
          
          <button
            type="button"
            onClick={handleUploadAndStore}
            disabled={!account || metadata.title.trim().length === 0}
            className="w-2/3 py-2.5 bg-brand-blue hover:bg-[#f0c57a] disabled:bg-[#51322D] text-[#23120A] disabled:text-[#f3e4cf] font-bold rounded text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Lock className="w-3.5 h-3.5" />
            Encrypt & Upload
          </button>
        </div>

        {!account && (
          <div className="text-[10px] text-center text-[#f3e4cf] bg-[#242424] border border-brand-blue/10 p-2.5 rounded leading-normal">
            Sign in with zkLogin in the navigation bar to enable encrypted uploading.
          </div>
        )}
      </div>
    </div>
  );
}
