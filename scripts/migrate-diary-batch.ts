/**
 * Batch Diary Migration — Fast version using raw SQLite
 *
 * Migrates TRANSACTION table (46K+ rows) from Access DB to DiaryEntry
 * using batched raw SQL inserts for speed.
 *
 * Run AFTER migrate-access-db.ts (which handles clients and cases).
 *
 * Usage:
 *   npx tsx scripts/migrate-diary-batch.ts --mdb "D:/anadhakrishnan/AdvosCDAK/AdvosCD.mdb" --org-slug "gouriankar-associates"
 */

import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import MDBReader from "mdb-reader";
import fs from "fs";
import Database from "better-sqlite3";
import { randomUUID } from "crypto";

function parseArgs() {
  const args = process.argv.slice(2);
  const config: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--mdb" && args[i + 1]) config.mdb = args[++i];
    else if (args[i] === "--org-slug" && args[i + 1]) config.orgSlug = args[++i];
  }
  if (!config.mdb || !config.orgSlug) {
    console.error("Usage: npx tsx scripts/migrate-diary-batch.ts --mdb <path> --org-slug <slug>");
    process.exit(1);
  }
  return config;
}

function safeDate(val: any): string | null {
  if (!val) return null;
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return null;
    if (d.getFullYear() < 1900 || d.getFullYear() > 2100) return null;
    return d.toISOString();
  } catch {
    return null;
  }
}

function safeString(val: any, maxLen = 5000): string {
  if (val === null || val === undefined) return "";
  return String(val).trim().substring(0, maxLen);
}

async function main() {
  const config = parseArgs();

  console.log("=== Batch Diary Migration ===\n");

  // Read Access DB
  console.log("Reading Access DB...");
  const buf = fs.readFileSync(config.mdb);
  const reader = new MDBReader(buf);

  // Build lookup maps
  const postingMap = new Map<string, string>();
  try {
    reader.getTable("POSTING").getData().forEach((r: any) => {
      postingMap.set(r.POID, r.NAME || "");
    });
  } catch { /* ok */ }

  // Open SQLite directly
  const dbPath = process.env.DATABASE_PATH || "./data/legal-rag.db";
  const db = new Database(dbPath);

  // Get org ID
  const org = db.prepare("SELECT id FROM Organization WHERE slug = ?").get(config.orgSlug) as any;
  if (!org) {
    console.error(`Organization "${config.orgSlug}" not found`);
    process.exit(1);
  }
  console.log(`Organization: ${org.id}`);

  // Build case ID map (caseNumber → id)
  const caseRows = db.prepare("SELECT id, caseNumber FROM [Case] WHERE organizationId = ?").all(org.id) as any[];
  const caseNumberToId = new Map<string, string>();
  for (const row of caseRows) {
    caseNumberToId.set(row.caseNumber, row.id);
  }
  console.log(`Cases in DB: ${caseNumberToId.size}`);

  // We need to map Access CAID → maincode → our caseNumber
  // Build CAID→maincode map from Access
  const accessCases = reader.getTable("CASE").getData();
  const caidToMaincode = new Map<string, string>();
  for (const row of accessCases) {
    caidToMaincode.set(safeString(row.caid), safeString(row.maincode));
  }

  // Also map EPCODE → EP caseNumber
  const accessEPs = reader.getTable("EPTABLE").getData();
  const epcodeToMaincode = new Map<string, string>();
  for (const row of accessEPs) {
    const epno = safeString(row.EPNO);
    if (epno) {
      epcodeToMaincode.set(safeString(row.EPCODE), `E.P.No.${epno}`);
    }
  }

  // Now CAID → our case UUID
  const caidToCaseId = new Map<string, string>();
  for (const [caid, maincode] of caidToMaincode) {
    const caseId = caseNumberToId.get(maincode);
    if (caseId) caidToCaseId.set(caid, caseId);
  }
  for (const [epcode, maincode] of epcodeToMaincode) {
    const caseId = caseNumberToId.get(maincode);
    if (caseId) caidToCaseId.set(epcode, caseId);
  }

  // Check existing diary entries
  const existingCount = (db.prepare("SELECT COUNT(*) as c FROM DiaryEntry WHERE organizationId = ?").get(org.id) as any).c;
  console.log(`Existing diary entries: ${existingCount}`);

  if (existingCount > 1000) {
    console.log("Diary entries already migrated. Skipping.");
    db.close();
    return;
  }

  // Read transactions
  const transactions = reader.getTable("TRANSACTION").getData();
  console.log(`Transactions to migrate: ${transactions.length}\n`);

  // Prepare batch insert
  const insertStmt = db.prepare(`
    INSERT INTO DiaryEntry (id, organizationId, caseId, date, courtName, caseNumber, description, stage, nextDate, notes, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date().toISOString();
  let created = 0;
  let skipped = 0;

  // Use transaction for bulk insert (much faster)
  const batchInsert = db.transaction((rows: any[]) => {
    for (const row of rows) {
      try {
        insertStmt.run(
          row.id, row.organizationId, row.caseId, row.date,
          row.courtName, row.caseNumber, row.description, row.stage,
          row.nextDate, row.notes, row.createdAt, row.updatedAt
        );
        created++;
      } catch {
        skipped++;
      }
    }
  });

  // Process in batches of 1000
  const BATCH_SIZE = 1000;
  const batch: any[] = [];

  for (const row of transactions) {
    const caid = safeString(row.CAID);
    const epcode = safeString(row.epcode);
    const caseId = caidToCaseId.get(caid) || caidToCaseId.get(epcode);

    if (!caseId) { skipped++; continue; }

    const trDate = safeDate(row.TRDATE);
    const postingDate = safeDate(row.DATEOFPOSTING);
    const nextDate = safeDate(row.lastpostdate);

    if (!trDate && !postingDate) { skipped++; continue; }

    const posting = postingMap.get(safeString(row.POID)) || "";
    const subCode = safeString(row.SubCode);
    const remarks = safeString(row.REMARKS);
    const lastPosting = safeString(row.lastposting);
    const reason = safeString(row.Reason);

    const description = [remarks, lastPosting, reason, posting].filter(Boolean).join(" | ") || "Court posting";

    batch.push({
      id: randomUUID(),
      organizationId: org.id,
      caseId,
      date: trDate || postingDate,
      courtName: null,
      caseNumber: subCode || null,
      description: description.substring(0, 5000),
      stage: posting ? posting.substring(0, 200) : null,
      nextDate: (nextDate && nextDate !== trDate) ? nextDate : null,
      notes: null,
      createdAt: now,
      updatedAt: now,
    });

    if (batch.length >= BATCH_SIZE) {
      batchInsert(batch);
      process.stdout.write(`\r  Processed: ${created + skipped}/${transactions.length}`);
      batch.length = 0;
    }
  }

  // Flush remaining
  if (batch.length > 0) {
    batchInsert(batch);
  }

  db.close();

  console.log(`\n\n=== Diary Migration Complete ===`);
  console.log(`  Created : ${created}`);
  console.log(`  Skipped : ${skipped}`);
  console.log(`  Total   : ${created + skipped}\n`);
}

main().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
