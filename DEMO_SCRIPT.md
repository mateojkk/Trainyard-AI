# Trainyard AI - Hackathon Demo Walkthrough Script

This script walks a developer or hackathon judge through testing the core features of the Trainyard AI decentralized marketplace.

---

## Prerequisites
1. Ensure the MongoDB container is running:
   ```bash
   podman ps | grep mongodb
   ```
2. Start the Backend API server:
   ```bash
   cd backend && python main.py
   ```
3. Start the Frontend Vite application:
   ```bash
   cd frontend && npm run dev
   ```
4. Open the browser to `http://localhost:5173`.

---

## Step 1: Browse the Marketplace
- **Objective**: Explore existing dataset listings.
- **Action**: 
  - Look at the homepage grid. Notice the dark theme, data-dense cards, and SUI price badges.
  - Type in the search bar (e.g., "sentiment") to test the **debounced text-search** query over title, tags, and description.
  - Click on the category tabs (NLP, Vision, Tabular) to filter the grid.

---

## Step 2: List a New Dataset (Contributor Flow)
- **Objective**: Upload an encrypted file to Walrus.
- **Action**:
  - Click **Upload** in the navigation bar.
  - Drag and drop a sample dataset (or select a file, e.g., a `.csv` or `.txt` file).
  - Observe **Step 1 (Choose File)** is checked. Click **Continue**.
  - In **Step 2 (Configure Metadata)**, notice the spinner: **"AI Description Prefill..."**.
    - Groq's API (or the backend fallback) reads the first 500 characters of the file and auto-fills a suggested title, description, and keywords.
  - Edit the suggested description or tags if desired. Set the price to `0.5 SUI`.
  - Connect your wallet if it is disconnected, then click **Encrypt & Upload to Walrus**.
  - Observe the live upload tracker:
    1. *Encrypting dataset locally* (AES-256-GCM happens inside the browser sandbox).
    2. *Uploading encrypted data to Walrus* (Sent to backend, falling back to local mock folder if Walrus mainnet gateway is overloaded).
    3. *Uploading preview index to Walrus* (Uploads plaintext 500-byte preview).
    4. *Registering listing on Sui marketplace* (Saves metadata and splits key to MongoDB).
  - Review **Step 3 (Success Screen)**. Copy the **Decryption Key** and **Walrus Blob ID** to your clipboard.

---

## Step 3: Purchase and Decrypt (Buyer Flow)
- **Objective**: Spend SUI to retrieve the decryption key and download the file.
- **Action**:
  - Click **View in Marketplace** on the success screen or click on your new dataset card from the home page.
  - On the Details page, notice the **Plaintext Dataset Preview** fetched directly from Walrus.
  - Click **Buy and Decrypt**.
  - **Reviewer Simulation Mode**:
    - Tick the **Reviewer Simulation Mode** checkbox inside the modal. This allows testing the flow instantly without spending real SUI.
    - Click **Simulate Purchase**.
    - Watch the stepper complete: verifying payments via Tatum RPC, retrieving the symmetric key, fetching ciphertext from Walrus, and decrypting it.
  - Observe the file immediately downloading onto your device. Open it to verify that it matches the original file exactly!
