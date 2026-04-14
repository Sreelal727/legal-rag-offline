/**
 * Import legacy FoxPro DBF data from D:\anadhakrishnan\new into the legal-rag SQLite database.
 *
 * Imports:
 *  1. Banks/Clients  — EP/LATEST/BANK.DBF (309) + notice/CLIENT.DBF (127)
 *  2. Courts         — EP/LATEST/COURT.DBF (47)   [used only for name lookup]
 *  3. EP Cases       — EP/LATEST/EPD.DBF (1138)   → Case table (subType=EP)
 *  4. EP Respondents — EP/LATEST/RESP.DBF (56)    → OppositeParty
 *  5. Notice Cases   — notice/NOTICE.DBF (1281)   → Case table (stage=PRE_FILING)
 *  6. Notice Parties — notice/PARTY.DBF (5630)    → OppositeParty  (P=Borrower, S=Guarantor)
 *  7. Loans          — notice/LOAN.DBF (2229)      → stored in case description/notes
 *
 * Usage:
 *   node scripts/import-legacy-dbf.js [--dry-run]
 */

"use strict";
const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DB_PATH = path.join(__dirname, "../data/legal-rag.db");
const LEGACY_EP = "D:/anadhakrishnan/new/EP/LATEST";
const LEGACY_NOT = "D:/anadhakrishnan/new/notice";
const DRY_RUN = process.argv.includes("--dry-run");

// ─── DBF Reader ──────────────────────────────────────────────────────────────
function readDBF(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.length < 32) return [];
  const numRecords = buf.readUInt32LE(4);
  const headerSize = buf.readUInt16LE(8);
  const recordSize = buf.readUInt16LE(10);
  const fields = [];
  let offset = 32;
  while (offset + 32 <= headerSize - 1) {
    const name = buf.slice(offset, offset + 11).toString("ascii").replace(/\0/g, "").trim();
    if (!name) break;
    const type = String.fromCharCode(buf[offset + 11]);
    const length = buf[offset + 16];
    fields.push({ name, type, length });
    offset += 32;
  }
  const records = [];
  for (let r = 0; r < numRecords; r++) {
    const recStart = headerSize + r * recordSize;
    if (recStart + recordSize > buf.length) break;
    if (buf[recStart] === 0x2A) continue; // deleted record
    const rec = {};
    let fOffset = recStart + 1;
    for (const f of fields) {
      rec[f.name] = buf.slice(fOffset, fOffset + f.length).toString("ascii").trim().replace(/\0/g, "");
      fOffset += f.length;
    }
    records.push(rec);
  }
  return records;
}

function uuid() {
  return crypto.randomUUID();
}

function parseDate(s) {
  if (!s || s.length < 8) return null;
  const y = parseInt(s.slice(0, 4));
  const m = parseInt(s.slice(4, 6));
  const d = parseInt(s.slice(6, 8));
  if (!y || !m || !d) return null;
  try { return new Date(y, m - 1, d).toISOString(); } catch { return null; }
}

function clean(s) {
  return (s || "").replace(/[.,\s]+$/, "").trim();
}

function joinAddr(...parts) {
  return parts.filter(p => p && p.trim()).map(p => p.trim().replace(/,$/, "")).join(", ");
}

function parseFloat2(s) {
  const v = parseFloat((s || "").replace(/[^\d.]/g, ""));
  return isNaN(v) ? null : v;
}

// ─── Main ────────────────────────────────────────────────────────────────────
const db = new Database(DB_PATH);

// Get org and a system user
const org = db.prepare("SELECT id FROM Organization LIMIT 1").get();
if (!org) { console.error("No organization found"); process.exit(1); }
const orgId = org.id;

const sysUser = db.prepare("SELECT id FROM User WHERE organizationId = ? LIMIT 1").get(orgId);
if (!sysUser) { console.error("No user found"); process.exit(1); }
const userId = sysUser.id;

console.log(`Organization: ${orgId}`);
console.log(`System user:  ${userId}`);
console.log(`Dry run:      ${DRY_RUN}`);
console.log("─".repeat(60));

