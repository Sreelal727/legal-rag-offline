# Banking Matter Pipeline — Implementation Plan

> **Branch:** `feat/banking-matter-pipeline`
> **Revert:** If unsatisfactory, `git checkout main` discards all changes.
> **Created:** 2026-04-16

---

## Overview

A stage-by-stage pipeline for banking recovery matters. Covers the full lifecycle:
Bank sends documents → Notice → Plaint (OS or CS) → Annexures → Proof Affidavit → Decree → EP.

Every generated document goes through: **Generated (draft) → Under Review → Approved**.
Nothing advances to the next stage unless the advocate explicitly approves.

---

## Key Design Decisions

| Decision | Answer |
|---|---|
| OS vs CS choice | Advocate chooses via dropdown. System shows a helper hint ("Suit value > ₹10L — consider CS") but never auto-decides. |
| Vakalatnama court variant | Always show a dropdown (Munsiff / Sub-Court / District Court / Commercial Court). |
| Mediation Application (CS) | Generated BEFORE the plaint. Stage order for CS: Documents → Notice → Mediation Application → Plaint → Filing Bundle. |
| Multiple EPs per case | Yes. Each EP has its own type (Arrest / A&S / Sale / Transfer / Delivery). Multiple EPs can exist against the same OS decree. |
| Revert strategy | Entire pipeline is on branch `feat/banking-matter-pipeline`. If unsatisfied: `git checkout main` to revert everything. |

---

## Phase 0 — Foundation (Templates + Schema)

**Goal:** Write all 15 legal document templates from actual formats in `D:\anadhakrishnan`, and create the database models.

### A. Templates to create (from legacy files)

| # | Template | Source in D:\anadhakrishnan | Format |
|---|---|---|---|
| 1 | Bank Demand Notice | `Documents/Notice 6.4.23/` | Advocate letterhead — demand for repayment |
| 2 | Banking OS Plaint | `Documents/PLAINTS 28.5.2024/` | Order VII Rule 1 CPC, 12-paragraph banking format |
| 3 | Banking CS Plaint | `Documents/PLAINTS 28.5.2024/2023/` | Commercial Court format + Sec 12A compliance |
| 4 | Fact Affidavit (Banking) | `Documents/COURT 28.5.2024/AFFI/` | Para-wise verification of plaint |
| 5 | Verification Affidavit (OS) | `Documents/COURT 28.5.2024/AFFI/` | Sworn verification — OS only |
| 6 | Statement of Truth (CS) | Commercial Courts Act format | Replaces Verification Affidavit in CS |
| 7 | Mediation Application (CS) | `Documents/COURT 28.5.2024/Com courts -MEDIATION/` | Form-1, Commercial Courts Act 2015 |
| 8 | Vakalatnama (generic) | `Documents/VAK 6.4.23/` | Form 12 Rule 27, court dropdown variant |
| 9 | Batta Memo | EP/notice process context | Process fee memo for service |
| 10 | Summons | `Documents/COURT 28.5.2024/sUMMONS/` | CPC standard |
| 11 | Proof Affidavit | `Documents/COURT 28.5.2024/AFFI/` | Evidence affidavit at trial |
| 12 | EP — Arrest | `EP/arrest-*.doc` | Order 21 Rule 38 CPC |
| 13 | EP — Attachment & Sale | `EP/A&S-*.doc` | Order 21 Rules 54, 66 CPC |
| 14 | EP — Sale | `EP/sale-*.doc` | Sale of attached property |
| 15 | EP — Transfer | `EP/transfer-*.doc` | Section 39 CPC |
| 16 | EP Affidavit | `My Documents/AFFI/` | Branch Manager's supporting affidavit |

### B. Schema changes

New models:
- **`BankingMatter`** — tracks a matter's pipeline stage, linked to Case
  - Fields: id, caseId, bankClientId, suitType (OS/CS), currentStage, status, extractedData (JSON), notes
- **`MatterDocument`** — each generated document in the pipeline
  - Fields: id, matterId, documentType, title, content, status (GENERATED/UNDER_REVIEW/APPROVED), templateId, sortOrder, approvedAt, approvedBy
