import { useState } from "react";
import { useZkLogin } from "../context/useZkLogin";
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
          className="flex items-center gap-2 px-4 py-1.5 bg-[#D89F55] hover:bg-[#f0c57a] text-[#23120A] font-semibold rounded-md border border-transparent shadow transition duration-200 cursor-pointer text-sm"
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
        className="flex items-center gap-2 px-3 py-1.5 bg-[#242424] hover:bg-[#2f2f2f] text-[#fff7ed] rounded-md border border-[#3a322f] shadow hover:border-brand-blue transition duration-200 cursor-pointer text-sm font-medium"
      >
        <span className="w-2 h-2 rounded-full bg-[#f0c57a] animate-pulse"></span>
        <span className="font-mono text-xs">{truncateAddress(account.address)}</span>
        <span className="text-[#f3e4cf]">|</span>
        <span className="text-brand-blue font-mono text-xs">zkLogin</span>
        <ChevronDown className="w-3.5 h-3.5 text-[#f3e4cf]" />
      </button>

      {showDropdown && (
        <>
          {/* Backdrop to close dropdown on click outside */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          ></div>

          <div className="absolute right-0 mt-2 w-48 bg-[#242424] border border-[#3a322f] rounded-md shadow-xl z-20 overflow-hidden">
            <div className="px-4 py-2 border-b border-[#3a322f] text-xs text-[#f3e4cf] font-mono break-all">
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
