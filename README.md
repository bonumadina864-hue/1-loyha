# TMTg — Ultra-Private 1-on-1 Messaging Application

> **Security & Privacy Model**: *Server-Encrypted with Audited Admin Recovery* (AES-256-GCM Envelope Encryption).

TMTg is a high-security, strictly 1-on-1 private messaging platform featuring biometric Face ID vault locking, anti-peeping intruder detection with automatic chat purging, tamper-evident audit logging, zero message previews in chat lists, and ticket-based chat restoration (90-day retention).

---

## 🏗️ Architecture & Tech Stack

- **Backend**:
  - Node.js + NestJS (Strict TypeScript)
  - PostgreSQL (via TypeORM with automatic in-memory fallback)
  - Redis (caching, rate-limiting, and token blacklisting)
  - Socket.io (real-time encrypted messaging)
  - Argon2id password hashing & Crockford Base32 10-char public IDs
  - AES-256-GCM envelope encryption for message vaults

- **Frontend**:
  - React 18 + Vite + TypeScript
  - Tailwind CSS with custom **Calm Security** design system
  - Lucide Icons
  - Biometric Face ID Lock Screen with real-time face matching & anti-peeping radar
  - Strictly 1-on-1 chat conversation interface & live user switcher (Alice / Bob)
  - Admin Panel modal for audited restoration tickets & KPIs (Master Login: `TMTg`, Password: `16.03.29.04.10.09`)
  - 3-language switch (Uzbek, Russian, English)

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm

### 1. Installation
Install dependencies in both backend and frontend:

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Environment Configuration
Copy `.env.example` in `backend/` to `.env`:

```bash
cd backend
cp .env.example .env
```

### 3. Running Locally

**Start Backend (Port 3000):**
```bash
cd backend
npm run dev
```

**Start Frontend (Port 5173):**
```bash
cd frontend
npm run dev
```

Open your browser at `http://localhost:5173` to access the TMTg application.
Backend Swagger API documentation is available at `http://localhost:3000/api`.

---

## 🔒 Security & Admin Restoration Model
TMTg implements **Server-Encrypted Envelope Encryption with Audited Admin Recovery**:
- All messages are encrypted with unique Data Encryption Keys (DEKs).
- Administrators cannot browse plaintext messages freely.
- Chat restoration requires an approved, ticketed workflow recorded in an append-only audit trail (90-day retention).

---

## 🧪 Testing & Verification
```bash
cd backend
npm test
```
All cryptographic, Crockford encoding, and dev-login security boundary tests run with full Jest coverage.
