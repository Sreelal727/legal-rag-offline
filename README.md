# Legal RAG - Practice Management System

AI-powered legal practice management system built for Indian law firms. Manage cases, clients, documents, billing, court diary, and draft legal notices with AI assistance.

## Features

- **Case Management** — Track cases, hearings, court dates, and assignments
- **Client Management** — Individual and company clients with GST/Aadhar support
- **AI Chat** — Draft legal notices, petitions, and get legal research assistance
- **AI Defence Drafting** — Generate structured written statements and defence documents
- **Document Management** — Upload, extract, and search legal documents (PDF, DOCX, DOC)
- **Template System** — Org-scoped case and notice templates with `{{variable}}` placeholders
- **Format Library** — Store and reuse legal document templates with AI-powered format matching
- **Court Diary** — Daily cause list and hearing tracker
- **Billing & Invoicing** — Time entries, invoices with GST support
- **Limitation Tracker** — Deadline management for statute of limitations
- **Notices** — Draft, review, and approve legal notices with templates
- **Execution Petitions** — EP filing, affidavits, and attachment workflows
- **Audit Log** — Complete activity trail for compliance
- **Multi-tenant** — Isolated organizations with role-based access (ADMIN, SENIOR_ADVOCATE, JUNIOR_ADVOCATE, CLERK, INTERN)

## Quick Start

### Prerequisites

- **Node.js** 18+ ([download](https://nodejs.org))
- **Ollama** (for local AI) — [ollama.com](https://ollama.com)

### 1. Clone and install

```bash
git clone https://github.com/Sreelal727/legal-rag-offline.git
cd legal-rag-offline
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_PATH` | Yes | SQLite database path (e.g. `./data/legal-rag.db`) |
| `DATABASE_URL` | Yes | Prisma URL (e.g. `file:./data/legal-rag.db`) |
| `NEXTAUTH_SECRET` | Yes | Random secret (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Yes | Your app URL (e.g. `http://localhost:3000`) |
| `LLM_API_KEY` | Yes | `ollama` for local, or OpenRouter/HuggingFace key |
| `LLM_BASE_URL` | Yes | `http://localhost:11434/v1` for Ollama |
| `LLM_MODEL` | Yes | Model name (e.g. `qwen3:8b`) |
| `SEED_PASSWORD` | No | Password for seeded admin user (default: `changeme123`) |
| `ADMIN_EMAIL` | No | Admin email (default: `admin@legalrag.com`) |
| `ORG_NAME` | No | Organization name for initial setup |

### 3. Set up database

```bash
npm run setup
```

This creates the database schema, an admin account, and generic notice templates.

### 4. Start the server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with the admin credentials configured in step 2.

> **Important:** Change the default password immediately after first login.

## Client Onboarding

To onboard a new law firm:

```bash
# Generic setup (interactive)
npx tsx scripts/setup-org.ts \
  --name "Firm Name" \
  --slug "firm-slug" \
  --email "admin@firm.com" \
  --password "securepassword" \
  --address "Firm Address"

# Or use the onboarding API (requires admin auth)
POST /api/admin/onboard
```

### Migrating from legacy systems

If the client has an MS Access database (AdvosCD.mdb or similar):

```bash
# First run the org setup script, then:
npx tsx scripts/migrate-access-db.ts \
  --mdb "/path/to/AdvosCD.mdb" \
  --org-slug "firm-slug"
```

This migrates clients, cases, execution petitions, court diary, and party relationships.

## Architecture

- **Framework**: Next.js 16 (App Router)
- **Database**: SQLite (local) via Prisma ORM + better-sqlite3
- **Auth**: NextAuth.js (Credentials provider, JWT, bcrypt)
- **AI**: Ollama (local) or OpenRouter/HuggingFace (cloud)
- **UI**: Tailwind CSS, shadcn/ui
- **Multi-tenant**: Organization-scoped data with `organizationId` on all models
- **Vector Search**: ChromaDB (optional, for RAG document search)

## Deployment

### Local (recommended for law firms)

```bash
npm run build
npm start
```

### Cloud (optional)

Supports Turso (cloud SQLite) migration via `prisma/migrate-turso.ts`.

## License

Private — All rights reserved.
