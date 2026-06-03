import { UploadCloud, File, ArrowRight, Info } from "lucide-react";
import { formatBytes } from "../../lib/sui";

export default function StepChooseFile({
  file,
  error,
  handleDragOver,
  handleDrop,
  triggerFileSelect,
  fileInputRef,
  handleFileChange,
  handleContinueToForm,
  maxUploadLabel = "10GB",
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-lg font-bold text-gray-100 uppercase tracking-wider">Contribute Labeled Training Data</h2>
        <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
          List your ML datasets permanently on Walrus. Get paid directly in USDC on Sui.
        </p>
      </div>

      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={triggerFileSelect}
        className="border border-dashed border-[#3a322f] hover:border-brand-blue rounded-lg bg-[#242424] hover:bg-[#2f2f2f] p-10 text-center cursor-pointer transition-all duration-200 group"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />
        
        <UploadCloud className="w-10 h-10 text-[#f3e4cf] group-hover:text-brand-blue mx-auto mb-3 transition duration-200" />
        <span className="text-sm font-bold text-[#fff7ed] block">Drag & drop dataset file here</span>
        <span className="text-xs text-[#d1d5db] block mt-1">or click to browse local files</span>
        <span className="text-[10px] text-[#f3e4cf] block mt-4 font-mono">
          Accepted: .zip, .csv, .json, .txt (max {maxUploadLabel})
        </span>
      </div>

      {file && (
        <div className="bg-[#242424] border border-[#3a322f] p-4 rounded flex items-center justify-between">
          <div className="flex items-center gap-3">
            <File className="w-5 h-5 text-brand-blue" />
            <div>
              <span className="text-xs font-bold text-[#fff7ed] block truncate max-w-[280px]" title={file.name}>
                {file.name}
              </span>
              <span className="text-[10px] text-[#f3e4cf] block font-mono">
                {formatBytes(file.size)} &bull; {file.name.includes(".") ? file.name.split(".").pop().toUpperCase() : "BIN"}
              </span>
            </div>
          </div>
          
          <button
            onClick={handleContinueToForm}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-blue hover:bg-[#f0c57a] text-[#23120A] font-semibold rounded text-xs transition duration-150 cursor-pointer"
          >
            Continue
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-950/10 border border-red-900/30 text-xs text-red-400 p-3 rounded flex items-start gap-2">
          <Info className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
