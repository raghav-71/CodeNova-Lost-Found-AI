# 🚀 CODENOVA — AI-Powered Campus Lost & Found Platform

CodeNova is an intelligent campus lost & found platform built to unify campus property recovery. It leverages Google Gemini AI with a robust deterministic fuzzy matching fallback, secure claim verification workflows, and privacy safeguards to help students and staff recover lost items safely and quickly.

---

## ✨ Key Features

1. **AI-Assisted Potential Matching (Dual-Tier Engine)**:
   - **Tier 1 (Gemini API)**: Deep semantic analysis comparing descriptions, distinctive characteristics, campus zones, and timestamps.
   - **Tier 2 (Deterministic Fallback)**: Tokenized cosine similarity, category hierarchies, campus topology proximity, and temporal decay scoring. Works 100% offline with zero dependencies!
   - **AI Safety Compliance**: AI output is strictly marked as *Potential Match (AI Suggested)*. Zero automated ownership approvals.
2. **Ownership Claim Verification Hub**:
   - Multi-factor verification questionnaires (specific location, date/time, distinctive marks, proof notes) prevent guessing and fraudulent claims.
   - Finder reviews responses and approves or rejects claims. Approving a claim automatically updates the item status to `RESOLVED` and coordinates handover.
3. **Real-time Status Tracking**:
   - Interactive 5-step lifecycle timeline: `Reported` $\rightarrow$ `AI Match Found` $\rightarrow$ `Claim Submitted` $\rightarrow$ `Finder Verification` $\rightarrow$ `Recovered & Reunited 🎉`.
4. **Rich Campus Search & Filters**:
   - Debounced keyword search across titles, descriptions, categories, and identifying marks.
   - Filters for Lost/Found type, Categories, Campus locations/buildings, and Statuses.
5. **In-App Notification Center**:
   - Instant notifications for AI matches, claims received, approvals, and recoveries.
6. **Privacy First**:
   - Personal phone numbers and contact emails remain masked until claims are verified by users.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Canvas Confetti
- **Backend**: Node.js, Express, TypeScript, Multer, JWT, BcryptJS
- **Database**: Relational SQLite database engine (`sql.js` pure WebAssembly with zero native compilation dependencies)
- **AI**: Google Gemini Generative AI SDK (`@google/generative-ai`) + Custom Deterministic Fuzzy Matching Engine

---

## 🚀 Quick Start Instructions

### 1. Install Dependencies
```bash
# In the root or individual directories
cd server && npm install
cd ../client && npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```env
PORT=5000
JWT_SECRET=codenova_jwt_super_secret_key_2026_campus_ai
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Optional: Add your Gemini API Key. (If omitted, the app automatically runs the full deterministic matching engine!)
GEMINI_API_KEY=
```

### 3. Run Development Servers
```bash
# Terminal 1: Backend Server (runs on http://localhost:5000)
cd server
npm run dev

# Terminal 2: Frontend Client (runs on http://localhost:5173)
cd client
npm run dev
```

### 4. Run Automated End-to-End Tests
```bash
cd server
npx tsx src/test_e2e.ts
```

---

## 👥 Demo Accounts

The database comes pre-seeded with realistic student accounts:

| Student Name | Email | Password | Role & Demo Scenario |
| :--- | :--- | :--- | :--- |
| **Alex Turner** | `alex.turner@campus.edu` | `password123` | CS Student — Lost Space Black MacBook Pro & AirPods |
| **Sarah Lin** | `sarah.lin@campus.edu` | `password123` | Design Student — Found MacBook Pro at Library Desk |
| **Marcus Vance** | `marcus.vance@campus.edu` | `password123` | Bio Student — Lost Leather Wallet |
| **Priya Patel** | `priya.patel@campus.edu` | `password123` | Engineering Student — Found Student ID |

> 💡 *Quick-login buttons are provided on the Login page for one-click testing.*

---

## 📱 Application Routes

- `/` — Landing page with interactive AI match simulator & workflow
- `/login` — Login with one-click demo accounts
- `/register` — Student registration with campus affiliations
- `/dashboard` — Main student recovery dashboard with live stats
- `/items` — Search and filter campus lost & found directory
- `/items/:id` — Detailed item inspection with status timeline & AI matches
- `/report/lost` — Submit lost item report with image upload
- `/report/found` — Submit found item report with instant AI matching
- `/my-items` — User's reported listings & lifecycle management
- `/claims` — Ownership claims hub (submitted & received verification)
- `/notifications` — In-app notification center
- `/profile` — Student profile and privacy settings
