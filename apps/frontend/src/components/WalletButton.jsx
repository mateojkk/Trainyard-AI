import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useZkLogin } from "../context/useZkLogin";
import { profilesApi, suiRpcApi } from "../lib/api";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { LogOut, ChevronDown, KeyRound, Copy, Check, User, Wallet, Eye, EyeOff } from "lucide-react";

const PENDING_KEY = "trainyard.zklogin.pending";
const USDC_COIN_TYPE = import.meta.env.VITE_USDC_COIN_TYPE || "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC";

export default function WalletButton() {
  const [showDropdown, setShowDropdown] = useState(false);
  const [copied, setCopied] = useState(false);
  const [profile, setProfile] = useState(null);
  const [balance, setBalance] = useState(null);
  const [exportState, setExportState] = useState({ open: false, key: "", revealed: false, copied: false });
  const { account, error, login, logout } = useZkLogin();
  const fetched = useRef(false);

  useEffect(() => {
    if (account?.sub && !fetched.current) {
      fetched.current = true;
      profilesApi.getMyProfile().then(r => setProfile(r.profile)).catch(() => {});
    }
  }, [account?.sub]);

  useEffect(() => {
    if (!account?.address) return;
    suiRpcApi.getBalance(account.address, USDC_COIN_TYPE).then(r => {
      setBalance(r.result?.totalBalance || "0");
    }).catch(() => {});
  }, [account?.address]);

  const handleDisconnect = () => {
    logout(); setShowDropdown(false); setProfile(null); setBalance(null); fetched.current = false;
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(account?.address || "").then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleExport = () => {
    try {
      const raw = window.sessionStorage.getItem(PENDING_KEY);
      if (!raw) return;
      const keypair = Ed25519Keypair.fromSecretKey(JSON.parse(raw).secretKey);
      setExportState({ open: true, key: keypair.getSecretKey(), revealed: false, copied: false });
    } catch (e) { console.error("Export key failed:", e); }
  };

  const toggleReveal = () => setExportState(s => ({ ...s, revealed: !s.revealed }));

  const copyKey = () => {
    navigator.clipboard.writeText(exportState.key).then(() => {
      setExportState(s => ({ ...s, copied: true }));
      setTimeout(() => setExportState(s => ({ ...s, copied: false })), 2000);
    });
  };

  const btn = () => {
    if (profile?.avatar_url)
      return <img src={profile.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover border border-[#3a322f]" />;
    if (profile?.display_name)
      return <div className="w-7 h-7 rounded-full bg-[#e7c88f] flex items-center justify-center text-[#1c1c1c] font-bold text-sm">{profile.display_name[0]}</div>;
    return <div className="w-7 h-7 rounded-full bg-[#3a322f] flex items-center justify-center text-gray-300 font-mono text-xs">{(account?.address || "??").slice(0, 2)}</div>;
  };

  if (!account)
    return <div className="relative">
      <button onClick={login} className="flex items-center gap-2 px-4 py-1.5 bg-[#D89F55] hover:bg-[#f0c57a] text-[#23120A] font-semibold rounded-md shadow transition cursor-pointer text-sm"><KeyRound className="w-4 h-4" /> Login</button>
      {error && <div className="absolute right-0 mt-2 w-64 text-[10px] text-red-300 bg-red-950/30 border border-red-900/40 rounded p-2">{error}</div>}
    </div>;

  return (
    <div className="relative">
      <button onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-2 py-1.5 bg-[#242424] hover:bg-[#2f2f2f] text-[#fff7ed] rounded-md border border-[#3a322f] shadow hover:border-brand-blue transition cursor-pointer text-sm"
      >{btn()}<span className="text-sm text-gray-300">{profile?.display_name || profile?.username || account?.address?.slice(0, 6)}</span><ChevronDown className="w-3.5 h-3.5 text-[#f3e4cf]" /></button>

      {showDropdown && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
          <div className="absolute right-0 mt-2 w-64 bg-[#242424] border border-[#3a322f] rounded-md shadow-xl z-20 overflow-hidden">
            <div className="px-4 py-3 border-b border-[#3a322f]">
              <p className="text-xs text-gray-500 font-mono break-all">{account.address}</p>
              <div className="flex items-center gap-3 mt-1.5">
                <button onClick={copyAddress} className="flex items-center gap-1 text-xs text-[#e7c88f] hover:text-[#f0d49e] transition">
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}{copied ? "Copied!" : "Copy address"}
                </button>
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-400">
                <Wallet className="w-3.5 h-3.5" />USDC: <span className="text-[#e7c88f] font-mono">{balance !== null ? (Number(balance) / 1_000_000).toFixed(2) : "..."}</span>
              </div>
            </div>
            <Link to="/profile" onClick={() => setShowDropdown(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-[#2f2f2f] transition"><User className="w-4 h-4" /> My Profile</Link>
            <button onClick={handleExport} className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-[#2f2f2f] transition"><KeyRound className="w-4 h-4" /> Export Private Key</button>
            <button onClick={handleDisconnect} className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-950/20 hover:text-red-300 transition"><LogOut className="w-4 h-4" /> Disconnect</button>
          </div>
        </>
      )}

      {exportState.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setExportState(s => ({ ...s, open: false }))}>
          <div className="bg-[#242424] border border-[#3a322f] rounded-lg shadow-xl w-full max-w-md mx-4 p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-gray-200 mb-2">Export Private Key</h3>
            <p className="text-xs text-gray-500 mb-4">Import this key into any Sui wallet. Keep it secret — anyone with it controls your funds.</p>
            <div className="bg-[#1c1c1c] border border-[#3a322f] rounded p-3 mb-4">
              <p className="text-xs font-mono break-all text-gray-300">{exportState.revealed ? exportState.key : exportState.key.slice(0, 12) + "••••••••••••••••"}</p>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <button onClick={toggleReveal} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 transition cursor-pointer bg-transparent border border-[#3a322f] rounded">
                {exportState.revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}{exportState.revealed ? "Hide" : "Reveal"}
              </button>
              <button onClick={copyKey} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-[#D89F55] hover:bg-[#f0c57a] text-[#23120A] font-semibold cursor-pointer transition border-0">
                {exportState.copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}{exportState.copied ? "Copied" : "Copy"}
              </button>
              <button onClick={() => setExportState(s => ({ ...s, open: false }))} className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 transition cursor-pointer bg-transparent border-0">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
