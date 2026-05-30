**Trainyard AI**

Trainyard AI is a decentralized marketplace for AI training datasets. Contributors upload client-side encrypted datasets permanently to **Walrus** (decentralized blob storage on Sui mainnet). Buyers browse listings, purchase access directly via SUI peer-to-peer transfers, and receive decryption keys automatically upon blockchain validation.

The platform charges a **5% commission** on transactions. All data lives permanently on Walrus, and decryption keys are handled trustlessly.

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

Vercel builds the React app from `apps/frontend` and serves the FastAPI backend through `/api/*`.

## Running the Application

### 1. Database Setup
Ensure Podman or Docker is installed. Spin up a MongoDB instance locally:
```bash
podman run -d --name mongodb -p 27017:27017 docker.io/library/mongo:latest
```

### 2. Backend Setup
Create a virtual environment in the backend app and start the FastAPI server:
```bash
cd apps/backend
# Create/activate virtualenv
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Start Dev Server
cd ..
python -m backend.main
```
The server starts at `http://localhost:8000`.

### 3. Frontend Setup
Install dependencies from the repo root and run the Vite dev server:
```bash
npm --prefix apps/frontend install
npm run dev
```
The application will open at `http://localhost:5173`.

---

## Environment Configuration

### Backend (`apps/backend/.env`)
```ini
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB=trainyard
TATUM_API_KEY=your-tatum-api-key-here
GROQ_API_KEY=your-groq-api-key-here
PLATFORM_WALLET_ADDRESS=0x83e20df3bd995c697843818e6c7104b2b2b1735166b553e192f153a5c363980a
```

### Frontend (`apps/frontend/.env`)
```ini
VITE_API_URL=http://localhost:8000
VITE_WALRUS_AGGREGATOR=https://aggregator.walrus-mainnet.walrus.space
VITE_WALRUS_PUBLISHER=https://publisher.walrus-mainnet.walrus.space
VITE_PLATFORM_ADDRESS=0x83e20df3bd995c697843818e6c7104b2b2b1735166b553e192f153a5c363980a
```
# Trainyard-AI
