# RozNama (रोज़नामा) 🎙️💳
### *The Next-Gen Multilingual Voice-First Ledger & UPI Payment Recovery Engine for Bharat's Kirana Stores*

[![MIT License](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![Voice AI](https://img.shields.io/badge/Voice_AI-Groq_Whisper_Large_v3_Turbo-orange.svg)](https://groq.com)
[![LLM Reasoning](https://img.shields.io/badge/LLM-Groq_GPT--OSS--120B-blue.svg)](https://groq.com)
[![Database](https://img.shields.io/badge/Cloud_DB-Supabase_PostgreSQL-green.svg)](https://supabase.com)
[![Offline First](https://img.shields.io/badge/Offline-IndexedDB_Outbox_Sync-purple.svg)](#offline-first-architecture)
[![Payments](https://img.shields.io/badge/Payments-NPCI_UPI_1--Tap_DeepLink-yellow.svg)](#smart-whatsapp-reminder-model)

---

## 🇮🇳 The Problem & Vision

Across India, over **15 million micro-retailers and Kirana storekeepers** power local neighborhood commerce. Yet, **over 80% of daily transactions remain stuck on paper notebooks (*khata*)**. Traditional digital ledger applications fail local storekeepers for three fundamental reasons:
1. **Typing Friction**: Store owners are busy behind physical counters with dusty hands; manual typing on keyboards is frustrating and slow.
2. **Ignored SMS Reminders**: Legacy apps charge vendors recurring fees for automated SMS payment reminders that customers dismiss as spam.
3. **Flawed Payment Links**: Raw `upi://` deep-links fail when opened inside WhatsApp's in-app sandbox on Android/iOS, blocking customer payments.

**RozNama** changes the game. It is a **voice-first, 4-view single-page application** that lets vendors manage their store entirely by speaking colloquially in **Hindi, Hinglish, or English**. With an **iOS-inspired floating navigation dock**, a **chronological double-entry replay engine**, and a **100% offline canvas QR & universal WhatsApp payment landing page**, RozNama transforms debt recovery with **0% commission and instant direct-to-bank settlement**.

---

## 🌟 Standout Signature Features

```
┌───────────────────────────────────────────────────────────────────────────┐
│                           ROZNAMA 4-VIEW ECOSYSTEM                        │
├────────────────────┬────────────────────┬────────────────┬────────────────┤
│   🏠 VIEW 1: HOME  │  👥 VIEW 2: KHATA  │ 📜 VIEW 3: LEDGER│ 👤 VIEW 4: STORE │
│  • Voice Hero Mic  │ • Credit Directory │ • Itemized Log │ • Store Profile│
│  • Groq Whisper v3 │ • Search & Sort    │ • Search Filter│ • UPI VPA Hub  │
│  • Daily Stat Cards│ • Status Chips     │ • Full History │ • Standee QR   │
│  • Quick Activity  │ • Clear Due & Pay  │ • Cash vs Debt │ • Cloud Backup │
└────────────────────┴────────────────────┴────────────────┴────────────────┘
                               ▲
                               │
               [ 🏝️ FLOATING NAVIGATION ISLAND DOCK ]
                  (Zero Page Reloads • Always Smooth)
```

---

### 1. 🚀 Universal WhatsApp Smart Reminder & 1-Tap UPI Gateway
*Our Signature Payment Recovery Breakthrough*

Legacy ledger apps send generic SMS reminders with high bounce rates. RozNama integrates directly into WhatsApp with an intelligent payment link system:
* **The WhatsApp Sandbox Bypass**: When customers tap raw `upi://` links inside WhatsApp chat bubbles, Android blocks them with *"No app found to open link"*. RozNama solves this by generating a universal payment bridge (`pay.html`) featuring an **Android Intent Scheme (`intent://pay?...#Intent;scheme=upi;end`)**.
* **Universal 1-Tap Payment Link**: One tap on the WhatsApp payment link automatically launches the customer's installed UPI app (**Google Pay, PhonePe, Paytm, BHIM, Cred**) with the storekeeper's VPA, verified merchant name, and exact outstanding balance pre-populated.
* **100% Client-Side Offline Canvas QR Code**: Powered by a bundled pure JavaScript QR engine (`qrcode.min.js`), scannable UPI dynamic QR codes are rendered directly onto HTML5 canvases **100% locally and offline without sending sensitive financial data to third-party QR generation APIs**.
* **Pre-Curated Localized Message Templates**: Choose between **🌟 Friendly Reminder**, **📅 Payment Due Date**, or **⚡ Clear Overdue** with a single tap.
* **0% Platform Cut & Instant Settlement**: Payments go directly from the customer's bank account to the storekeeper's UPI VPA with zero middlemen, no gateway holding fees, and instant settlement.

---

### 2. 🏝️ iOS-Inspired Floating Navigation Island (4-View Hub)
Designed for fluid, uninterrupted interaction behind the counter:
* **Elevated Floating Pill Dock**: Floats 22px above the screen bottom with translucent frosted glassmorphism (`backdrop-filter: blur(20px)`), delicate borders, and ambient drop shadows.
* **Dynamic Active State**: Active tabs feature elevated, gradient-glowing badges (`linear-gradient(135deg, #F59E0B, #D4B574)`) with micro-animations.
* **Zero Page Reloads**: Switching between tabs occurs instantaneously in-memory, preserving ongoing voice recordings, temporary draft cards, and local IndexedDB state.
* **Universal Responsiveness**: Seamlessly scales from compact Android smartphones and iPhones to desktop monitor displays.

---

### 3. 👥 Customer Khata Directory with Multi-Criteria Intelligence
A customer credit directory built for quick retrieval and debt prioritization:
* **Smart Search**: Real-time filtering by customer name or telephone number.
* **Multi-Criteria Sorting Engine**:
  * ₹ **Highest Udhaar First** — Prioritize maximum cash recoveries.
  * 📅 **Nearest Due Date** — Focus on urgent payment promises.
  * ₹ **Lowest Udhaar First** — Quickly clear small balances.
  * 🔤 **Alphabetical (A–Z)** — Standard directory indexing.
  * ⚡ **Recently Active** — Review recent customer activity.
* **One-Tap Status Filter Chips**:
  * **All Accounts** (with live account count badge)
  * **Pending Udhaar** (accounts with active outstanding credit)
  * **Due Today / Overdue** (accounts requiring immediate payment reminders)
  * **Settled / Nil** (accounts with zero due)
* **1-Tap Modal Actions**: Click **Clear Due** to record incoming cash payments, **💬 WhatsApp** to launch smart reminder templates, or **📞 Call** to dial directly.

---

### 4. 🧮 Chronological Double-Entry Ledger Replay Engine
Prevents balance corruption and synchronization overwrites:
* **The Challenge**: Traditional mobile web apps suffer from state-drift when transactions are synced with the cloud, often resetting cleared debts back to their original balance.
* **The RozNama Engine**: Uses an immutable event-stream model. All transactions (purchases and debt clearance settlements) are chronologically ordered from oldest to newest. The engine replays debits and credits dynamically, subtracting settlements from outstanding debt and updating payment due dates.
* **Result**: Once an amount is cleared, it stays cleared across page reloads, tab navigation, and Supabase cloud syncs.

---

### 5. 🎙️ Hybrid Voice & Predefined ML Pipeline (Online Cloud AI + Offline Local ML)
* **Online Ultra-Low Latency**: Streams raw audio to **Groq Whisper Large v3 Turbo (`whisper-large-v3-turbo`)** and **Groq LLM (`openai/gpt-oss-120b`)** in strict JSON mode to extract customer names, cash, credit, items, retail category, and relative due dates.
* **Predefined Offline Machine Learning Classifier & Extractor**:
  * **Zero Audio Ingestion Offline**: When disconnected from the internet, audio recordings are never stored as bulky audio blobs in IndexedDB. Instead, the browser's built-in Web Speech API translates speech into local text instantly.
  * **Local NLP & ML Category Classifier**: Analyzes the transcript on-device using a feature-weighted classifier to categorize transactions into 8 retail domains (*Groceries & Ration, Dairy & Milk Products, Cooking Oils & Ghee, Spices & Masala, Snacks & Beverages, Toiletries & Cleaning, Personal Care & Cosmetics, General Kirana*).
  * **Vernacular Amount & Item Extraction**: Separates purchased items from categories and detects cash received (*Jama*) vs pending credit (*Udhaar*) through proximity scoring and Hindi/Hinglish idioms.
* **Human-in-the-Loop Confirmation**: Displays an interactive card for the storekeeper to verify, edit, and confirm customer name, cash, udhaar, items, category, and due date before saving.
* **Smart Internet Reconnect Dialog**: When connectivity is restored, RozNama detects the reconnection, displays a custom pop-up dialog box, and asks the vendor if they wish to sync their offline IndexedDB transactions to Supabase Cloud.

---

### 6. ☁️ Enterprise Multi-Store Cloud Isolation (Supabase PostgreSQL + SQLite)
* **Multi-Tenant Security**: Every storekeeper gets a dedicated, isolated account secured by JSON Web Tokens (JWT) and bcrypt password hashing.
* **Cloud + Local Resilience**: Backed by **Supabase Cloud PostgreSQL** with automatic offline fallback to **local SQLite (`roznama.db`)** and client-side **IndexedDB**.
* **IndexedDB Outbox Queue**: Offline entries are stored locally as structured JSON records and synced to Supabase Cloud upon confirmation.

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    subgraph Client [RozNama Client - Browser / Mobile Web]
        UI[4-View SPA Interface]
        NAV[Floating Island Navigation Dock]
        QR[Client-Side Offline Canvas QR Generator]
        IDB[(IndexedDB Local Outbox)]
    end

    subgraph SpeechAI [Voice & Hybrid Intelligence Pipeline]
        MIC[Vendor Mic Input] -->|Raw Audio Stream - Online| WSP[Groq Whisper Large v3 Turbo]
        MIC -.->|Offline Fallback| WSAPI[Browser Web Speech API]
        WSP -->|Transcript| LLM[Groq GPT-OSS-120B Extraction]
        WSAPI -.->|Offline Fallback| OFFLINE_ML[Predefined Local ML & Category Extractor]
    end

    subgraph LedgerCore [Ledger Core & Accounting]
        REV[Human-in-the-Loop Review Card]
        CHRONO[Chronological Double-Entry Replay Engine]
        CLEAR[Clear Due Settlement Manager]
    end

    subgraph Payments [Smart WhatsApp UPI Recovery]
        WA[Smart WhatsApp Reminder Modal]
        PAY[Universal Payment Bridge - pay.html]
        APPS[UPI Apps: GPay / PhonePe / Paytm / BHIM]
    end

    subgraph Backend [Server & Cloud Infrastructure]
        SRV[Node.js / Express API Server]
        SUPA[(Supabase Cloud PostgreSQL)]
        SQLITE[(Local SQLite roznama.db Fallback)]
    end

    MIC --> UI
    LLM --> REV
    OFFLINE_ML --> REV
    REV --> CHRONO
    CLEAR --> CHRONO
    CHRONO --> IDB
    CHRONO --> SRV
    SRV --> SUPA
    SRV -.-> SQLITE
    UI --> WA
    WA -->|1-Tap Link| PAY
    PAY -->|Android Intent / Package URI| APPS
    APPS -->|Direct Bank Transfer 0% Fee| SUPA
```

---

## 🧭 Deep Dive: The 4 Distinct Views

| View | Icon | Purpose | Key Capabilities |
| :--- | :---: | :--- | :--- |
| **Home** | 🏠 | **Daily Voice Ledger** | Voice hero microphone, live waveform visualizer, manual text fallback, today's cash collected, total udhaar pending, active customer count, overdue count, and quick today's activity ledger. |
| **Khata** | 👥 | **Customer Directory** | Complete customer credit list, live search by name/phone, 5 sorting filters (highest udhaar, lowest udhaar, nearest due, alphabetical, recent), 4 filter chips (All, Pending, Due Today, Settled), customer avatars, due badges, 1-tap WhatsApp reminder, Call, and Clear Due settlement. |
| **History** | 📜 | **Transaction Ledger** | Chronological record of all cash, credit, and debt settlement entries with customer names, timestamps, item badges, jama cash, udhaar balance, and live search filtering. |
| **Store** | 👤 | **Store Profile & Settings** | Manage store identity (Shop Name, Owner Name, Registered Phone), Store UPI VPA management with quick-handle chips (`@upi`, `@okhdfcbank`, `@paytm`, etc.), live scannable Shop Counter Standee QR canvas, Supabase sync status, and account logout. |

---

## ⚡ Deployment & Quick Start Guide

RozNama features a unified deployment engine governed by **[roznama.config.js](file:///c:/AIML/Projects/orchestrate/RozNama/roznama.config.js)** with a **Single-Variable Switch (`DEPLOYMENT_MODE`)**:

```javascript
// roznama.config.js
module.exports = {
  DEPLOYMENT_MODE: 'LOCAL', // Toggle between 'LOCAL' (default) and 'VERCEL'
  OWNER_DEPLOY_KEY: process.env.OWNER_DEPLOY_KEY || 'roznama_owner_haziq_2026_secured'
};
```

---

### 💻 A. Local Deployment (Default — Recommended for Judges & Evaluators)

When `DEPLOYMENT_MODE: 'LOCAL'`, RozNama runs completely locally without external cloud dependencies. If internet is disconnected, the **Predefined Offline ML Classifier & Vernacular Amount Extractor** activates automatically with IndexedDB storage!

#### 1. Prerequisites
* **Node.js**: v18.0.0 or higher ([Download Node.js](https://nodejs.org/))
* **npm**: v9.0.0 or higher
* Modern web browser (Chrome, Edge, Brave, or Safari)

#### 2. Installation & Quick Boot
From the project root directory:
```bash
# 1. Install dependencies
npm install

# 2. Boot the RozNama server
npm start
```

The application boots immediately with local SQLite (`roznama.db`):
```text
🚀 RozNama Server running on http://localhost:5000 [Mode: LOCAL]
```
👉 Open your browser at: **`http://localhost:5000`**

*(Optional)* If you wish to connect to your own Supabase Cloud or Groq Whisper AI locally, copy `.env.example` to `server/.env` and insert your API keys.

---

### ☁️ B. Vercel Cloud Deployment (Owner-Protected Anti-Theft Guard)

> 🛡️ **Anti-Theft Security Guard**: Cloud deployment on Vercel is strictly gated to the verified project owner. Any unauthorized attempts to deploy this repository to another Vercel account without the secret `OWNER_DEPLOY_KEY` are automatically rejected with a **`403 Forbidden (LOCKED_UNAUTHORIZED_OWNER)`** response. Hackathon judges can seamlessly evaluate the project locally with `npm start`!

#### Step-by-Step Vercel Deployment Instructions (For Project Owner):

1. **Step 1: Switch Deployment Mode**
   In `roznama.config.js`, change `DEPLOYMENT_MODE` from `'LOCAL'` to `'VERCEL'`:
   ```javascript
   // roznama.config.js
   module.exports = {
     DEPLOYMENT_MODE: 'VERCEL', // <-- Change from 'LOCAL' to 'VERCEL'
     OWNER_DEPLOY_KEY: process.env.OWNER_DEPLOY_KEY || 'roznama_owner_haziq_2026_secured'
   };
   ```

2. **Step 2: Commit and Push to GitHub**
   ```bash
   git add .
   git commit -m "chore: enable VERCEL deployment mode and modular structure"
   git push origin main
   ```

3. **Step 3: Import Project in Vercel**
   - Go to [vercel.com](https://vercel.com) and log in.
   - Click **"Add New..." ➔ "Project"**.
   - Select your GitHub repository (`orchestrate` / `RozNama`).
   - If `RozNama` is in a subfolder, set **Root Directory** to `RozNama`. If it's at root, leave as `./`.
   - Set **Framework Preset** to **Other** (Vercel automatically detects `vercel.json` and `api/index.js`).

4. **Step 4: Configure Environment Variables in Vercel**
   Under the **Environment Variables** section in the Vercel deployment modal (or in **Settings ➔ Environment Variables**), add the following:

   | Key | Value | Description |
   | :--- | :--- | :--- |
   | `OWNER_DEPLOY_KEY` | `roznama_owner_haziq_2026_secured` | **Mandatory.** Unlocks the anti-theft cloud gatekeeper. |
   | `DEPLOYMENT_MODE` | `VERCEL` | Confirms serverless cloud mode. |
   | `SUPABASE_URL` | `https://your-project.supabase.co` | Your Supabase PostgreSQL database URL. |
   | `SUPABASE_KEY` | `your-supabase-service-or-anon-key` | Your Supabase API access key. |
   | `JWT_SECRET` | `your_ultra_secure_jwt_secret_phrase` | Secret key for storekeeper auth sessions. |
   | `GROQ_API_KEY` | `gsk_your_groq_whisper_and_llm_api_key` | *(Optional)* For cloud Whisper voice recognition. |
   | `GEMINI_API_KEY` | `your_google_gemini_api_key` | *(Optional)* AI assistant fallback key. |

5. **Step 5: Deploy & Verify**
   - Click **Deploy**.
   - Vercel will install dependencies, compile the serverless function, and provision a global HTTPS URL (e.g. `https://roznama.vercel.app`).
   - Test health check: Visit `https://roznama.vercel.app/api/health`. You will see:
     ```json
     { "status": "ok", "service": "RozNama API Server", "deploymentMode": "VERCEL" }
     ```
   - Open `https://roznama.vercel.app` in your mobile or desktop browser — your 4-view voice ledger is live!

---

## 📂 Modular Project Directory Structure

The codebase is organized into cleanly decoupled modules for maximum maintainability:

```
RozNama/
├── index.html                  # 4-View SPA HTML structure & Floating Navigation Island
├── style.css                   # iOS glassmorphism design system, elevated badges & responsive styles
├── pay.html                    # Universal 1-tap UPI payment gateway (Android intent & deep links)
├── roznama.config.js           # Master deployment switch ('LOCAL' vs 'VERCEL') & Owner Guard
├── vercel.json                 # Vercel serverless function & client-side static routing
├── package.json                # Root package configuration for local and cloud deployment
├── .env.example                # Sample environment variables template
├── README.md                   # Comprehensive project documentation & architecture guide
├── api/
│   └── index.js                # Vercel serverless function entry point with anti-theft gatekeeper
├── js/
│   ├── frontend/
│   │   ├── qrcode.min.js       # Zero-dependency offline client-side QR generator (window.QRCode)
│   │   ├── modals.js           # [MODULAR] All interactive popup dialogs (Clear Due, Phone, UPI, WhatsApp QR, Reconnect)
│   │   ├── ui.js               # [MODULAR] 4-view SPA controller, stat counters, customer directory & transaction table
│   │   ├── auth.js             # Vendor session manager, JWT handler & landing page controller
│   │   └── speech.js           # Resilient voice STT engine & offline input redirector
│   └── backend/
│       ├── app.js              # Application bootstrap & DOM event listeners
│       ├── classifier.js       # [MODULAR] Predefined 8 retail categories ML taxonomy, feature weights & scoring engine
│       ├── store.js            # IndexedDB outbox queue & chronological double-entry replay engine
│       ├── ledger.js           # Transaction processing & category confirmation triggers
│       ├── parser.js           # Hybrid Groq LLM & Predefined Offline ML Classifier & Extractor
│       └── demo-data.js        # Voice recognition helper phrases & initial test seeds
└── server/
    ├── server.js               # Express application entry point & static file server
    ├── db.js                   # Unified Supabase Cloud client with local SQLite fallback
    ├── middleware/
    │   └── auth.js             # Bearer JWT token verification middleware
    └── routes/
        ├── auth.js             # Vendor registration, login & session verification
        ├── ledger.js           # Cloud transaction sync & itemized history endpoints
        └── ai.js               # Groq Whisper STT & LLM entity extraction proxies
```

---

## 🛡️ Security, Privacy & Ethics

* **Zero Financial Data Leakage**: RozNama does not act as a payment custodian or intermediary. All UPI transactions settle directly peer-to-peer (P2P/P2M) via NPCI's official banking protocols.
* **Strict Tenant Isolation**: Storekeeper records are partitioned by unique vendor IDs at both the database level (PostgreSQL / SQLite) and API token level (JWT).
* **Pure Offline Canvas Generation**: UPI QR codes are rendered strictly client-side on HTML5 canvases without sending customer names, phone numbers, or due amounts to external third-party QR generation web services.

---

## 📜 License
This project is licensed under the **MIT License**. Created with ❤️ for Bharat storekeepers, Kirana retailers, and micro-merchants across India.
