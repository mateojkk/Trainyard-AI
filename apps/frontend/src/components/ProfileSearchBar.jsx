import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { profilesApi } from "../lib/api";
import { Search, Loader2 } from "lucide-react";

export default function ProfileSearchBar() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const doSearch = async (q) => {
    setQuery(q);
    if (q.length < 2) { setResults([]); setSearching(false); return; }
    setSearching(true);
    try {
      const data = await profilesApi.searchProfiles(q);
      setResults(data.profiles || []);
    } catch { setResults([]); }
    setSearching(false);
  };

  return (
    <div className="relative mb-8">
      <div className="flex items-center gap-3 bg-[#242424] border border-[#3a322f] rounded-lg px-4 py-2.5">
        <Search className="w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search profiles by username..."
          value={query}
          onChange={(e) => doSearch(e.target.value)}
          className="bg-transparent border-none outline-none text-gray-200 text-sm flex-1 placeholder-gray-500"
        />
      </div>
      {query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#242424] border border-[#3a322f] rounded-lg shadow-xl z-10 max-h-64 overflow-y-auto">
          {searching ? (
            <div className="p-4 text-center"><Loader2 className="w-5 h-5 text-[#e7c88f] animate-spin mx-auto" /></div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">No profiles found</div>
          ) : (
            results.map((p) => (
              <button
                key={p.google_sub}
                onClick={() => { setQuery(""); setResults([]); navigate(`/profile/${p.username}`); }}
                className="w-full text-left px-4 py-3 hover:bg-[#2f2f2f] border-b border-[#3a322f] last:border-b-0 transition"
              >
                <span className="text-[#e7c88f] font-mono text-sm">@{p.username}</span>
                {p.display_name && p.display_name !== p.username && (
                  <span className="text-gray-400 text-xs ml-2">{p.display_name}</span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
