# 🚀 FINDIT AI — Intelligent Campus Lost & Found Platform

> **"Lost something? Let's find it."**

FindIt AI is an intelligent campus lost & found platform built to unify campus property recovery. It leverages real Supabase Authentication, Supabase PostgreSQL with Row-Level Security (RLS), Google Gemini AI with multi-signal fuzzy matching fallback, natural language intent search, secure claim verification workflows, and strict user data isolation.

---

## ✨ Key Architecture & Security Highlights

1. **Single Source of Truth for Authentication**:
   - Built on Supabase Authentication (`auth.users.id`).
   - Every user has a unique authenticated identity. All backend private operations verify the authenticated Supabase session JWT.
2. **Complete User Data Isolation**:
   - Brand-new accounts start completely fresh with 0 items, 0 claims, 0 matches, and 0 notifications.
   - Dashboards display personalized metrics derived strictly from the authenticated user's records.
   - Comprehensive protection against Insecure Direct Object References (IDOR) on items, claims, notifications, and profiles.
3. **Campus Ownership Claim Verification Hub**:
   - Multi-factor verification questionnaires (specific location, date/time, distinctive identifying marks, proof notes) prevent guessing and fraudulent claims.
   - Anti-fraud rule: users cannot submit claims on their own reported items.
   - Finder reviews responses and approves or rejects claims. Approving a claim automatically transitions item status to `RESOLVED` and coordinates handover.
4. **Intelligent Natural Language Search & AI Matching**:
   - Describe what you lost or found in conversational language (e.g., *"I lost my silver Apple iPad with keyboard near the science lounge"*).
   - Gemini 1.5 Flash extracts structured intent (object, category, brand, color, location, relative date) and performs deep semantic ranking.
5. **Real-time Status Tracking & In-App Notifications**:
   - Interactive 5-step lifecycle timeline: `Reported` $\rightarrow$ `AI Match Found` $\rightarrow$ `Claim Submitted` $\rightarrow$ `Finder Verification` $\rightarrow$ `Recovered & Reunited 🎉`.
   - Isolated real-time notification center for match alerts and claim decisions.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Canvas Confetti
- **Backend**: Node.js, Express, TypeScript, Multer, Supabase JS SDK
- **Database & Auth**: Supabase PostgreSQL + Supabase Auth + Supabase Storage
- **AI**: Google Gemini Generative AI SDK (`@google/generative-ai`) + Custom Deterministic Fuzzy Matching Engine

---

## 🚀 Quick Start Instructions

### 1. Install Dependencies
```bash
# Server dependencies
cd server && npm install

# Client dependencies
cd ../client && npm install
```

### 2. Configure Environment Variables
Ensure `.env` in the root and `client/.env` have valid Supabase and Gemini credentials:
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
GEMINI_API_KEY=your_gemini_api_key
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

### 4. Run Automated Two-User Isolation Tests
```bash
cd server
npm test
```

---

## 📱 Application Routes

- `/` — Landing page with interactive AI match simulator & campus workflow
- `/login` — Secure student login via Supabase Auth
- `/register` — New account registration with campus affiliations
- `/dashboard` — Personalized student recovery dashboard with live stats
- `/items` — Search and filter campus lost & found directory
- `/items/:id` — Detailed item inspection with status timeline & AI matches
- `/report/lost` — Submit lost item report with photo upload
- `/report/found` — Submit found item report with instant AI matching
- `/my-items` — User's reported listings & lifecycle management
- `/claims` — Ownership claims hub (submitted & received verification)
- `/notifications` — In-app notification center
- `/profile` — Student profile and privacy settings
