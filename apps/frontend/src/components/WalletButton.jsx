import { useState } from "react";
import { ConnectModal, useCurrentAccount, useDisconnectWallet, useSuiClientQuery } from "@mysten/dapp-kit";
import { truncateAddress } from "../lib/sui";
import { Wallet, LogOut, ChevronDown } from "lucide-react";

export default function WalletButton() {
  const [showModal, setShowModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const account = useCurrentAccount();
  const { mutate: disconnect } = useDisconnectWallet();

  // Fetch coin balance of SUI
  const { data: coinBalance } = useSuiClientQuery(
    "getCoinBalance",
    {
      owner: account?.address || "",
      coinType: "0x2::sui::SUI",
    },
    {
      enabled: !!account?.address,
    }
  );

  const handleDisconnect = () => {
    disconnect();
    setShowDropdown(false);
  };

  const getBalanceDisplay = () => {
    if (!coinBalance) return "0.00 SUI";
    const balanceNum = Number(coinBalance.totalBalance) / 1_000_000_000;
    return `${balanceNum.toFixed(2)} SUI`;
  };

  if (!account) {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-1.5 bg-[#f59e0b] hover:bg-[#d97706] text-black font-semibold rounded-md border border-transparent shadow transition duration-200 cursor-pointer text-sm"
        >
          <Wallet className="w-4 h-4" />
          Connect Wallet
        </button>

        <ConnectModal
          trigger={null}
          open={showModal}
          onOpenChange={(open) => setShowModal(open)}
        />
      </>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-3 py-1.5 bg-[#141414] hover:bg-[#1c1c1c] text-gray-200 rounded-md border border-[#2e2e2e] shadow hover:border-brand-amber transition duration-200 cursor-pointer text-sm font-medium"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span className="font-mono text-xs">{truncateAddress(account.address)}</span>
        <span className="text-gray-400">|</span>
        <span className="text-brand-amber font-mono text-xs">{getBalanceDisplay()}</span>
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
