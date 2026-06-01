import { useCallback, useEffect, useMemo, useState } from "react";
import {
  beginZkLogin,
  clearZkLoginSession,
  hydrateZkLoginAccount,
  signAndExecuteTransaction,
} from "../lib/zkLogin";
import { ZkLoginContext } from "./useZkLogin";

export function ZkLoginProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      try {
        const sessionAccount = await hydrateZkLoginAccount();
        if (mounted) setAccount(sessionAccount);
      } catch (err) {
        if (mounted && err?.response?.status !== 401) setError(err.message || "zkLogin failed.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadSession();
    return () => {
      mounted = false;
    };
  }, []);

  const signTx = useCallback(async (priceInUsdc) => {
    const txDigest = await signAndExecuteTransaction(priceInUsdc);
    return txDigest;
  }, []);

  const value = useMemo(() => ({
    account,
    loading,
    error,
    signAndExecuteTransaction: signTx,
    login: async () => {
      setError("");
      try {
        await beginZkLogin();
      } catch (err) {
        setError(err.message || "Unable to start zkLogin.");
      }
    },
    logout: () => {
      clearZkLoginSession();
      setAccount(null);
      setError("");
    },
  }), [account, loading, error, signTx]);

  return (
    <ZkLoginContext.Provider value={value}>
      {children}
    </ZkLoginContext.Provider>
  );
}
