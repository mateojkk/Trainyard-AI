**Trainyard AI**

Trainyard AI is a decentralized marketplace for AI training datasets. Contributors upload client-side encrypted datasets permanently to **Walrus** (decentralized blob storage on Sui mainnet). Buyers browse listings, purchase access directly via SUI peer-to-peer transfers, and receive decryption keys automatically upon blockchain validation.

The protocol supports a configurable marketplace fee, demonstrated at **5%**, to show a sustainable marketplace model. All data lives permanently on Walrus, and decryption keys are handled trustlessly.

---

**Technical Stack & Architecture**

Frontend
- **Vite & React 19** (JavaScript)
- **Tailwind CSS v4** for UI styling.
- **Web Crypto API**: Handles secure client-side `AES-256-GCM` encryption. The plaintext dataset is never sent to the network.
- **Mysten Labs dApp Kit & Sui SDK**: Connects wallets, reads mainnet balances, and prepares programmable transactions (PTB) for peer-to-peer payments.

Backend
- **FastAPI**: Main high-performance API server.
- **Motor / MongoDB**: Indexes dataset metadata (title, category, price, tags, and encrypted blob links) and maintains a secure decryption key database.
- **Tatum RPC**: Validates mainnet SUI payment transactions to ensure the buyer transferred the correct price to the seller (and platform fee) before releasing the decryption key.
- **Groq API**: Generates auto-descriptions and semantic tag listings using `llama-3.3-70b-versatile` from sample previews during contributor upload.

---

## Monorepo Layout

```text
.
├── api/                 # Vercel Python serverless entrypoint
├── apps/
│   ├── backend/         # FastAPI application
│   └── frontend/        # Vite React application
├── package.json         # Root npm workspace scripts
├── requirements.txt     # Root Vercel Python dependency pointer
└── vercel.json          # Vercel build and routing config
```

# Trainyard-AI
