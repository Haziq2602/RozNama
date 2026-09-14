# RozNama (रोज़नामा) 🎙️
### Multilingual Voice-First Ledger for Bharat Storekeepers & Local Kirana Stores

**RozNama** is a voice-powered khata ledger application designed specifically for local Kirana shopkeepers and small retail vendors across India. It allows store owners to record daily cash sales, manage customer debts (*udhaar*), calculate customer balances, and trigger polite WhatsApp payment reminders simply by speaking naturally in Hindi, Hinglish, or English.

---

## 🌟 Key Highlights & Features

1. **Hybrid Multilingual Speech Recognition (Online + Offline)**:
   * **Online High Accuracy**: Uses **Groq Whisper Large v3 (`whisper-large-v3-turbo`)** via native raw audio streaming for >95% transcription accuracy on regional Indian accents and colloquial Hindi/Hinglish phrasing.
   * **Offline Fallback**: Automatically switches to the browser's local Web Speech API when internet access is lost.

2. **Context-Aware AI Entity Extraction**:
   * Uses **Groq LLM (`openai/gpt-oss-120b`)** in strict JSON mode to extract:
     * **Customer Name**: Extracted from spoken phrases.
     * **Jama Cash**: Instant cash collected.
     * **Udhaar Debt**: Outstanding credit balance to be collected later.
     * **Items / Category**: Ration, grocery items, or general provisions.
     * **Payment Due Date**: Smart relative date extraction (*kal, parson, next week*).
   * **Human-in-the-Loop Verification**: An interactive review card allows the shopkeeper to verify or edit values before saving to the ledger.

3. **Multi-Store Database & Isolation (SQLite)**:
   * Powered by a lightweight Node.js / Express backend with a private SQLite database (`roznama.db`).
   * **Strict Vendor Isolation**: Every store account has its own isolated records; transactions and customer khatas are strictly bound to the authenticated vendor's account.

4. **1-Click WhatsApp Payment Reminders**:
   * Generates polite, localized payment reminder messages pre-composed with the exact pending balance and promised due date ready to send with a single click.

5. **Security & Zero-Exposure Architecture**:
   * API keys and environment variables remain strictly in `server/.env` and are never exposed to the client browser or Git.
   * Endpoints are protected with JSON Web Token (JWT) authentication.

---

## 🏗️ Architecture Overview

```
[Storekeeper Mic / Text]
         │
         ▼
[Frontend UI (Vanilla JS + CSS)]
         │
         ├── Online ──> POST /api/ai/transcribe ──> [Groq Whisper Large v3]
         │                     │
         │                     ▼
         │              POST /api/ai/extract    ──> [Groq LLM (GPT-OSS-120B)]
         │
         └── Offline ─> [Browser Web Speech API + Local Regex Parser]
                               │
                               ▼
                    [Preview Verification Card]
                               │
                               ▼
                    POST /api/ledger/transaction
                               │
                               ▼
                    [SQLite Database: roznama.db]
```

---

## 🚀 Getting Started

### 1. Prerequisites
* [Node.js](https://nodejs.org/) (v18 or higher recommended; v24 supported)
* npm (bundled with Node.js)

### 2. Installation
Clone the repository and install the backend dependencies:
```bash
cd RozNama/server
npm install
```

### 3. Environment Configuration
Create a `.env` file inside the `server/` directory (see `server/.env.example`):
```env
GROQ_API_KEY=your_groq_api_key_here
JWT_SECRET=your_jwt_secret_key
PORT=5000
```
> **Note**: Your `.env` file is automatically ignored by `.gitignore` to keep your keys secure.

### 4. Running the Application
Start the server from the `server/` folder:
```bash
node server.js
```
Open your browser and navigate to:
👉 **`http://localhost:5000`**

---

## 📂 Project Structure

```
RozNama/
├── index.html             # Main dashboard UI
├── style.css              # Custom styling (responsive dark-mode theme)
├── js/
│   ├── backend/
│   │   ├── app.js         # Application bootstrap & event binding
│   │   ├── store.js       # IndexedDB storage & cloud sync engine
│   │   ├── ledger.js      # Transaction processing & ledger business logic
│   │   └── parser.js      # AI entity extraction trigger & manual fallback
│   └── frontend/
│       ├── auth.js        # Vendor registration, login modal & JWT state
│       ├── speech.js      # Hybrid audio recording & speech recognition engine
│       └── ui.js          # Live DOM rendering & customer khata directory
└── server/
    ├── server.js          # Express entry point & static file server
    ├── db.js              # SQLite schema & database connection
    ├── middleware/
    │   └── auth.js        # JWT authorization middleware
    └── routes/
        ├── auth.js        # Vendor authentication endpoints
        ├── ledger.js      # Ledger sync & transaction CRUD endpoints
        └── ai.js          # Whisper STT & LLM entity extraction proxy
```

---

## 📄 License
MIT License. Created for Bharat storekeepers and Kirana retailers.
