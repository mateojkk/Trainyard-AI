import { useCallback, useState, useEffect } from "react";
import { useZkLogin } from "../context/useZkLogin";
import LandingFeatures from "../components/LandingFeatures";
import { datasetsApi } from "../lib/api";
import DatasetCard from "../components/DatasetCard";
import { Search, Loader2, Database, AlertCircle, RefreshCw } from "lucide-react";

const CATEGORIES = [
  { id: "all", label: "All Data" },
  { id: "nlp", label: "NLP" },
  { id: "vision", label: "Vision" },
  { id: "audio", label: "Audio" },
  { id: "tabular", label: "Tabular" },
  { id: "multimodal", label: "Multimodal" },
];

export default function Marketplace() {
  const { account, login } = useZkLogin();
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchListings = useCallback(async () => {
    if (!account) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await datasetsApi.getList(selectedCategory === "all" ? "" : selectedCategory, debouncedQuery, page, 12);
      setDatasets(data.datasets || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
      setError("Failed to retrieve listings from server. Is the API online?");
    } finally {
      setLoading(false);
    }
  }, [account, debouncedQuery, page, selectedCategory]);

  useEffect(() => {
    const handler = setTimeout(fetchListings, 0);
    return () => clearTimeout(handler);
  }, [fetchListings]);

  const totalPages = Math.ceil(total / 12) || 1;

  return (
    <div className="space-y-8">
      {!account ? (
        <LandingFeatures onLogin={login} />
      ) : (
        <>
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-[#242424] p-3 border border-[#3a322f] rounded">
            <div className="relative w-full md:max-w-xs">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-[#f3e4cf]" />
              </span>
              <input
                type="text"
                placeholder="Search title, tags, description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-9 pr-3 py-1.5 bg-[#2f2f2f] border border-[#3a322f] focus:border-brand-blue rounded text-xs text-[#fff7ed] placeholder-[#d1d5db] focus:outline-none transition duration-150 font-sans"
              />
            </div>

            <div className="flex flex-wrap gap-1 w-full md:w-auto">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => { setSelectedCategory(cat.id); setPage(1); }}
                  className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer transition duration-150 ${selectedCategory === cat.id ? "bg-[#D89F55]/12 text-brand-blue border border-brand-blue/30" : "bg-transparent text-[#f3e4cf] hover:text-[#fff7ed] border border-transparent"}`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {error ? (
            <div className="flex flex-col items-center justify-center p-8 bg-red-950/10 border border-red-900/30 rounded text-center max-w-lg mx-auto">
              <AlertCircle className="w-8 h-8 text-red-500 mb-2 animate-bounce" />
              <h3 className="text-sm font-bold text-red-400">Connection Error</h3>
              <p className="text-xs text-gray-400 mt-1">{error}</p>
              <button onClick={fetchListings} className="mt-4 flex items-center gap-1.5 px-3 py-1 bg-red-900/40 hover:bg-red-900/60 text-red-200 rounded text-xs font-semibold cursor-pointer transition"><RefreshCw className="w-3.5 h-3.5" />Retry Connection</button>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-brand-blue animate-spin" />
              <span className="text-xs text-[#f3e4cf] mt-2 font-mono">Loading trainyard database...</span>
            </div>
          ) : datasets.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-[#3a322f] rounded-lg">
              <Database className="w-10 h-10 text-[#f3e4cf] mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-[#fff7ed]">No datasets found</h3>
              <p className="text-xs text-[#f3e4cf] mt-1 max-w-xs mx-auto">No listings matched your criteria. Be the first to upload a new encrypted dataset in this category!</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {datasets.map((d) => <DatasetCard key={d.id} dataset={d} />)}
              </div>

              <div className="flex items-center justify-between border-t border-[#3a322f] pt-4 mt-8">
                <div className="text-xs text-[#f3e4cf] font-mono">Showing {datasets.length} of {total} records</div>
                <div className="flex gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border border-[#3a322f] hover:border-brand-blue rounded text-xs text-[#f3e4cf] hover:text-[#fff7ed] disabled:opacity-30 disabled:hover:border-[#3a322f] transition cursor-pointer">Previous</button>
                  <div className="flex items-center text-xs font-mono text-[#f3e4cf] px-2">Page {page} of {totalPages}</div>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 border border-[#3a322f] hover:border-brand-blue rounded text-xs text-[#f3e4cf] hover:text-[#fff7ed] disabled:opacity-30 disabled:hover:border-[#3a322f] transition cursor-pointer">Next</button>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
