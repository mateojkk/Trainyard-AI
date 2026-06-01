import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useZkLogin } from "../context/useZkLogin";
import { profilesApi } from "../lib/api";
import { LogOut, ChevronDown, KeyRound, Copy, Check, User } from "lucide-react";

export default function WalletButton() {
  const [showDropdown, setShowDropdown] = useState(false);
  const [copied, setCopied] = useState(false);
  const [profile, setProfile] = useState(null);
  const { account, error, login, logout } = useZkLogin();
  const fetched = useRef(false);

  useEffect(() => {
    if (account?.sub && !fetched.current) {
      fetched.current = true;
      profilesApi.getMyProfile().then(r => setProfile(r.profile)).catch(() => {});
    }
  }, [account?.sub]);

  const handleDisconnect = () => {
    logout();
    setShowDropdown(false);
    setProfile(null);
    fetched.current = false;
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(account?.address || "").then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const buttonContent = () => {
    if (profile?.avatar_url) {
      return <img src={profile.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover border border-[#3a322f]" />;
    }
    if (profile?.display_name) {
      return (
        <div className="w-7 h-7 rounded-full bg-[#e7c88f] flex items-center justify-center text-[#1c1c1c] font-bold text-sm">
          {profile.display_name.charAt(0).toUpperCase()}
        </div>
      );
    }
    const chars = (account?.address || "??").slice(0, 2);
    return (
      <div className="w-7 h-7 rounded-full bg-[#3a322f] flex items-center justify-center text-gray-300 font-mono text-xs">
        {chars}
      </div>
    );
  };

  if (!account) {
    return (
      <div className="relative">
        <button onClick={login}
          className="flex items-center gap-2 px-4 py-1.5 bg-[#D89F55] hover:bg-[#f0c57a] text-[#23120A] font-semibold rounded-md border border-transparent shadow transition duration-200 cursor-pointer text-sm"
        >
          <KeyRound className="w-4 h-4" /> Login
        </button>
        {error && <div className="absolute right-0 mt-2 w-64 text-[10px] text-red-300 bg-red-950/30 border border-red-900/40 rounded p-2">{error}</div>}
      </div>
    );
  }

  return (
    <div className="relative">
      <button onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-2 py-1.5 bg-[#242424] hover:bg-[#2f2f2f] text-[#fff7ed] rounded-md border border-[#3a322f] shadow hover:border-brand-blue transition duration-200 cursor-pointer text-sm"
      >
        {buttonContent()}
        <span className="text-sm text-gray-300">{profile?.display_name || profile?.username || account?.address?.slice(0, 6)}</span>
        <ChevronDown className="w-3.5 h-3.5 text-[#f3e4cf]" />
      </button>

      {showDropdown && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
          <div className="absolute right-0 mt-2 w-64 bg-[#242424] border border-[#3a322f] rounded-md shadow-xl z-20 overflow-hidden">
            <div className="px-4 py-3 border-b border-[#3a322f]">
              <p className="text-xs text-gray-500 font-mono break-all">{account.address}</p>
              <button onClick={copyAddress}
                className="flex items-center gap-1.5 mt-1.5 text-xs text-[#e7c88f] hover:text-[#f0d49e] transition"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied!" : "Copy address"}
              </button>
            </div>
            <Link to="/profile" onClick={() => setShowDropdown(false)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-[#2f2f2f] transition"
            ><User className="w-4 h-4" /> My Profile</Link>
            <button onClick={handleDisconnect}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-950/20 hover:text-red-300 transition"
            ><LogOut className="w-4 h-4" /> Disconnect</button>
          </div>
        </>
      )}
    </div>
  );
}