const stats = {
  banksInserted: 0, banksSkipped: 0,
  epCasesInserted: 0, epCasesSkipped: 0,
  epOpInserted: 0,
  notCasesInserted: 0, notCasesSkipped: 0,
  notOpInserted: 0,
};

// ─── 1. Import Banks / Clients ───────────────────────────────────────────────
console.log("\n[1/5] Importing banks and financial institutions...");

const epBanks   = readDBF(path.join(LEGACY_EP, "BANK.DBF"));
const notClients = readDBF(path.join(LEGACY_NOT, "CLIENT.DBF"));

// Build a combined list with deduplication by normalised name
const bankMap = new Map(); // normName → {name, address, code}

for (const b of epBanks) {
  const name = clean(b.B_NAME);
  if (!name) continue;
  const norm = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!bankMap.has(norm)) bankMap.set(norm, { name, address: clean(b.B_BRANCH), code: b.B_CODE });
}
for (const c of notClients) {
  const name = clean(c.NAME);
  if (!name) continue;
  const norm = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!bankMap.has(norm)) {
    const addr = joinAddr(c.C_ADDR1, c.C_ADDR2, c.C_ADDR3, c.C_ADDR4, c.C_ADDR5);
    bankMap.set(norm, { name, address: addr, code: c.CL_CODE });
  }
}

// Build code→clientId map for linking later
const bankCodeToClientId = new Map(); // B_CODE / CL_CODE → client DB id

const insertClient = db.prepare(`
  INSERT INTO Client (id, name, clientType, address, notes, isActive, organizationId, createdAt, updatedAt)
  VALUES (@id, @name, 'COMPANY', @address, @notes, 1, @orgId, datetime('now'), datetime('now'))
`);
const findClientByName = db.prepare(
  "SELECT id FROM Client WHERE organizationId = ? AND name = ? LIMIT 1"
);

// We need a code→norm map for later lookup
const codeToNorm = new Map();
for (const b of epBanks) {
  const norm = clean(b.B_NAME).toLowerCase().replace(/[^a-z0-9]/g, "");
  codeToNorm.set(b.B_CODE, norm);
}
for (const c of notClients) {
  const norm = clean(c.NAME).toLowerCase().replace(/[^a-z0-9]/g, "");
  codeToNorm.set(c.CL_CODE, norm);
}

const normToClientId = new Map();

if (!DRY_RUN) {
  db.transaction(() => {
    for (const [norm, bank] of bankMap) {
      const existing = findClientByName.get(orgId, bank.name);
      if (existing) {
        normToClientId.set(norm, existing.id);
        stats.banksSkipped++;
        continue;
      }
      const id = uuid();
      insertClient.run({ id, name: bank.name, address: bank.address || null, notes: `Legacy code: ${bank.code}`, orgId });
      normToClientId.set(norm, id);
      stats.banksInserted++;
    }
  })();
} else {
  for (const [norm, bank] of bankMap) {
    normToClientId.set(norm, "DRY-" + norm.slice(0, 8));
  }
  stats.banksInserted = bankMap.size;
}

// Build bankCode → clientId
for (const [code, norm] of codeToNorm) {
  const cid = normToClientId.get(norm);
  if (cid) bankCodeToClientId.set(code, cid);
}
console.log(`  Banks inserted: ${stats.banksInserted}, skipped (already exist): ${stats.banksSkipped}`);

// ─── 2. Build court code → name map ─────────────────────────────────────────
console.log("\n[2/5] Building court reference map...");
const courts = readDBF(path.join(LEGACY_EP, "COURT.DBF"));
const courtMap = new Map(); // C_CODE → full court name
for (const c of courts) {
  const name = [clean(c.C_NAME), clean(c.C_PLACE)].filter(Boolean).join(", ");
  courtMap.set(c.C_CODE, name);
}
console.log(`  ${courts.length} courts loaded`);

// ─── 3. Import EP Cases ──────────────────────────────────────────────────────
console.log("\n[3/5] Importing Execution Petition cases from EPD.DBF...");

