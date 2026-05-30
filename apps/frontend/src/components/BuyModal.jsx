import { useState } from "react";
import { useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { paymentsApi } from "../lib/api";
import { fetchFromWalrus } from "../lib/walrus";
import { decryptBlob } from "../lib/crypto";
import { suiToMist } from "../lib/sui";
import BuyModalSuccess from "./BuyModalSuccess";
import { Loader2, ShieldAlert, Wallet, CreditCard, Sparkles } from "lucide-react";

const PLATFORM_ADDRESS = import.meta.env.VITE_PLATFORM_ADDRESS || "0x83e20df3bd995c697843818e6c7104b2b2b1735166b553e192f153a5c363980a";

export default function BuyModal({ isOpen, onClose, dataset }) {
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  const [loading, setLoading] = useState(false);
  const [statusStep, setStatusStep] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [decryptionKey, setDecryptionKey] = useState("");
  const [simulateMode, setSimulateMode] = useState(false);

  if (!isOpen) return null;

  const handlePurchase = async () => {
    if (!account) return;
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      let txDigest = "";
      if (simulateMode) {
        setStatusStep("Simulating blockchain payment...");
        await new Promise((resolve) => setTimeout(resolve, 1200));
        txDigest = `mock-tx-${Math.random().toString(36).substring(2)}-${Date.now()}`;
      } else {
        setStatusStep("Preparing transaction block...");
        const tx = new Transaction();
        const [coin] = tx.splitCoins(tx.gas, [suiToMist(dataset.price_sui)]);
        tx.transferObjects([coin], PLATFORM_ADDRESS);

        setStatusStep("Requesting signature from wallet...");
        const response = await signAndExecuteTransaction({ transaction: tx });
        txDigest = response.digest;
      }

      setStatusStep("Verifying transaction via Tatum RPC...");
      const verifyResult = await paymentsApi.verify(dataset.id, account.address, txDigest, dataset.blob_id);
      if (!verifyResult.success) throw new Error(verifyResult.error || "Payment verification failed.");

      setDecryptionKey(verifyResult.key_base64);

      setStatusStep("Fetching encrypted blob from Walrus...");
      const encryptedBuffer = await fetchFromWalrus(dataset.blob_id);

      setStatusStep("Decrypting dataset in browser...");
      const decryptedBlob = await decryptBlob(encryptedBuffer, verifyResult.key_base64, verifyResult.iv);

      setStatusStep("Saving decrypted dataset to device...");
      const url = URL.createObjectURL(decryptedBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = dataset.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSuccess(true);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to complete purchase. Ensure you have sufficient SUI.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#111111] border border-[#2e2e2e] rounded-lg max-w-md w-full overflow-hidden shadow-2xl">
        <div className="border-b border-[#1a1a1a] p-4 flex justify-between items-center bg-[#0d0d0d]">
          <h2 className="text-sm font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2 m-0">
            <CreditCard className="w-4 h-4 text-brand-amber" />
            Purchase Listing
          </h2>
          <button onClick={onClose} disabled={loading} className="text-gray-500 hover:text-gray-300 disabled:opacity-30 cursor-pointer text-sm bg-transparent border-0">✕</button>
        </div>

        <div className="p-6 space-y-6">
          {!success ? (
            <>
              <div className="space-y-2">
                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">Dataset Description</span>
                <div className="font-sans font-bold text-gray-100 text-lg leading-snug">{dataset.title}</div>
                <div className="text-xs text-gray-400">Includes: <span className="font-mono text-gray-300">{dataset.file_name}</span> ({dataset.file_type.toUpperCase()})</div>
              </div>

              <div className="bg-[#0c0c0c] border border-[#1a1a1a] rounded p-4 flex justify-between items-center">
                <div>
                  <span className="text-xs text-gray-500 block font-semibold uppercase">Total Price</span>
                  <span className="text-xs text-gray-600 block leading-tight">Includes 5% fee</span>
                </div>
                <div className="text-2xl font-bold text-brand-amber font-sans flex items-center gap-1.5">{dataset.price_sui} <span className="text-xs text-gray-400 font-normal">SUI</span></div>
              </div>

              <div className="bg-amber-950/15 border border-brand-amber/20 rounded p-3 flex items-start gap-3">
                <input type="checkbox" id="simulate-checkbox" checked={simulateMode} onChange={(e) => setSimulateMode(e.target.checked)} disabled={loading} className="mt-1 accent-brand-amber cursor-pointer" />
                <div>
                  <label htmlFor="simulate-checkbox" className="text-xs font-bold text-brand-amber flex items-center gap-1 cursor-pointer"><Sparkles className="w-3.5 h-3.5" />Reviewer Simulation Mode</label>
                  <p className="text-[10px] text-gray-500 leading-normal mt-0.5">Tick this box to test the complete end-to-end purchase flow, decryption, and file download without triggering a real SUI wallet signature.</p>
                </div>
              </div>

              {loading && <div className="flex items-center gap-3 bg-[#151515] p-3 border border-[#222222] rounded text-xs text-gray-400 font-mono"><Loader2 className="w-4 h-4 text-brand-amber animate-spin flex-shrink-0" /><span>{statusStep}</span></div>}
              {error && <div className="flex items-start gap-2 bg-red-950/10 border border-red-900/30 p-3 rounded text-xs text-red-400"><ShieldAlert className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" /><span>{error}</span></div>}

              <button onClick={handlePurchase} disabled={loading || !account} className="w-full flex items-center justify-center gap-2 py-3 bg-[#f59e0b] hover:bg-[#d97706] disabled:bg-gray-800 text-black disabled:text-gray-500 font-bold rounded shadow transition duration-150 cursor-pointer text-sm uppercase">
                {!account ? <><Wallet className="w-4 h-4" />Connect Wallet to Pay</> : <><CreditCard className="w-4 h-4" />{simulateMode ? "Simulate Purchase" : `Pay ${dataset.price_sui} SUI`}</>}
              </button>
            </>
          ) : (
            <BuyModalSuccess decryptionKey={decryptionKey} onClose={onClose} />
          )}
        </div>
      </div>
    </div>
  );
}
