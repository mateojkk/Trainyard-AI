# Trainyard AI

Trainyard AI is a decentralized marketplace for licensed AI training data.

The core idea is simple: people and organizations with valuable datasets should be able to upload once, prove where the data lives, and get paid every time someone buys access. Buyers get a normal marketplace experience, while the storage, settlement, and access control are backed by Sui, Walrus, and verified USDC payments.

Built for the **Tatum x Build on Sui with Walrus Hackathon**.

## The Problem

The data economy behind AI is changing fast. Publishers, artists, researchers, and data owners are pushing back against unlicensed scraping, and AI companies increasingly need clean, permissioned, provenance-aware data sources.

Trainyard AI is infrastructure for that market: a place where dataset owners can sell access directly, without middlemen, opaque contracts, or delayed payouts.

## What It Does

Sellers sign in with Google zkLogin, upload a dataset, and set a USDC price. The dataset is encrypted in the browser with AES-256-GCM before it leaves the seller's device. Trainyard never receives the raw file.

The encrypted dataset blob and public preview are stored on Walrus. The app stores listing metadata, the Walrus blob ID, and the encrypted-data release key separately.

Buyers browse listings, preview datasets, and pay in USDC on Sui. After the backend verifies the transaction through Tatum's Sui RPC endpoint, the decryption key is released and the buyer downloads the decrypted file locally.

Buyers can also return later to their private **Bought datasets** section and download previously purchased datasets again without paying twice.

## Hackathon Requirements

Trainyard AI satisfies the Tatum x Walrus requirements:

- **Walrus integration:** encrypted dataset payloads and public dataset previews are uploaded to Walrus mainnet.
- **Tatum integration:** backend transaction verification and app Sui RPC proxying use Tatum's Sui mainnet RPC endpoint with a Tatum API key.
- **Sui mainnet:** zkLogin identities, USDC payments, and payment verification target Sui mainnet.
- **Meaningful app use case:** Walrus is not a decorative storage add-on. The product depends on content-addressed decentralized storage for dataset availability and verifiable blob IDs.
- **Working demo flow:** seller upload, Walrus storage, marketplace listing, gasless USDC purchase, verified key release, local decryption, repeat download access.

## Why Walrus

Walrus gives Trainyard AI a storage layer that fits the product instead of fighting it.

Dataset buyers need confidence that the data they paid for is the same data the seller listed. Walrus blob IDs provide content-addressed references to encrypted payloads, so listings can point to durable, verifiable data instead of opaque server files.

Trainyard stores encrypted data on Walrus and keeps access controlled through cryptographic keys. That means the blob can be publicly retrievable while the usable plaintext stays private until a buyer completes payment.

## Why Tatum

Tatum gives the backend a reliable Sui mainnet RPC path for payment verification.

After a buyer submits a USDC payment transaction, the backend queries the transaction through Tatum's Sui RPC node and verifies:

- the transaction succeeded,
- the buyer address matches,
- the seller received the correct 95% amount,
- the platform received the correct 5% commission,
- the transaction digest has not already been used.

This prevents buyers from reusing old transaction digests for another listing and makes the key-release step server-verifiable.

## Core Features

- Google zkLogin authentication.
- Gasless USDC dataset purchases on Sui.
- Browser-side AES-256-GCM file encryption and decryption.
- Walrus mainnet upload for encrypted dataset blobs.
- Walrus preview upload for lightweight public dataset previews.
- Tatum-powered Sui RPC proxy and payment verification.
- Replay protection for already-used transaction digests.
- Seller price editing.
- Seller address sync when zkLogin salt/address changes.
- Private purchased dataset library for repeat downloads.
- Profile pages, follows, dataset search, and category filtering.
- AI-assisted listing metadata via Groq with backend fallback behavior.

## Architecture

Frontend:

- React + Vite.
- Sui dApp Kit and Mysten Sui SDK.
- zkLogin account flow.
- Web Crypto API for local encryption/decryption.
- Walrus aggregator reads for previews and purchased files.

Backend:

- FastAPI.
- Supabase for listings, profiles, keys, and payment receipts.
- Tatum Sui RPC endpoint for transaction verification.
- Shinami zkLogin prover integration.
- Walrus upload service using `@mysten/walrus`.

Storage and settlement:

- Walrus mainnet stores encrypted blobs and previews.
- Sui mainnet settles USDC payments.
- Payment receipts bind purchases to the authenticated Google subject and buyer address.

## Repository Structure

```text
apps/frontend        React/Vite frontend
apps/backend         FastAPI backend
apps/backend/routes  API routes for datasets, payments, auth, profiles, Sui RPC
apps/backend/services Walrus, Sui, auth, and AI service logic
apps/backend/scripts Walrus upload script
apps/backend/migrations Supabase SQL migrations
api                  Vercel serverless Walrus upload helper
```

## Local Setup

Install frontend dependencies:

```bash
npm install
cd apps/frontend
npm install
```

Create backend environment:

```bash
cd apps/backend
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
```

Copy environment files:

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
```

Required backend variables:

```text
SUPABASE_URL=
SUPABASE_KEY=
TATUM_API_KEY=
SUI_MAINNET_RPC=https://sui-mainnet.gateway.tatum.io
SHINAMI_API_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
AUTH_SESSION_SECRET=
PLATFORM_WALLET_ADDRESS=
SUI_PRIVATE_KEY=
MAX_API_UPLOAD_BYTES=4194304
MAX_API_UPLOAD_LABEL=4MB
```

Required frontend variables:

```text
VITE_API_URL=/api
VITE_SUI_RPC_URL=/api/sui-rpc
VITE_WALRUS_AGGREGATOR=https://aggregator.walrus-mainnet.walrus.space
VITE_PLATFORM_ADDRESS=
VITE_MAX_UPLOAD_BYTES=4194304
VITE_USDC_COIN_TYPE=0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC
```

Apply the Supabase migrations in `apps/backend/migrations`.

Run the app:

```bash
npm run dev
```

Backend runs on `http://localhost:8000` and frontend runs on `http://localhost:5173`.

## Demo Flow

1. Sign in with Google zkLogin.
2. Upload a `.csv`, `.json`, `.txt`, or `.zip` dataset.
3. Watch the browser encrypt the file locally.
4. Store the encrypted dataset and preview on Walrus.
5. Open the marketplace listing and inspect the Walrus-backed preview.
6. Buy the dataset with USDC on Sui.
7. Backend verifies the Sui transaction through Tatum RPC.
8. The key releases, the file decrypts locally, and the download starts.
9. Return to Profile -> Bought datasets and download the same purchased dataset again without paying twice.

## Economics

Trainyard takes a 5% commission on each dataset sale. Sellers receive 95% directly through the Sui USDC transaction.

The product model is designed around one-time storage and repeat sales: once a dataset is stored on Walrus, additional buyers can purchase access without requiring the seller to upload the data again.

## Security Notes

- Raw dataset files are encrypted in the browser before upload.
- The backend never receives plaintext dataset contents.
- Payment verification checks buyer, seller, platform address, amount, transaction success, and digest reuse.
- Purchased dataset access is tied to authenticated identity through `buyer_sub`, with buyer address fallback for older receipts.
- Decryption keys are only released after verified payment or previously verified ownership.

## Status

This is a hackathon build running against Sui mainnet and Walrus mainnet. It demonstrates a real end-to-end marketplace flow with real storage, real USDC settlement, and automatic key release after verified payment.
