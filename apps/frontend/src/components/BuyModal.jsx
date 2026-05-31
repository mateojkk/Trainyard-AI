import { useState } from "react";
import { useZkLogin } from "../context/useZkLogin";
import { paymentsApi } from "../lib/api";
import { fetchFromWalrus } from "../lib/walrus";
import { decryptBlob } from "../lib/crypto";
import { PAYMENT_SYMBOL, formatPaymentAmount } from "../lib/payments";
import BuyModalSuccess from "./BuyModalSuccess";
import { Loader2, ShieldAlert, KeyRound, CreditCard, Sparkles } from "lucide-react";

export default function BuyModal({ isOpen, onClose, dataset }) {
  const { account } = useZkLogin();

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
        setStatusStep("Simulating gasless USDC payment...");
        await new Promise((resolve) => setTimeout(resolve, 1200));
        txDigest = `mock-tx-${Math.random().toString(36).substring(2)}-${Date.now()}`;
      } else {
        throw new Error("Gasless USDC zkLogin payments require the sponsor/prover backend.");
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
      setError(err.message || `Failed to complete ${PAYMENT_SYMBOL} purchase.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#1c1c1c]/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#242424] border border-[#3a322f] rounded-lg max-w-md w-full overflow-hidden shadow-2xl">
        <div className="border-b border-[#3a322f] p-4 flex justify-between items-center bg-[#1f1f1f]">
          <h2 className="text-sm font-bold text-[#fff7ed] uppercase tracking-wider flex items-center gap-2 m-0">
            <CreditCard className="w-4 h-4 text-brand-blue" />
            Purchase Listing
          </h2>
          <button onClick={onClose} disabled={loading} className="text-[#f3e4cf] hover:text-[#fff7ed] disabled:opacity-30 cursor-pointer text-sm bg-transparent border-0">✕</button>
        </div>

        <div className="p-6 space-y-6">
          {!success ? (
            <>
              <div className="space-y-2">
                <span className="text-[10px] text-[#f3e4cf] uppercase tracking-widest font-mono">Dataset Description</span>
                <div className="font-sans font-bold text-[#fff7ed] text-lg leading-snug">{dataset.title}</div>
                <div className="text-xs text-[#f3e4cf]">Includes: <span className="font-mono text-[#fff7ed]">{dataset.file_name}</span> ({dataset.file_type.toUpperCase()})</div>
              </div>

              <div className="bg-[#1f1f1f] border border-[#3a322f] rounded p-4 flex justify-between items-center">
                <div>
                  <span className="text-xs text-[#f3e4cf] block font-semibold uppercase">Total Price</span>
                  <span className="text-xs text-[#d1d5db] block leading-tight">Includes 5% fee</span>
                </div>
                <div className="text-2xl font-bold text-brand-blue font-sans flex items-center gap-1.5">{formatPaymentAmount(dataset.price_sui)} <span className="text-xs text-gray-400 font-normal">{PAYMENT_SYMBOL}</span></div>
              </div>

              <div className="bg-[#242424] border border-brand-blue/20 rounded p-3 flex items-start gap-3">
                <input type="checkbox" id="simulate-checkbox" checked={simulateMode} onChange={(e) => setSimulateMode(e.target.checked)} disabled={loading} className="mt-1 accent-[#D89F55] cursor-pointer" />
                <div>
                  <label htmlFor="simulate-checkbox" className="text-xs font-bold text-brand-blue flex items-center gap-1 cursor-pointer"><Sparkles className="w-3.5 h-3.5" />Reviewer Simulation Mode</label>
                  <p className="text-[10px] text-[#f3e4cf] leading-normal mt-0.5">Tick this box to test purchase, decryption, and download without triggering a real sponsored USDC payment.</p>
                </div>
              </div>

              {loading && <div className="flex items-center gap-3 bg-[#1f1f1f] p-3 border border-[#3a322f] rounded text-xs text-[#f3e4cf] font-mono"><Loader2 className="w-4 h-4 text-brand-blue animate-spin flex-shrink-0" /><span>{statusStep}</span></div>}
              {error && <div className="flex items-start gap-2 bg-red-950/10 border border-red-900/30 p-3 rounded text-xs text-red-400"><ShieldAlert className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" /><span>{error}</span></div>}

              <button onClick={handlePurchase} disabled={loading || !account} className="w-full flex items-center justify-center gap-2 py-3 bg-[#D89F55] hover:bg-[#f0c57a] disabled:bg-[#51322D] text-[#23120A] disabled:text-[#f3e4cf] font-bold rounded shadow transition duration-150 cursor-pointer text-sm uppercase">
                {!account ? <><KeyRound className="w-4 h-4" />Sign in with zkLogin</> : <><CreditCard className="w-4 h-4" />{simulateMode ? "Simulate Purchase" : `Pay ${formatPaymentAmount(dataset.price_sui)} ${PAYMENT_SYMBOL}`}</>}
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
