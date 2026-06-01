import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { createNetworkConfig, SuiClientProvider } from "@mysten/dapp-kit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ZkLoginProvider } from "./context/ZkLoginContext.jsx";
import App from "./App.jsx";
import "./index.css";
import "@mysten/dapp-kit/dist/index.css";

const SUI_RPC = import.meta.env.VITE_SUI_RPC_URL;
if (!SUI_RPC) throw new Error("VITE_SUI_RPC_URL is not set");
const { networkConfig } = createNetworkConfig({
  mainnet: { url: SUI_RPC }
});

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="mainnet">
        <ZkLoginProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ZkLoginProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
