import { Database, CheckCircle2 } from "lucide-react";
import styles from "./css/DatasetInfo.module.css";

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

export default function PreviewRenderer({ dataset, previewText }) {
  let parsedPreview = null;
  try {
    if (previewText && previewText.startsWith("{")) {
      parsedPreview = JSON.parse(previewText);
    }
  } catch (e) {
    console.error("JSON Preview parse error:", e);
  }

  // Handle legacy CSV parsing (listed before structured previews)
  let isLegacyCsv = false;
  let legacyHeaders = [];
  let legacyRows = [];
  if (!parsedPreview && dataset.file_type?.toLowerCase() === "csv" && previewText) {
    const lines = previewText.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length > 0) {
      isLegacyCsv = true;
      legacyHeaders = parseCsvLine(lines[0]);
      legacyRows = lines.slice(1, 6).map(line => parseCsvLine(line));
    }
  }

  if (isLegacyCsv) {
    return (
      <div className="space-y-4">
        <div className="overflow-x-auto border border-[#3a322f] rounded bg-[#1f1f1f]">
          <table className="min-w-full text-[11px] font-mono text-left border-collapse">
            <thead>
              <tr className="bg-[#2a2a2a] border-b border-[#3a322f] text-[#fff7ed]">
                {legacyHeaders.map((header, idx) => (
                  <th key={idx} className="p-2 border-r border-[#3a322f] font-semibold">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {legacyRows.map((row, rowIdx) => (
                <tr key={rowIdx} className="border-b border-[#3a322f]/50 hover:bg-[#282828] text-gray-300">
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx} className="p-2 border-r border-[#3a322f]/50 truncate max-w-[150px]">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-[#242424] border border-[#3a322f] rounded p-3 text-xs space-y-1">
          <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500">
            Dataset Fingerprint (Legacy listing)
          </div>
          <p className="text-gray-400 text-[10px] m-0">This CSV was listed before fingerprinting was introduced. Full row count and column types are unavailable.</p>
        </div>
      </div>
    );
  }

  if (!parsedPreview) {
    return (
      <div className="space-y-4">
        <pre className={styles.previewCode}>
          {previewText || "No preview data available."}
        </pre>
        {previewText && (
          <div className="bg-[#242424] border border-[#3a322f] rounded p-3 text-xs">
            <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500">
              Dataset Fingerprint (Legacy listing)
            </div>
            <p className="text-gray-400 text-[10px] m-0 mt-1">This dataset was listed before fingerprinting was introduced. Full row count and extension breakdown are unavailable.</p>
          </div>
        )}
      </div>
    );
  }

  if (parsedPreview.type === "csv") {
    return (
      <div className="space-y-4">
        <div className="overflow-x-auto border border-[#3a322f] rounded bg-[#1f1f1f]">
          <table className="min-w-full text-[11px] font-mono text-left border-collapse">
            <thead>
              <tr className="bg-[#2a2a2a] border-b border-[#3a322f] text-[#fff7ed]">
                {parsedPreview.csvHeaders.map((header, idx) => (
                  <th key={idx} className="p-2 border-r border-[#3a322f] font-semibold">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parsedPreview.csvRows.map((row, rowIdx) => (
                <tr key={rowIdx} className="border-b border-[#3a322f]/50 hover:bg-[#282828] text-gray-300">
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx} className="p-2 border-r border-[#3a322f]/50 truncate max-w-[150px]">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-[#242424] border border-[#3a322f] rounded p-3 text-xs space-y-2">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#e7c88f] flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
            Verified Client-Side Dataset Fingerprint
          </div>
          <div className="grid grid-cols-2 gap-4 text-[#d1d5db] font-mono text-[11px]">
            <div><span className="text-gray-500">Row Count:</span> {parsedPreview.fingerprint.rowCount.toLocaleString()}</div>
            <div><span className="text-gray-500">Columns:</span> {parsedPreview.fingerprint.columnNames.length}</div>
          </div>
          <div className="text-[10px] text-gray-400 font-mono">
            <span className="text-gray-500 font-bold block mb-1">Column Data Types:</span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {parsedPreview.fingerprint.columnNames.map((colName, idx) => (
                <span key={idx} className="bg-[#1c1c1c] border border-[#3a322f] px-2 py-0.5 rounded text-[10px] text-gray-300">
                  {colName}: <span className="text-brand-blue">{parsedPreview.fingerprint.columnTypes[idx]}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (parsedPreview.type === "zip") {
    return (
      <div className="space-y-4">
        {parsedPreview.thumbnails && parsedPreview.thumbnails.length > 0 ? (
          <div>
            <span className="text-[10px] text-gray-400 block mb-2 font-mono">Image Samples (First {parsedPreview.thumbnails.length} files):</span>
            <div className="flex gap-3">
              {parsedPreview.thumbnails.map((thumb, idx) => (
                <div key={idx} className="w-10 h-10 border border-[#3a322f] rounded overflow-hidden bg-[#1f1f1f] flex items-center justify-center p-1">
                  <img src={thumb} alt={`Sample ${idx + 1}`} className="w-full h-full object-contain" style={{ imageRendering: "pixelated" }} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 border border-[#3a322f] bg-[#1f1f1f] rounded p-4 text-xs text-gray-400">
            <Database className="w-4 h-4 text-brand-blue" />
            Binary contents compressed in archive. No direct image previews found.
          </div>
        )}
        <div className="bg-[#242424] border border-[#3a322f] rounded p-3 text-xs space-y-2">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#e7c88f] flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
            Verified Client-Side Dataset Fingerprint
          </div>
          <div className="font-mono text-[11px] text-[#d1d5db]">
            <span className="text-gray-500">Total File Count:</span> {parsedPreview.fingerprint.totalFiles === -1 ? "Too large (>200MB)" : parsedPreview.fingerprint.totalFiles}
          </div>
          <div className="text-[10px] text-gray-400 font-mono">
            <span className="text-gray-500 font-bold block mb-1">Extensions Breakdown:</span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {Object.entries(parsedPreview.fingerprint.extensionBreakdown).map(([ext, pct], idx) => (
                <span key={idx} className="bg-[#1c1c1c] border border-[#3a322f] px-2 py-0.5 rounded text-[10px] text-gray-300">
                  {ext}: <span className="text-[#e7c88f]">{pct}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <pre className={styles.previewCode}>
        {parsedPreview.content || "No preview data available."}
      </pre>
      <div className="bg-[#242424] border border-[#3a322f] rounded p-3 text-xs space-y-1">
        <div className="text-[10px] font-mono uppercase tracking-wider text-[#e7c88f] flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
          Verified Client-Side Dataset Fingerprint
        </div>
        <div className="font-mono text-[11px] text-[#d1d5db]">
          <span className="text-gray-500">Character Size:</span> {parsedPreview.fingerprint.characterCount?.toLocaleString()} bytes
        </div>
      </div>
    </div>
  );
}
