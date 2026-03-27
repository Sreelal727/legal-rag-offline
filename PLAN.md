# Legal Document Automation System - Implementation Plan

**Client Requirements Document:** Computer 26.3.2026.doc
**Project:** legal-rag-offline (Next.js + SQLite + Ollama)

---

## Phase 1 - Foundation (COMPLETED - 2026-03-27)

### Client Details Entry
- Enhanced Client model with: father/husband name, designation (S/o, D/o, W/o, R/o), occupation, DOB, age, alternate phone, city/district/state/pincode, company name, CIN number
- Smart scan (OCR) for ID proof and handwritten notes (already existed)
- Comprehensive client entry form with sectioned layout
- Editable client detail page with inline editing

### Case Model Enhancement
- Added `caseSubType` for Indian case types: PLAINT, RCP, GOP, SOP, SARFAESI, NI_ACT_138, CAVEAT, EP, APPEAL, REVISION, WRIT
- Added `stage` tracking: PRE_FILING, FILED, NOTICE, WRITTEN_STATEMENT, TRIAL, ARGUMENTS, JUDGMENT, EXECUTION
- Added `suitValue` and `courtFee` fields

### Opposite Party Management
- New OppositeParty model with full address details (for notice/batta/cover card generation)
- Opposite party advocate details
- Add/delete UI on case detail page
- Full CRUD API

---

## Phase 2 - Notice Module Enhancement

### Notice Output with Receipt/Acknowledgment
- Enhanced notice generation with recipient address management
- Optional receipt/acknowledgment card upload popup after sending
- AD card generation with recipient address
- Cover/envelope address printing

### Reply Upload
- Optional reply document upload linked to notice
- Track reply received date and content

### Batta/Notice Printouts
- Print notices to all or selected persons (opposite parties)
- Batch print with address labels
- Track delivery status per recipient

---

## Phase 3 - Case Filing & Document Templates

### Case Types with Fixed Format Templates
- **Plaint** - Civil suit plaint with court-specific formatting
- **RCP** (Rent Control Petition)
- **GOP** (Guardian & Wards Petition)
- **SOP** (Succession/Probate)
- **SARFAESI** - Bank recovery proceedings
- **138 NI Act Complaint** - Cheque bounce complaint
- **Caveat** - Caveat petition

### Affidavits
- Proof Affidavit
- Fact Affidavit
- Statement of Truth
- Verification Affidavit

### Document Upload & Output
- Upload case documents
- Output plaint/petition in fixed court formats
- Option to correct/edit before final output

---

## Phase 4 - Interlocutory Applications & Petitions

All petitions and affidavits with printout and option to correct:

1. Emergent numbering
2. Advance application
3. Injunction application
4. Attachment application
5. Commission application
6. Set aside Commission Report
7. Remit Commission Report
8. Implead
9. Amend
10. Set aside abatement
11. Condone delay
12. Raise attachment
13. Vacate injunction
14. Substitute service
15. Receive Written Statement / Counter Statement / Counter Claim
16. Strike off defence
17. Extension of time to pay Court Fee
18. Amend decree/Judgment
19. Pass final decree
20. Dispense with notice
21. Record full satisfaction
22. Compromise
23. Break open lock
24. Police protection
25. Delivery application
26. FD Return
27. Record of Majority
28. Adjournment
29. Remove from list
30. Call for documents (2 types)
31. Cheque application

---

## Phase 5 - Execution & Decree

### Decree/Judgment Management
- Upload decree/judgment documents
- Parse and extract key information

### Execution Petition (EP)
- EP type selection
- Generate EP in court format

### EP Sub-types
- Batta
- Notice
- Arrest
- Attachment
- Sale

---

## Phase 6 - Billing & Extras

### Advocate Fee
- Fee tracking per case/client
- Fee agreement management

### Bills
- Invoice generation (partially exists)
- Court fee tracking
- All forms in Civil Procedure Code
- Civil Rules of Practice forms

### Bank Opinion
- Upload bank documents
- Generate opinion in fixed format
- Option to correct before output

### Court Fee / CPC Forms
- Upload and manage all statutory forms
- Auto-fill where possible

---

## Phase 7 - AI Defence Drafting (Antropic)

### Defence Module
- AI-powered defence/counter statement drafting using Ollama
- Analyze plaint/complaint to suggest defence points
- Generate Written Statement / Counter Statement
- Legal research integration via RAG

---

## Technical Architecture

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router) |
| UI Components | shadcn/ui + Tailwind CSS 4 |
| Database | SQLite via Prisma ORM |
| AI/LLM | Ollama (local, offline) |
| Embeddings | Xenova/all-MiniLM-L6-v2 (offline) |
| Vector Store | ChromaDB |
| OCR | Tesseract.js |
| Document Gen | docx / jspdf / mammoth |
| Auth | NextAuth.js with role-based access |

## Key Design Principles
- **Fully offline** - No internet required for core functionality
- **Fixed court formats** - All outputs match Indian court requirements
- **Multi-tenancy** - Organization-based data isolation
- **Role-based access** - Junior/Senior Advocate, Admin, Clerk, Intern
- **Audit trail** - All actions logged