const epd = readDBF(path.join(LEGACY_EP, "EPD.DBF"));
const resp = readDBF(path.join(LEGACY_EP, "RESP.DBF"));

// Group respondents by R_CODE (= M_CODE)
const respByCase = new Map();
for (const r of resp) {
  if (!respByCase.has(r.R_CODE)) respByCase.set(r.R_CODE, []);
  respByCase.get(r.R_CODE).push(r);
}

const insertCase = db.prepare(`
  INSERT INTO \`Case\` (id, caseNumber, title, description, caseType, caseSubType,
    courtName, status, stage, priority, suitValue, notes,
    organizationId, createdAt, updatedAt)
  VALUES (@id, @caseNumber, @title, @description, @caseType, @caseSubType,
    @courtName, @status, @stage, @priority, @suitValue, @notes,
    @orgId, datetime('now'), datetime('now'))
`);
const insertCaseClient = db.prepare(`
  INSERT OR IGNORE INTO CaseClient (id, caseId, clientId, role, createdAt)
  VALUES (@id, @caseId, @clientId, @role, datetime('now'))
`);
const insertOP = db.prepare(`
  INSERT INTO OppositeParty (id, caseId, name, fatherHusbandName, designation, address, partyType, notes, createdAt, updatedAt)
  VALUES (@id, @caseId, @name, @fatherHusbandName, @designation, @address, @partyType, @notes, datetime('now'), datetime('now'))
`);
const caseExists = db.prepare(
  "SELECT id FROM `Case` WHERE caseNumber = ? AND organizationId = ? LIMIT 1"
);

// EP cases — build map of caseNumber→id for later reference
const epCaseIdMap = new Map();

if (!DRY_RUN) {
  db.transaction(() => {
    for (const ep of epd) {
      if (!ep.M_CODE || !ep.OS_NO) continue;

      const caseNumber = ep.M_CODE.trim();
      if (caseExists.get(caseNumber, orgId)) {
        stats.epCasesSkipped++;
        continue;
      }

      const courtName = courtMap.get(ep.C_CODE) || ep.C_CODE || "";
      const bankClientId = bankCodeToClientId.get(ep.B_CODE);
      const decreeAmt = parseFloat2(ep.D_AMT);
      const totalAmt = parseFloat2(ep.H_TOT);
      const filingDate = parseDate(ep.D_DATE);
      const epNo = ep.EP_NO ? ep.EP_NO.trim() : "";

      const caseId = uuid();
      epCaseIdMap.set(caseNumber, caseId);

      insertCase.run({
        id: caseId,
        caseNumber,
        title: `E.P. in O.S. No. ${ep.OS_NO}`,
        description: [
          `Original Suit No: ${ep.OS_NO}`,
          epNo ? `EP No: ${epNo}` : "",
          decreeAmt ? `Decree Amount: Rs.${decreeAmt.toLocaleString("en-IN")}/-` : "",
          ep.D_DATE ? `Decree Date: ${ep.D_DATE.slice(6)}/${ep.D_DATE.slice(4,6)}/${ep.D_DATE.slice(0,4)}` : "",
          totalAmt ? `Total Dues (with interest): Rs.${totalAmt.toLocaleString("en-IN")}/-` : "",
          ep.D_COST ? `Decree Costs: Rs.${ep.D_COST}/-` : "",
        ].filter(Boolean).join("\n"),
        caseType: "CIVIL",
        caseSubType: "EP",
        courtName,
        status: "ACTIVE",
        stage: "EXECUTION",
        priority: "MEDIUM",
        suitValue: totalAmt || decreeAmt,
        notes: ep.B_MGR ? `Bank Manager: ${clean(ep.B_MGR)}, ${clean(ep.POST)}` : null,
        orgId,
      });

      // Link bank as PETITIONER (decree holder)
      if (bankClientId) {
        insertCaseClient.run({ id: uuid(), caseId, clientId: bankClientId, role: "PETITIONER" });
      }

      stats.epCasesInserted++;

      // Import respondents
      const respondents = respByCase.get(caseNumber) || [];
      for (const r of respondents) {
        if (!r.R_NAME) continue;
        const addr = joinAddr(r.R_ADD1, r.R_ADD2, r.R_ADD3, r.R_ADD4, r.R_ADD5);
        insertOP.run({
          id: uuid(),
          caseId,
          name: clean(r.R_NAME),
          fatherHusbandName: null,
          designation: null,
          address: addr || null,
          partyType: r.R_PRN === "Y" ? "DEFENDANT" : "RESPONDENT",
          notes: `Legacy respondent from RESP.DBF`,
        });
        stats.epOpInserted++;
      }
    }
  })();
} else {
  stats.epCasesInserted = epd.filter(ep => ep.M_CODE).length;
  stats.epOpInserted = resp.length;
}

