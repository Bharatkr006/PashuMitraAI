# 🐄 PashuMitra AI — पशु मित्र (React + TypeScript Full Stack)

**Voice-first veterinary assistant for rural India**  
*ग्रामीण पशुपालकों के लिए निःशुल्क आवाज-आधारित पशु स्वास्थ्य सहायक*

[![Node.js](https://img.shields.io/badge/Node.js-20+-green)](https://nodejs.org)
[![React](https://img.shields.io/badge/Frontend-React_18_%2B_Vite-61DAFB)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript_5-3178C6)](https://typescriptlang.org)
[![TailwindCSS](https://img.shields.io/badge/Styling-TailwindCSS-38B2AC)](https://tailwindcss.com)
[![Render](https://img.shields.io/badge/Deploy-Render-black)](https://render.com)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## ⚠️ Important Disclaimer

PashuMitra AI is an **educational tool only**. It provides general guidance based on publicly available veterinary literature (ICAR, NDDB, DAHD). It is **NOT** a licensed veterinary diagnostic system and does **NOT** replace a qualified veterinarian. Always consult a licensed veterinarian for treatment decisions.

---

## 🌟 Key Features

1. **4 Comprehensive Tabs:**
   - 💬 **बातचीत (Chat & Consult):** Live consultation in Hindi & Rajasthani, browser Speech Recognition (STT), Text-to-Speech (TTS), color-coded triage, and evidence panels.
   - 🃏 **पशु स्वास्थ्य कार्ड (Pashu Health Cards):** Private local SQLite storage for animal profiles and consultation histories.
   - 📊 **मूल्यांकन डैशबोर्ड (Demo & Evaluation Dashboard):** Real-time measured metrics (queries, hit rate, latency, emergency alerts).
   - ℹ️ **जानकारी (About):** Mission, full-stack architecture diagram, free tool stack, and authoritative sources.
2. **Deterministic Safety Rules:** Rule-based emergency detection and prescription dosage refusals that 100% bypass AI overrides.
3. **Dialect Normalization:** Translates Marwari/Rajasthani and colloquial Hindi terms into standardized concepts.
4. **Offline-Capable Fallback:** Uses matching local knowledge-base guidance when the AI provider is unavailable. When neither a relevant entry nor the provider is available, the chat reports that limitation instead of presenting an unsupported answer.

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js v18+ (tested on Node v20 & v24)
- npm v9+

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment Variables (Optional)
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(Optional: Add a Groq API key from https://console.groq.com. Without it, matching local knowledge-base entries can still be used; questions with no matching entry will report that the AI provider is unavailable rather than inventing guidance.)*

### 3. Run Locally in Development Mode
Runs Express backend (port 3000) and Vite frontend (port 5173) concurrently:
```bash
npm run dev
```
Open **http://localhost:5173** in your browser.

### 4. Run Unit Tests (Vitest)
Executes all 87 ported TypeScript unit tests:
```bash
npm test
```

### 5. Build and Run Production Bundle
```bash
npm run build
npm start
```
Open **http://localhost:3000** in your browser.

---

## ☁️ Free Hosting on Render

This repository is pre-configured with `render.yaml` for free deployment on **[Render.com](https://render.com)**.

### Deployment Steps:
1. Push this repository to GitHub or GitLab.
2. Log in to [Render](https://dashboard.render.com).
3. Click **New +** → **Blueprint** (or **Web Service**).
4. Connect your repository.
5. Render detects `render.yaml`:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Plan:** Free
6. (Optional) In the Render dashboard, set the Environment Variable `GROQ_API_KEY` to your free Groq key.
7. Click **Apply / Deploy**. Your app will be live at `https://<your-app-name>.onrender.com`!

---

## 📁 Repository Structure

```
pashumitra_fixed/
├── package.json              # Monorepo workspaces config (server + client)
├── render.yaml               # 1-click Render hosting configuration
├── tsconfig.base.json        # Shared TypeScript config
├── .env.example              # Environment variables template
├── data/
│   ├── veterinary_knowledge.json   # 20 curated conditions (ICAR / NDDB)
│   ├── dialect_dictionary.json     # Hindi / Rajasthani term mappings
│   ├── sample_questions.json       # Pre-built test questions
│   └── pashumitra.db               # SQLite database (46 animals & health cards)
│
├── server/                   # Node.js + Express backend
│   ├── package.json
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   ├── src/
│   │   ├── types.ts          # Core TypeScript definitions
│   │   ├── app.ts            # Express application setup & static serving
│   │   ├── index.ts          # Server entry point
│   │   ├── routes/           # /api/chat, /api/animals, /api/metrics, /api/system, /api/tts, /api/transcribe
│   │   └── core/             # Safety rules, dialect normalizer, KB search, Groq/fallback
│   └── tests/                # 87 Vitest unit tests
│
└── client/                   # React + TypeScript + Vite frontend
    ├── package.json
    ├── vite.config.ts        # Vite config with /api proxy & build output to server/dist/public
    ├── tailwind.config.js    # Custom PashuMitra design tokens & animations
    ├── index.html            # Google Fonts (Inter + Noto Sans Devanagari)
    └── src/
        ├── App.tsx           # Main application shell with persistent sidebar & tabs
        ├── context/          # AppContext (animals, language) & ChatContext (messaging, TTS)
        └── components/
            ├── Header.tsx            # Header with language toggle & 1962 helpline
            ├── Sidebar.tsx           # Species selector (cow, buffalo, goat, sheep)
            ├── TabNavigation.tsx     # 4 primary tab navigation buttons
            ├── ChatTab/              # Chat message timeline, voice mic, triage cards
            ├── HealthCardTab/        # Animal profiles and consultation history
            ├── DashboardTab/         # Live metrics, checklist, honest limitations
            └── AboutTab/             # Mission, architecture, and knowledge sources

archive/                      # Preserved legacy artifacts
└── python_prototype/         # Original Python/Streamlit prototype for historical reference
```

---

## ⚖️ License

MIT License. Developed for rural Indian farmers and livestock keepers.
