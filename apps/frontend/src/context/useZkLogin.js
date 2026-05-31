import { createContext, useContext } from "react";

export const ZkLoginContext = createContext(null);

export function useZkLogin() {
  const context = useContext(ZkLoginContext);
  if (!context) throw new Error("useZkLogin must be used inside ZkLoginProvider");
  return context;
}