console.log(`  EP cases inserted: ${stats.epCasesInserted}, skipped: ${stats.epCasesSkipped}`);
console.log(`  EP respondents inserted: ${stats.epOpInserted}`);

// ─── 4. Import Notice Cases ──────────────────────────────────────────────────
console.log("\n[4/5] Importing Notice cases from NOTICE.DBF...");

const notices = readDBF(path.join(LEGACY_NOT, "NOTICE.DBF"));
const parties = readDBF(path.join(LEGACY_NOT, "PARTY.DBF"));
const loans   = readDBF(path.join(LEGACY_NOT, "LOAN.DBF"));

// Group parties and loans by NOT_CODE
const partiesByNotice = new Map();
for (const p of parties) {
  if (!partiesByNotice.has(p.NOT_CODE)) partiesByNotice.set(p.NOT_CODE, []);
  partiesByNotice.get(p.NOT_CODE).push(p);
}
const loansByNotice = new Map();
for (const l of loans) {
  if (!loansByNotice.has(l.NOT_CODE)) loansByNotice.set(l.NOT_CODE, []);
  loansByNotice.get(l.NOT_CODE).push(l);
}

if (!DRY_RUN) {
  db.transaction(() => {
    for (const n of notices) {
      if (!n.NOT_CODE) continue;

      const caseNumber = `NOT-${n.NOT_CODE}`;
      if (caseExists.get(caseNumber, orgId)) {
        stats.notCasesSkipped++;
        continue;
      }

      const noticeParties = partiesByNotice.get(n.NOT_CODE) || [];
      const noticeLoans   = loansByNotice.get(n.NOT_CODE) || [];
      const principal = noticeParties.find(p => p.PSTATUS === "P");
      const bankClientId = bankCodeToClientId.get(n.CL_CODE);

      // Build title from principal borrower name
      const borrowerName = principal ? clean(principal.PNAME) : "Unknown Borrower";
      const totalOutstanding = noticeLoans.reduce((sum, l) => sum + (parseFloat2(l.OUTSTAND) || 0), 0);
      const filingDate = parseDate(n.DATE);

      // Build description from loans
      const loanDesc = noticeLoans.map((l, i) =>
        `Loan ${i+1}: ${l.LOAN_TYPE || ""} | A/c No: ${l.LOAN_ACNO || ""} | Amount: Rs.${l.LOAN_AMT || 0}/- | Outstanding: Rs.${l.OUTSTAND || 0}/- | Interest: ${l.INT_RATE || 0}%`
      ).join("\n");

      const caseId = uuid();

      insertCase.run({
        id: caseId,
        caseNumber,
        title: `Notice: ${borrowerName}`,
        description: [
          `Notice No: ${n.NOT_CODE}`,
          n.DATE ? `Notice Date: ${n.DATE.slice(6)}/${n.DATE.slice(4,6)}/${n.DATE.slice(0,4)}` : "",
          `Parties: ${noticeParties.length} (Borrower + ${noticeParties.filter(p => p.PSTATUS === "S").length} sureties)`,
          loanDesc,
          n.PAID_AMT ? `Amount Paid: Rs.${n.PAID_AMT}/-` : "",
          `Demand Period: ${n.PERIOD || 15} days`,
          n.ACTION ? `Action Proposed: ${n.ACTION}` : "",
        ].filter(Boolean).join("\n"),
        caseType: "CIVIL",
        caseSubType: "NOTICE",
        courtName: null,
        status: "ACTIVE",
        stage: "PRE_FILING",
        priority: "MEDIUM",
        suitValue: totalOutstanding || parseFloat2(n.PAID_AMT),
        notes: `Repayment mode: ${n.REPAY_MODE || "-"} | Security: ${n.SECURITY || "N"} | Revival: ${n.REVIV_STAT || "N"}`,
        orgId,
      });

      // Link bank as PETITIONER
      if (bankClientId) {
        insertCaseClient.run({ id: uuid(), caseId, clientId: bankClientId, role: "PETITIONER" });
      }

      stats.notCasesInserted++;

      // Import parties as OppositeParty
      for (const p of noticeParties) {
        if (!p.PNAME || p.PSTATUS === "D") continue; // skip deleted
        const addr = joinAddr(p.ADDR1, p.ADDR2, p.ADDR3, p.ADDR4, p.ADDR5);
        // Parse designation and father name from RNAME (e.g. "S/o.Ramakrishnan,")
        const rname = clean(p.RNAME || "");
        let designation = null;
        let fatherName = null;
        const desigMatch = rname.match(/^([SDW]\/o\.?)\s*(.+)/i);
        if (desigMatch) {
          designation = desigMatch[1].replace(".", "/o");
          fatherName = clean(desigMatch[2]);
        }
        const partyType = p.PSTATUS === "S" ? "RESPONDENT" : "DEFENDANT";
        insertOP.run({
          id: uuid(),
          caseId,
          name: clean(p.PNAME),
          fatherHusbandName: fatherName || null,
          designation: designation || null,
          address: addr || null,
          partyType,
          notes: p.PSTATUS === "S" ? "Surety/Guarantor" : "Principal Borrower",
        });
        stats.notOpInserted++;
      }
    }
  })();
} else {
  stats.notCasesInserted = notices.filter(n => n.NOT_CODE).length;
  stats.notOpInserted = parties.filter(p => p.PSTATUS !== "D").length;
}

