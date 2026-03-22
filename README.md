# Legal RAG - Practice Management System

AI-powered legal practice management system built for Indian law firms. Manage cases, clients, documents, billing, court diary, and draft legal notices with AI assistance.

## Features

- **Case Management** — Track cases, hearings, court dates, and assignments
- **Client Management** — Individual and company clients with GST/Aadhar support
- **AI Chat** — Draft legal notices, petitions, and get legal research assistance
- **Document Management** — Upload, extract, and search legal documents (PDF, DOCX, DOC)
- **Format Library** — Store and reuse legal document templates with AI-powered format matching
- **Court Diary** — Daily cause list and hearing tracker
- **Billing & Invoicing** — Time entries, invoices with GST support
- **Limitation Tracker** — Deadline management for statute of limitations
- **Notices** — Draft, review, and approve legal notices with templates
- **Audit Log** — Complete activity trail for compliance
- **Role-based Access** — Admin, Senior Advocate, Junior Advocate, Clerk, Intern

## Quick Start

### Prerequisites

- **Node.js** 18+ ([download](https://nodejs.org))
- **Turso account** (free) — [turso.tech](https://turso.tech)
- **HuggingFace API key** (free) — [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)

### 1. Clone and install

```bash
git clone https://github.com/Sreelal727/legal-rag.git
cd legal-rag
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in your values:

| Variable | Required | Description |
|----------|----------|-------------|
| `TURSO_DATABASE_URL` | Yes | Your Turso database URL |
| `TURSO_AUTH_TOKEN` | Yes | Your Turso auth token |
| `NEXTAUTH_SECRET` | Yes | Random secret (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Yes | Your app URL (e.g. `http://localhost:3000`) |
| `LLM_API_KEY` | Yes | HuggingFace or OpenAI-compatible API key |
| `LLM_BASE_URL` | Yes | LLM endpoint URL |
| `LLM_MODEL` | Yes | Model name |
| `INDIAN_KANOON_TOKEN` | No | For case law search ([indiankanoon.org](https://api.indiankanoon.org)) |
| `CHROMA_PATH` | No | ChromaDB path for RAG vector search |

### 3. Set up database and seed data

```bash
npm run setup
```

This runs `prisma generate` + `prisma db push` + seeds the database with:
- Admin account and demo users
- Notice templates (Section 80 CPC, Cheque Bounce, Eviction, etc.)
- Sample clients and cases

### 4. Start the server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Default login

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@legalrag.com | admin123 |
| Senior Advocate | senior@legalrag.com | senior123 |
| Junior Advocate | junior@legalrag.com | junior123 |
| Clerk | clerk@legalrag.com | clerk123 |
| Intern | intern@legalrag.com | intern123 |

> Change these passwords after first login in a production environment.

## Setting up Turso Database

1. Install the Turso CLI:
   ```bash
   curl -sSfL https://get.tur.so/install.sh | bash
   ```

2. Sign up and create a database:
   ```bash
   turso auth signup
   turso db create legal-rag
   ```

3. Get your credentials:
   ```bash
   turso db show legal-rag --url     # → TURSO_DATABASE_URL
   turso db tokens create legal-rag   # → TURSO_AUTH_TOKEN
   ```

## Optional: ChromaDB for RAG

ChromaDB enables semantic search on uploaded documents and format library templates. The app works without it — RAG features are simply disabled.

To enable:
1. Install ChromaDB: `pip install chromadb`
2. Start the server: `chroma run --path ./chroma-data`
3. Set `CHROMA_PATH=./chroma-data` in `.env.local`

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Database**: Turso (LibSQL) via Prisma ORM
- **Auth**: NextAuth.js (Credentials provider, JWT)
- **AI**: OpenAI-compatible API (HuggingFace, Groq, etc.)
- **UI**: Tailwind CSS, shadcn/ui
- **Vector Search**: ChromaDB (optional)

## Deployment

### Vercel (recommended)

1. Push to GitHub
2. Import in [Vercel](https://vercel.com)
3. Add all environment variables from `.env.example`
4. Deploy

### Self-hosted

```bash
npm run build
npm start
```

## License

Private — All rights reserved.
