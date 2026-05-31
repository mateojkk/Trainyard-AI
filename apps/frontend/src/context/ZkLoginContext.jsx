import { useEffect, useMemo, useState } from "react";
import {
  beginZkLogin,
  clearZkLoginSession,
  hydrateZkLoginAccount,
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

  const value = useMemo(() => ({
    account,
    loading,
    error,
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
  }), [account, loading, error]);

  return (
    <ZkLoginContext.Provider value={value}>
      {children}
    </ZkLoginContext.Provider>
  );
}
