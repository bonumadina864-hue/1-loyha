# Pairly — Private 1-on-1 Messaging Application

> **Security & Privacy Model**: *Server-Encrypted with Audited Admin Recovery* (AES-256-GCM Envelope Encryption).

Pairly is a high-security, strictly 1-on-1 private messaging platform featuring biometric vault locking, tamper-evident audit logging, zero message previews in chat lists, and ticket-based chat restoration.

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
  - Biometric Lock Screen simulation (FaceID / Fingerprint / PIN fallback)
  - 1-on-1 chat conversation interface & live user switcher (Alice / Bob)
  - Admin Panel modal for audited restoration tickets & KPIs

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

Open your browser at `http://localhost:5173` to access the Pairly application.
Backend Swagger API documentation is available at `http://localhost:3000/api`.

---

## 🔒 Security & Admin Restoration Model
Pairly implements **Server-Encrypted Envelope Encryption with Audited Admin Recovery**:
- All messages are encrypted with unique Data Encryption Keys (DEKs).
- Administrators cannot browse plaintext messages freely.
- Chat restoration requires an approved, ticketed workflow recorded in an append-only audit trail.

---

## 🧪 Testing & Verification
```bash
cd backend
npm test
```
All cryptographic, Crockford encoding, and dev-login security boundary tests run with full Jest coverage.