console.log(`  Notice cases inserted: ${stats.notCasesInserted}, skipped: ${stats.notCasesSkipped}`);
console.log(`  Notice parties (OppositeParty) inserted: ${stats.notOpInserted}`);

// ─── 5. Audit log ────────────────────────────────────────────────────────────
if (!DRY_RUN) {
  db.prepare(`
    INSERT INTO AuditLog (id, userId, action, entity, entityId, details, organizationId, createdAt)
    VALUES (?, ?, 'IMPORT', 'LegacyDBF', 'batch', ?, ?, datetime('now'))
  `).run(
    uuid(), userId,
    JSON.stringify({ source: "D:\\anadhakrishnan\\new", stats }),
    orgId
  );
}

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log("\n" + "═".repeat(60));
console.log("IMPORT COMPLETE" + (DRY_RUN ? " (DRY RUN — no changes saved)" : ""));
console.log("═".repeat(60));
console.log(`  Banks / Clients inserted : ${stats.banksInserted}`);
console.log(`  Banks already existed    : ${stats.banksSkipped}`);
console.log(`  EP Cases inserted        : ${stats.epCasesInserted}`);
console.log(`  EP Cases skipped         : ${stats.epCasesSkipped}`);
console.log(`  EP Respondents inserted  : ${stats.epOpInserted}`);
console.log(`  Notice Cases inserted    : ${stats.notCasesInserted}`);
console.log(`  Notice Cases skipped     : ${stats.notCasesSkipped}`);
console.log(`  Notice Parties inserted  : ${stats.notOpInserted}`);
const total = stats.epCasesInserted + stats.notCasesInserted;
console.log(`  ─────────────────────────`);
console.log(`  TOTAL NEW CASES          : ${total}`);
console.log(`  TOTAL NEW PARTIES        : ${stats.epOpInserted + stats.notOpInserted}`);
