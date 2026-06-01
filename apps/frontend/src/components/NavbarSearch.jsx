import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { profilesApi } from "../lib/api";
import { Search, Loader2 } from "lucide-react";

export default function NavbarSearch() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false); setQuery(""); setResults([]);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (query.length < 2) return;
    const timer = setTimeout(() => {
      setLoading(true);
      profilesApi.searchProfiles(query).then((d) => setResults(d.profiles || [])).catch(() => setResults([])).finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const select = (username) => {
    setOpen(false); setQuery(""); setResults([]);
    navigate(`/profile/${username}`);
  };

  return (
    <div ref={containerRef} className="relative">
      {open ? (
        <div className="flex items-center gap-1 bg-[#242424] border border-[#3a322f] rounded-md px-2 py-1">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input ref={inputRef} type="text" placeholder="Find people..." value={query}
            onChange={(e) => {
              const val = e.target.value;
              setQuery(val);
              if (val.length < 2) {
                setResults([]);
                setLoading(false);
              }
            }}
            className="w-28 bg-transparent border-none outline-none text-gray-200 text-xs placeholder-gray-500"
          />
          <button onClick={() => { setOpen(false); setQuery(""); setResults([]); }} className="text-gray-500 hover:text-gray-300 text-sm leading-none">&times;</button>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className="p-2 text-gray-400 hover:text-gray-200 transition cursor-pointer">
          <Search className="w-4.5 h-4.5" />
        </button>
      )}
      {open && query.length >= 2 && (
        <div className="absolute top-full right-0 mt-1 w-56 bg-[#242424] border border-[#3a322f] rounded-lg shadow-xl z-20 max-h-48 overflow-y-auto">
          {loading ? (
            <div className="p-3 text-center"><Loader2 className="w-4 h-4 text-[#e7c88f] animate-spin mx-auto" /></div>
          ) : results.length === 0 ? (
            <div className="p-3 text-center text-gray-500 text-xs">No profiles found</div>
          ) : (
            results.map((p) => (
              <button key={p.google_sub} onClick={() => select(p.username)}
                className="w-full text-left px-3 py-2 hover:bg-[#2f2f2f] border-b border-[#3a322f] last:border-b-0 transition"
              >
                <span className="text-[#e7c88f] font-mono text-xs">@{p.username}</span>
                {p.display_name && p.display_name !== p.username && (
                  <span className="text-gray-400 text-[10px] ml-2">{p.display_name}</span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