- **`ExecutionPetition`** — EP details linked to a case (supports multiple per case)
  - Fields: id, caseId, epNumber, epType (ARREST/ATTACHMENT_SALE/SALE/TRANSFER/DELIVERY), decreeDate, decretalAmount, postDecreeInterestRate, decreeContent (uploaded decree text), status

### C. Deliverables
- [ ] `src/lib/banking-templates.ts` — all 16 templates
- [ ] `prisma/schema.prisma` — 3 new models
- [ ] `prisma db push` applied
- [ ] Git commit + push

---

## Phase 1 — Document Upload & Extraction

**Goal:** Upload multiple bank documents at once, AI extracts a consolidated data card.

### Flow
1. Advocate opens Banking Matter page → clicks "New Matter"
2. Uploads multiple files (loan agreement, sanction letter, ledger, mortgage deed, guarantee deed, etc.)
3. AI reads ALL documents and extracts a consolidated data card:
   - Bank: name, branch, address, authorized officer
   - Borrower(s): name, S/o, age, address, Aadhaar, phone, account number
   - Guarantor(s): same fields
   - Loan: type, amount, sanction date, disbursement date, interest rate, penal rate, rest period
   - Outstanding: last payment date, amount due
   - Demand notice date (if bank already sent one)
   - Security/mortgage description
4. Advocate sees extracted data → reviews/corrects → clicks "Save & Proceed"
5. Case is created (or linked to existing case), all parties linked

### Deliverables
- [ ] `src/app/(app)/banking-matter/page.tsx` — main pipeline page
- [ ] `src/app/api/banking-matter/route.ts` — CRUD
- [ ] `src/app/api/banking-matter/extract/route.ts` — multi-doc AI extraction
- [ ] Sidebar entry
- [ ] Git commit + push

---

## Phase 2 — Demand Notice Generation

**Goal:** Auto-generate a demand notice from extracted data.

### Flow
1. After data extraction is approved, Stage 2 unlocks
2. Advocate clicks "Generate Demand Notice"
3. System fills the Bank Demand Notice template from the data card
4. Advocate reviews → edits inline → clicks "Approve"
5. Notice date is recorded (feeds into Plaint Para 8 and limitation tracking)

### Deliverables
- [ ] `src/app/api/banking-matter/[id]/generate/route.ts` — document generation endpoint
- [ ] Generation logic in pipeline UI
- [ ] Git commit + push

---

## Phase 3 — Plaint Generation (OS / CS)

**Goal:** Generate a full banking plaint with OS/CS choice.

### Flow
1. After Notice is approved, Stage 3 unlocks
2. **For CS only:** Mediation Application is generated FIRST (Form-1, mandatory Sec 12A)
   - Advocate reviews + approves mediation application
   - Then plaint generation unlocks
3. Advocate chooses: **OS** or **CS** (dropdown, with hint)
4. System fills the correct template:
   - Para 1: Plaintiff bank details
   - Para 2: Loan sanction
   - Para 3: Disbursement + account number
   - Para 4: Security / mortgage / guarantee
   - Para 5: Repayment terms
   - Para 6: Default
   - Para 7: Outstanding = Statement of Accounts total (auto-pulled)
   - Para 8: Demand notice date + service details
   - Para 9: Cause of action
   - Para 10: Valuation + court fee
   - Para 11: Jurisdiction
   - Para 12: Limitation (revival date from RevivalLetter table)
   - Prayer: Recovery amount + interest + costs
5. Advocate fills any gap fields → reviews → approves

### Deliverables
- [ ] Mediation Application generation (CS path)
- [ ] OS Plaint generation
- [ ] CS Plaint generation
- [ ] Statement of Accounts linkage (latest SOA total → Para 7)
- [ ] Revival Letter linkage (latest revival date → Para 12)
- [ ] Git commit + push

---

## Phase 4 — Annexure Generation (On-Demand Filing Bundle)

**Goal:** Generate the filing bundle — only what the advocate asks for.

