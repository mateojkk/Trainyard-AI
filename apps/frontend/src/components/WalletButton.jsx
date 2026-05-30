import { useState } from "react";
import { useZkLogin } from "../context/ZkLoginContext";
import { truncateAddress } from "../lib/sui";
import { LogOut, ChevronDown, KeyRound } from "lucide-react";

export default function WalletButton() {
  const [showDropdown, setShowDropdown] = useState(false);
  const { account, error, login, logout } = useZkLogin();

  const handleDisconnect = () => {
    logout();
    setShowDropdown(false);
  };

  if (!account) {
    return (
      <div className="relative">
        <button
          onClick={login}
          className="flex items-center gap-2 px-4 py-1.5 bg-[#38bdf8] hover:bg-[#7dd3fc] text-black font-semibold rounded-md border border-transparent shadow transition duration-200 cursor-pointer text-sm"
        >
          <KeyRound className="w-4 h-4" />
          Login
        </button>
        {error && <div className="absolute right-0 mt-2 w-64 text-[10px] text-red-300 bg-red-950/30 border border-red-900/40 rounded p-2">{error}</div>}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-3 py-1.5 bg-[#141414] hover:bg-[#1c1c1c] text-gray-200 rounded-md border border-[#2e2e2e] shadow hover:border-brand-blue transition duration-200 cursor-pointer text-sm font-medium"
      >
        <span className="w-2 h-2 rounded-full bg-blue-300 animate-pulse"></span>
        <span className="font-mono text-xs">{truncateAddress(account.address)}</span>
        <span className="text-gray-400">|</span>
        <span className="text-brand-blue font-mono text-xs">zkLogin</span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
      </button>

      {showDropdown && (
        <>
          {/* Backdrop to close dropdown on click outside */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          ></div>

          <div className="absolute right-0 mt-2 w-48 bg-[#141414] border border-[#2e2e2e] rounded-md shadow-xl z-20 overflow-hidden">
            <div className="px-4 py-2 border-b border-[#2e2e2e] text-xs text-gray-400 font-mono break-all">
              {account.address}
            </div>
            <button
              onClick={handleDisconnect}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-950/20 hover:text-red-300 transition duration-150 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Disconnect
            </button>
          </div>
        </>
      )}
    </div>
  );
}
