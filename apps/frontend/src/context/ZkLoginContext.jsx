import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  beginZkLogin,
  clearZkLoginSession,
  hydrateZkLoginAccount,
  signAndExecuteTransaction,
  transferUsdcFromZkLogin,
  hasPendingZkLoginSession,
} from "../lib/zkLogin";
import { datasetsApi } from "../lib/api";
import { ZkLoginContext } from "./useZkLogin";

export function ZkLoginProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const loggedOutRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      if (loggedOutRef.current) {
        if (mounted) setLoading(false);
        return;
      }
      try {
        const sessionAccount = await hydrateZkLoginAccount();
        if (mounted) {
          setAccount(sessionAccount);
          setIsSessionActive(!!sessionAccount && hasPendingZkLoginSession());
        }
        if (sessionAccount?.address) {
          datasetsApi.syncSellerAddress(sessionAccount.address).catch((syncErr) => {
            console.warn("Seller address sync failed:", syncErr);
          });
        }
      } catch (err) {
        if (mounted && err?.response?.status !== 401) setError(err.message || "zkLogin failed.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadSession();
    return () => { mounted = false; };
  }, []);

  const signTx = useCallback(async (priceInUsdc, sellerAddress) => {
    const txDigest = await signAndExecuteTransaction(priceInUsdc, sellerAddress);
    return txDigest;
  }, []);

  const transferUsdc = useCallback(async (recipientAddress, amountInUsdc) => {
    const txDigest = await transferUsdcFromZkLogin(recipientAddress, amountInUsdc);
    return txDigest;
  }, []);

  const value = useMemo(() => ({
    account,
    isSessionActive,
    loading,
    error,
    signAndExecuteTransaction: signTx,
    transferUsdc,
    login: async (customReturnTo) => {
      setError("");
      const targetPath = typeof customReturnTo === "string" ? customReturnTo : undefined;
      try {
        await beginZkLogin(targetPath);
      } catch (err) {
        setError(err.message || "Unable to start zkLogin.");
      }
    },
    logout: async () => {
      loggedOutRef.current = true;
      try { await clearZkLoginSession(); } catch {}
      setAccount(null);
      setIsSessionActive(false);
      setError("");
    },
  }), [account, isSessionActive, loading, error, signTx, transferUsdc]);

  return (
    <ZkLoginContext.Provider value={value}>
      {children}
    </ZkLoginContext.Provider>
  );
}
