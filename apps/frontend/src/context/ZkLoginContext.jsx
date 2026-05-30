import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  beginZkLogin,
  clearZkLoginSession,
  consumeZkLoginRedirect,
  getStoredZkLoginAccount,
} from "../lib/zkLogin";

const ZkLoginContext = createContext(null);

export function ZkLoginProvider({ children }) {
  const [account, setAccount] = useState(() => getStoredZkLoginAccount());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(() => {
    return !!new URLSearchParams(window.location.hash.slice(1)).get("id_token");
  });

  useEffect(() => {
    let mounted = true;

    async function finishRedirect() {
      try {
        const redirectAccount = await consumeZkLoginRedirect();
        if (mounted && redirectAccount) setAccount(redirectAccount);
      } catch (err) {
        if (mounted) setError(err.message || "zkLogin failed.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    finishRedirect();
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

export function useZkLogin() {
  const context = useContext(ZkLoginContext);
  if (!context) throw new Error("useZkLogin must be used inside ZkLoginProvider");
  return context;
}