### Flow
1. After Plaint is approved, Stage 4 unlocks
2. System shows a checklist based on OS or CS:

   **OS Filing Bundle:**
   - [ ] Fact Affidavit
   - [ ] Verification Affidavit
   - [ ] Vakalatnama (court dropdown: Munsiff / Sub-Court / District Court)
   - [ ] Batta Memo
   - [ ] Summons

   **CS Filing Bundle (additional):**
   - [ ] Statement of Truth (replaces Verification Affidavit)
   - [ ] Mediation Application (if not already generated in Stage 3)

3. Advocate ticks which documents to generate → clicks "Generate Selected"
4. Each document generated separately → shown for individual review
5. Advocate approves each one individually
6. All approved documents shown as the complete filing bundle
7. Print all → take to court

### Deliverables
- [ ] Batch generation endpoint
- [ ] Individual document approval flow
- [ ] Filing bundle view
- [ ] Git commit + push

---

## Phase 5 — Proof Affidavit (Trial Stage)

**Goal:** Generate proof affidavit when the case reaches trial.

### Flow
1. Unlocks only when case stage = TRIAL (or manually triggered)
2. Advocate clicks "Generate Proof Affidavit"
3. System pre-fills from case data + updated party details
4. Advocate adds evidence-specific facts manually
5. Reviews → approves
6. Linked to case at trial stage

### Deliverables
- [ ] Proof Affidavit generation
- [ ] Trial stage trigger
- [ ] Git commit + push

---

## Phase 6 — Decree → Execution Petition

**Goal:** Upload decree, extract details, generate the correct EP type.

### Flow
1. After judgment, advocate uploads the decree document
2. AI reads the decree and extracts:
   - Decree date
   - Decree holder (bank)
   - Judgment debtor(s)
   - Decretal amount (principal + interest as awarded)
   - Post-decree interest rate (if awarded)
   - Costs awarded
   - Appeal status
3. Advocate reviews extracted decree details → confirms
4. Chooses EP type (dropdown):
   - **Arrest** — Order 21 Rule 38 (personal liability)
   - **Attachment & Sale** — Order 21 Rules 54, 66 (immovable property)
   - **Sale** — sale of already-attached property
   - **Transfer** — Section 39 CPC (move to another court)
   - **Delivery** — delivery of specific property
5. System generates EP + EP Affidavit (Branch Manager's supporting affidavit)
6. Advocate reviews → approves → prints filing bundle
7. **Multiple EPs:** Advocate can generate additional EPs against the same decree (e.g., first Attachment, later Arrest)

### Deliverables
- [ ] Decree upload + AI extraction
- [ ] EP generation (5 types)
- [ ] EP Affidavit generation
- [ ] Multiple EP support per case
- [ ] Git commit + push

---

## UI Design — The Matter Pipeline Page

```
┌─────────────────────────────────────────────────────────────┐
│  Banking Matter: SIB Kottayi vs. Rajan K.                  │
│  Type: OS  |  Court: Munsiff of Palakkad  |  Status: ACTIVE│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Stage 1: Documents           ✅ Complete                   │
│           5 uploaded, data extracted & approved              │
│                                                             │
│  Stage 2: Demand Notice       ✅ Approved (12 Apr 2026)     │
│                                                             │
│  Stage 3: Plaint (OS)         ✅ Approved (15 Apr 2026)     │
│                                                             │
│  Stage 4: Filing Bundle                                     │
│           ✅ Fact Affidavit    (Approved)                    │
│           ✅ Verification Aff  (Approved)                   │
│           ⏳ Vakalatnama       (Under Review)               │
│           ⬜ Batta Memo        (Not generated)              │
│           ⬜ Summons           (Not generated)              │
│                                                             │
│  Stage 5: Proof Affidavit     🔒 Locked (unlocks at TRIAL) │
│                                                             │
│  Stage 6: Execution Petition  🔒 Locked (needs decree)     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Technical Notes

- All work is on branch `feat/banking-matter-pipeline`
- To revert everything: `git checkout main`
- Each phase is committed + pushed separately
- Existing Case Filing page is NOT modified — still works for non-banking drafts
- The pipeline reuses existing infrastructure: Document upload, AI extraction, Statement of Accounts, Revival Letters, Limitation Tracker
