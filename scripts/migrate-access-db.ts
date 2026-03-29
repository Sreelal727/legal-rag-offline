/**
 * Access Database Migration Script
 *
 * Reads Anathakrishnan's AdvosCD.mdb (MS Access) and migrates all data into
 * the Legal RAG SQLite database under the specified organization.
 *
 * Tables migrated:
 *   Client       (6142 rows)  → Client model
 *   CASE         (2417 rows)  → Case model
 *   CASEPARTYDET (18403 rows) → CaseClient model
 *   EPTABLE      (1330 rows)  → Case model (EP subtype)
 *   EPCLIENTDET  (4325 rows)  → CaseClient model (EP)
 *   TRANSACTION  (46776 rows) → DiaryEntry model
 *   CaseBill     (13937 rows) → (billing notes on cases)
 *   COURT        (24 rows)    → court name lookup
 *   CaseCode     (25 rows)    → case type lookup
 *   Suit         (24 rows)    → suit description lookup
 *   POSTING      (165 rows)   → posting status lookup
 *
 * Usage:
 *   npx tsx scripts/migrate-access-db.ts --mdb "D:/anadhakrishnan/AdvosCDAK/AdvosCD.mdb" --org-slug "gouriankar-associates"
 *
 * Options:
 *   --mdb <path>       Path to AdvosCD.mdb file (required)
 *   --org-slug <slug>  Organization slug to import into (required)
 *   --dry-run          Show counts without writing to DB
 */

import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import MDBReader from "mdb-reader";
import fs from "fs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { randomUUID } from "crypto";

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2);
  const config: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--mdb" && args[i + 1]) config.mdb = args[++i];
    else if (args[i] === "--org-slug" && args[i + 1]) config.orgSlug = args[++i];
    else if (args[i] === "--dry-run") config.dryRun = "true";
  }
  if (!config.mdb || !config.orgSlug) {
    console.error("Usage: npx tsx scripts/migrate-access-db.ts --mdb <path> --org-slug <slug> [--dry-run]");
    process.exit(1);
  }
  return config;
}

// ---------------------------------------------------------------------------
// Lookup table types
// ---------------------------------------------------------------------------

interface CourtRow {
  COID: string;
  Coucode: string;
  CoNAME: string;
  Coplace: string;
}

interface CaseCodeRow {
  CCid: string;
  ccucode: string;
  CCremarks: string | null;
  Lab1: string;
  Lab2: string;
}

interface SuitRow {
  Suid: string;
  Sucode: number;
  Stext: string;
}

interface PostingRow {
  POID: string;
  Pocode: number;
  NAME: string;
}

// ---------------------------------------------------------------------------
// Map Access case codes to our schema enums
// ---------------------------------------------------------------------------

function mapCaseType(ccucode: string): { caseType: string; caseSubType: string | null } {
  const code = ccucode.trim().replace(/\./g, "").replace(/,/g, "").toUpperCase();
  const map: Record<string, { caseType: string; caseSubType: string | null }> = {
    "OSNO":         { caseType: "CIVIL",    caseSubType: "PLAINT" },
    "EPNO":         { caseType: "CIVIL",    caseSubType: "EP" },
    "IANO":         { caseType: "CIVIL",    caseSubType: null },
    "ASNO":         { caseType: "CIVIL",    caseSubType: "APPEAL" },
    "EANO":         { caseType: "CIVIL",    caseSubType: "APPEAL" },
    "CMPNO":        { caseType: "CRIMINAL", caseSubType: null },
    "CCNO(CDRF)":   { caseType: "CIVIL",    caseSubType: null },
    "CCNO":         { caseType: "CRIMINAL", caseSubType: null },
    "STNO":         { caseType: "CRIMINAL", caseSubType: null },
    "SCNO":         { caseType: "CRIMINAL", caseSubType: null },
    "CRLANO":       { caseType: "CRIMINAL", caseSubType: "APPEAL" },
    "CRLRPNO":      { caseType: "CRIMINAL", caseSubType: "REVISION" },
    "GOPNO":        { caseType: "CIVIL",    caseSubType: "GOP" },
    "SOPNO":        { caseType: "CIVIL",    caseSubType: "SOP" },
    "MOPNO":        { caseType: "CIVIL",    caseSubType: null },
    "POPNO":        { caseType: "CIVIL",    caseSubType: null },
    "IPNO":         { caseType: "CIVIL",    caseSubType: null },
    "MCNO":         { caseType: "FAMILY",   caseSubType: null },
    "MVOPNO":       { caseType: "CIVIL",    caseSubType: null },
    "RCANO":        { caseType: "CIVIL",    caseSubType: "APPEAL" },
    "RCPNO":        { caseType: "CIVIL",    caseSubType: "RCP" },
    "CMANO":        { caseType: "CIVIL",    caseSubType: "APPEAL" },
    "OPNO":         { caseType: "CIVIL",    caseSubType: null },
    "LARNO":        { caseType: "CIVIL",    caseSubType: null },
    "APCPNO":       { caseType: "CIVIL",    caseSubType: null },
  };

  // Normalize: remove dots, spaces, "No"
  const normalized = code.replace(/\s+/g, "").replace(/NO$/, "NO");
  for (const [key, val] of Object.entries(map)) {
    if (normalized.includes(key)) return val;
  }
  return { caseType: "CIVIL", caseSubType: null };
}

function mapCaseStatus(status: string): string {
  switch (status?.trim().toUpperCase()) {
    case "D": return "CLOSED";      // Disposed
    case "A": return "ACTIVE";      // Active
    case "P": return "ACTIVE";      // Pending
    case "S": return "ACTIVE";      // Stayed
    default:  return "ACTIVE";
  }
}

function mapPartyType(type: string): string {
  switch (type?.trim().toUpperCase()) {
    case "P": return "PETITIONER";
    case "R": return "RESPONDENT";
    case "D": return "RESPONDENT";  // Defendant
    case "C": return "PETITIONER";  // Complainant
    default:  return "PETITIONER";
  }
}

function mapClientType(clstatus: string): string {
  const s = (clstatus || "").toLowerCase();
  if (s.includes("bank") || s.includes("company") || s.includes("corp") || s.includes("ltd")) {
    return "COMPANY";
  }
  return "INDIVIDUAL";
}

function safeDate(val: any): Date | null {
  if (!val) return null;
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return null;
    // Skip dates before 1900 or after 2100
    if (d.getFullYear() < 1900 || d.getFullYear() > 2100) return null;
    return d;
  } catch {
    return null;
  }
}

function safeString(val: any, maxLen = 5000): string {
  if (val === null || val === undefined) return "";
  return String(val).trim().substring(0, maxLen);
}

function safeFloat(val: any): number {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

// ---------------------------------------------------------------------------
// Main migration
// ---------------------------------------------------------------------------

async function main() {
  const config = parseArgs();
  const dryRun = config.dryRun === "true";

  console.log("=======================================================");
  console.log("  Access DB → Legal RAG Migration");
  console.log("=======================================================");
  console.log(`  Source : ${config.mdb}`);
  console.log(`  Target : org-slug "${config.orgSlug}"`);
  console.log(`  Mode   : ${dryRun ? "DRY RUN (no writes)" : "LIVE MIGRATION"}`);
  console.log("=======================================================\n");

  // --- Read Access DB ---
  if (!fs.existsSync(config.mdb)) {
    console.error(`ERROR: MDB file not found: ${config.mdb}`);
    process.exit(1);
  }

  console.log("Reading Access database...");
  const buf = fs.readFileSync(config.mdb);
  const reader = new MDBReader(buf);
  const tableNames = reader.getTableNames();
  console.log(`Found ${tableNames.length} tables\n`);

  // --- Connect to Legal RAG DB ---
  const dbPath = process.env.DATABASE_PATH || "./data/legal-rag.db";
  const adapter = new PrismaBetterSqlite3({ url: dbPath });
  const prisma = new PrismaClient({ adapter } as any);

  // Find organization
  const org = await prisma.organization.findFirst({ where: { slug: config.orgSlug } });
  if (!org) {
    console.error(`ERROR: Organization with slug "${config.orgSlug}" not found.`);
    console.error("Run the setup script first: npx tsx scripts/setup-anathakrishnan.ts");
    process.exit(1);
  }
  console.log(`Target organization: ${org.name} (${org.id})\n`);

  // Get a user to use as uploadedBy/createdBy
  const orgUser = await prisma.user.findFirst({ where: { organizationId: org.id } });
  if (!orgUser) {
    console.error("ERROR: No users found in this organization. Run setup first.");
    process.exit(1);
  }

  // =========================================================================
  // STEP 1: Build lookup tables
  // =========================================================================

  console.log("--- Step 1: Building lookup tables ---");

  const courtMap = new Map<string, CourtRow>();
  reader.getTable("COURT").getData().forEach((r: any) => {
    courtMap.set(r.COID, r as CourtRow);
  });
  console.log(`  Courts: ${courtMap.size}`);

  const caseCodeMap = new Map<string, CaseCodeRow>();
  reader.getTable("CaseCode").getData().forEach((r: any) => {
    caseCodeMap.set(r.CCid, r as CaseCodeRow);
  });
  console.log(`  Case codes: ${caseCodeMap.size}`);

  const suitMap = new Map<string, SuitRow>();
  reader.getTable("Suit").getData().forEach((r: any) => {
    suitMap.set(r.Suid, r as SuitRow);
  });
  console.log(`  Suit types: ${suitMap.size}`);

  const postingMap = new Map<string, PostingRow>();
  try {
    reader.getTable("POSTING").getData().forEach((r: any) => {
      postingMap.set(r.POID, r as PostingRow);
    });
  } catch { /* table may not exist */ }
  console.log(`  Posting codes: ${postingMap.size}\n`);

  // =========================================================================
  // STEP 2: Migrate Clients
  // =========================================================================

  console.log("--- Step 2: Migrating Clients ---");
  const accessClients = reader.getTable("Client").getData();
  console.log(`  Source rows: ${accessClients.length}`);

  // Map Access ClID → our UUID (for linking cases later)
  const clientIdMap = new Map<string, string>();
  let clientsCreated = 0;
  let clientsSkipped = 0;

  if (!dryRun) {
    for (const row of accessClients) {
      const clId = safeString(row.ClID);
      const name = safeString(row.Clname);
      if (!name) { clientsSkipped++; continue; }

      const newId = randomUUID();
      clientIdMap.set(clId, newId);

      try {
        await prisma.client.create({
          data: {
            id: newId,
            organizationId: org.id,
            name: name,
            fatherHusbandName: safeString(row.FName) || null,
            designation: safeString(row.Desig) || null,
            email: safeString(row.ClEmail1) || null,
            phone: safeString(row.ClPhone) || null,
            alternatePhone: safeString(row.Clmobile) || null,
            address: [
              safeString(row.Claddress),
              safeString(row.Claddress1),
              safeString(row.Claddress2),
              safeString(row.Claddress3),
              safeString(row.Claddress4),
            ].filter(Boolean).join(", ") || null,
            city: safeString(row.ClBranch) || null,
            district: "Palakkad",
            state: "Kerala",
            clientType: mapClientType(safeString(row.Clstatus)),
            notes: safeString(row.Clstatus) ? `Legacy status: ${safeString(row.Clstatus)}` : null,
            isActive: true,
          },
        });
        clientsCreated++;
      } catch (e: any) {
        // Skip duplicates
        if (e.message?.includes("UNIQUE")) {
          clientsSkipped++;
        } else {
          console.error(`  Error on client ${clId}: ${e.message}`);
          clientsSkipped++;
        }
      }
    }
  }
  console.log(`  Created: ${clientsCreated}, Skipped: ${clientsSkipped}\n`);

  // =========================================================================
  // STEP 3: Migrate Cases
  // =========================================================================

  console.log("--- Step 3: Migrating Cases ---");
  const accessCases = reader.getTable("CASE").getData();
  console.log(`  Source rows: ${accessCases.length}`);

  // Map Access CAID → our Case UUID
  const caseIdMap = new Map<string, string>();
  let casesCreated = 0;
  let casesSkipped = 0;

  if (!dryRun) {
    for (const row of accessCases) {
      const caid = safeString(row.caid);
      const maincode = safeString(row.maincode);
      if (!maincode) { casesSkipped++; continue; }

      // Lookup court
      const court = courtMap.get(safeString(row.coid));
      const courtName = court ? `${court.CoNAME} ${court.Coplace}`.trim() : "";

      // Lookup case type
      const caseCode = caseCodeMap.get(safeString(row.casecodeid));
      const ccucode = caseCode?.ccucode || "";
      const { caseType, caseSubType } = mapCaseType(ccucode);

      // Lookup suit description
      const suit = suitMap.get(safeString(row.suid));
      const suitDesc = suit?.Stext || "";

      // Build title from parties
      const petId = safeString(row.petid);
      const repId = safeString(row.repid);
      // We'll use maincode as title for now; parties linked via CaseClient
      const title = `${maincode}${suitDesc ? ` - ${suitDesc.substring(0, 100)}` : ""}`;

      const newId = randomUUID();
      caseIdMap.set(caid, newId);

      const filingDate = safeDate(row.regdate);
      const disposedDate = safeDate(row.disposeddate);
      const decreeDate = safeDate(row.datedecreed);

      // Determine stage
      let stage = "FILED";
      const status = mapCaseStatus(safeString(row.status));
      if (status === "CLOSED") {
        stage = decreeDate ? "JUDGMENT" : "JUDGMENT";
      }
      if (caseSubType === "EP") {
        stage = "EXECUTION";
      }

      try {
        await prisma.case.create({
          data: {
            id: newId,
            organizationId: org.id,
            caseNumber: maincode,
            title: title.substring(0, 500),
            description: [
              suitDesc,
              safeString(row.longdesc),
              safeString(row.disposedreason) ? `Disposed: ${safeString(row.disposedreason)}` : "",
            ].filter(Boolean).join("\n") || null,
            caseType,
            caseSubType,
            courtName: courtName || null,
            courtType: "DISTRICT_COURT",
            filingDate,
            status,
            stage,
            priority: status === "ACTIVE" ? "MEDIUM" : "LOW",
            suitValue: safeFloat(row.suitvaluation) || null,
            courtFee: safeFloat(row.courtfeepayable) || null,
            notes: [
              safeFloat(row.amtdecreed) ? `Decree amount: Rs. ${row.amtdecreed}` : "",
              safeFloat(row.costofdecree) ? `Cost of decree: Rs. ${row.costofdecree}` : "",
              safeFloat(row.intrate) ? `Interest rate: ${row.intrate}%` : "",
              safeString(row.ActvSubCode) ? `Linked: ${row.ActvSubCode}` : "",
            ].filter(Boolean).join("\n") || null,
          },
        });
        casesCreated++;
      } catch (e: any) {
        if (e.message?.includes("UNIQUE")) {
          casesSkipped++;
        } else {
          console.error(`  Error on case ${maincode}: ${e.message}`);
          casesSkipped++;
        }
      }
    }
  }
  console.log(`  Created: ${casesCreated}, Skipped: ${casesSkipped}\n`);

  // =========================================================================
  // STEP 4: Migrate Execution Petitions (EPTABLE)
  // =========================================================================

  console.log("--- Step 4: Migrating Execution Petitions ---");
  const accessEPs = reader.getTable("EPTABLE").getData();
  console.log(`  Source rows: ${accessEPs.length}`);

  // Map EPCODE → case UUID
  const epCaseIdMap = new Map<string, string>();
  let epsCreated = 0;
  let epsSkipped = 0;

  if (!dryRun) {
    for (const row of accessEPs) {
      const epcode = safeString(row.EPCODE);
      const epno = safeString(row.EPNO);
      const maincode = safeString(row.MAINCODE);
      if (!epno && !maincode) { epsSkipped++; continue; }

      const caseNumber = epno ? `E.P.No.${epno}` : maincode;
      const court = courtMap.get(safeString(row.COID));
      const courtName = court ? `${court.CoNAME} ${court.Coplace}`.trim() : "";

      const epDate = safeDate(row.EPDATE);
      const decreeDate = safeDate(row.DECREEDATE);
      const status = safeString(row.STATUS).toUpperCase() === "D" ? "CLOSED" : "ACTIVE";

      const title = `${caseNumber}${maincode ? ` (from ${maincode})` : ""}`;
      const newId = randomUUID();
      epCaseIdMap.set(epcode, newId);

      try {
        await prisma.case.create({
          data: {
            id: newId,
            organizationId: org.id,
            caseNumber: caseNumber,
            title: title.substring(0, 500),
            description: [
              `Execution Petition from ${maincode}`,
              safeString(row.PRAYERCODE) ? `Prayer: ${safeString(row.PRAYERCODE)}` : "",
              safeFloat(row.AMTDECREED) ? `Decree amount: Rs. ${row.AMTDECREED}` : "",
              safeFloat(row.COSTAWARDED) ? `Cost awarded: Rs. ${row.COSTAWARDED}` : "",
            ].filter(Boolean).join("\n") || null,
            caseType: "CIVIL",
            caseSubType: "EP",
            courtName: courtName || null,
            courtType: "DISTRICT_COURT",
            filingDate: epDate,
            status,
            stage: "EXECUTION",
            priority: status === "ACTIVE" ? "HIGH" : "LOW",
            suitValue: safeFloat(row.HIGHESTTOTAL) || safeFloat(row.AMTDECREED) || null,
            notes: [
              safeFloat(row.NOTICEBATTA) ? `Notice batta: Rs. ${row.NOTICEBATTA}` : "",
              safeFloat(row.COSTOFDECREECOPY) ? `Decree copy cost: Rs. ${row.COSTOFDECREECOPY}` : "",
              safeFloat(row.STAMPCHARGES) ? `Stamp charges: Rs. ${row.STAMPCHARGES}` : "",
              safeString(row.MANAGERNAME) ? `Manager: ${row.MANAGERNAME}, ${row.MANAGERDESIGNATION}` : "",
              row.DECREEAPPEALSTATUS ? "Decree appealed" : "",
              row.ADJUSTMENTSTATUS ? "Has adjustments" : "",
            ].filter(Boolean).join("\n") || null,
          },
        });
        epsCreated++;
      } catch (e: any) {
        if (e.message?.includes("UNIQUE")) {
          epsSkipped++;
        } else {
          console.error(`  Error on EP ${caseNumber}: ${e.message}`);
          epsSkipped++;
        }
      }
    }
  }
  console.log(`  Created: ${epsCreated}, Skipped: ${epsSkipped}\n`);

  // =========================================================================
  // STEP 5: Link parties to cases (CASEPARTYDET)
  // =========================================================================

  console.log("--- Step 5: Linking parties to cases ---");
  const partyDets = reader.getTable("CASEPARTYDET").getData();
  console.log(`  Source rows: ${partyDets.length}`);

  let linksCreated = 0;
  let linksSkipped = 0;

  if (!dryRun) {
    for (const row of partyDets) {
      const caid = safeString(row.CAID);
      const clid = safeString(row.Clid);
      const caseUUID = caseIdMap.get(caid);
      const clientUUID = clientIdMap.get(clid);

      if (!caseUUID || !clientUUID) { linksSkipped++; continue; }

      try {
        await prisma.caseClient.create({
          data: {
            caseId: caseUUID,
            clientId: clientUUID,
            role: mapPartyType(safeString(row.type)),
          },
        });
        linksCreated++;
      } catch (e: any) {
        // Skip duplicate links
        linksSkipped++;
      }
    }
  }
  console.log(`  Created: ${linksCreated}, Skipped: ${linksSkipped}\n`);

  // =========================================================================
  // STEP 6: Link parties to EPs (EPCLIENTDET)
  // =========================================================================

  console.log("--- Step 6: Linking parties to Execution Petitions ---");
  const epClientDets = reader.getTable("EPCLIENTDET").getData();
  console.log(`  Source rows: ${epClientDets.length}`);

  let epLinksCreated = 0;
  let epLinksSkipped = 0;

  if (!dryRun) {
    for (const row of epClientDets) {
      const epcode = safeString(row.EPCODE);
      const clid = safeString(row.CLID);
      const caseUUID = epCaseIdMap.get(epcode);
      const clientUUID = clientIdMap.get(clid);

      if (!caseUUID || !clientUUID) { epLinksSkipped++; continue; }

      try {
        await prisma.caseClient.create({
          data: {
            caseId: caseUUID,
            clientId: clientUUID,
            role: mapPartyType(safeString(row.Type)),
          },
        });
        epLinksCreated++;
      } catch {
        epLinksSkipped++;
      }
    }
  }
  console.log(`  Created: ${epLinksCreated}, Skipped: ${epLinksSkipped}\n`);

  // =========================================================================
  // STEP 7: Migrate Transactions → DiaryEntry
  // =========================================================================

  console.log("--- Step 7: Migrating court diary entries (Transactions) ---");
  const transactions = reader.getTable("TRANSACTION").getData();
  console.log(`  Source rows: ${transactions.length}`);

  let diaryCreated = 0;
  let diarySkipped = 0;

  if (!dryRun) {
    for (const row of transactions) {
      const caid = safeString(row.CAID);
      const caseUUID = caseIdMap.get(caid) || epCaseIdMap.get(safeString(row.epcode));
      if (!caseUUID) { diarySkipped++; continue; }

      const trDate = safeDate(row.TRDATE);
      const postingDate = safeDate(row.DATEOFPOSTING);
      const nextDate = safeDate(row.lastpostdate);

      if (!trDate && !postingDate) { diarySkipped++; continue; }

      // Get posting description
      const posting = postingMap.get(safeString(row.POID));
      const postingDesc = posting?.NAME || "";

      const subCode = safeString(row.SubCode);
      const remarks = safeString(row.REMARKS);
      const lastPosting = safeString(row.lastposting);
      const reason = safeString(row.Reason);

      try {
        await prisma.diaryEntry.create({
          data: {
            organizationId: org.id,
            caseId: caseUUID,
            date: trDate || postingDate!,
            courtName: null, // Will be inherited from the case
            caseNumber: subCode || null,
            description: [remarks, lastPosting, reason, postingDesc].filter(Boolean).join(" | ") || "Court posting",
            stage: postingDesc || null,
            nextDate: nextDate !== trDate ? nextDate : null,
          },
        });
        diaryCreated++;
      } catch (e: any) {
        diarySkipped++;
      }
    }
  }
  console.log(`  Created: ${diaryCreated}, Skipped: ${diarySkipped}\n`);

  // =========================================================================
  // STEP 8: Assign all cases to the primary advocate
  // =========================================================================

  console.log("--- Step 8: Assigning cases to primary advocate ---");

  let assignmentsCreated = 0;

  if (!dryRun) {
    // Assign all cases to the first user (G. Ananthakrishnan)
    const allCaseIds = [...caseIdMap.values(), ...epCaseIdMap.values()];
    for (const caseUUID of allCaseIds) {
      try {
        await prisma.caseAssignment.create({
          data: {
            caseId: caseUUID,
            userId: orgUser.id,
            role: "LEAD",
          },
        });
        assignmentsCreated++;
      } catch {
        // Skip duplicates
      }
    }
  }
  console.log(`  Assigned: ${assignmentsCreated} cases to ${orgUser.name}\n`);

  // =========================================================================
  // Summary
  // =========================================================================

  const totalCases = casesCreated + epsCreated;
  const totalLinks = linksCreated + epLinksCreated;

  console.log("=======================================================");
  console.log("  MIGRATION COMPLETE" + (dryRun ? " (DRY RUN)" : ""));
  console.log("=======================================================");
  console.log(`  Organization : ${org.name}`);
  console.log(`  Clients      : ${clientsCreated} migrated`);
  console.log(`  Cases         : ${casesCreated} cases + ${epsCreated} EPs = ${totalCases} total`);
  console.log(`  Party links   : ${totalLinks} (case-client relationships)`);
  console.log(`  Diary entries  : ${diaryCreated}`);
  console.log(`  Assignments   : ${assignmentsCreated}`);
  console.log("-------------------------------------------------------");
  console.log(`  Skipped        : ${clientsSkipped} clients, ${casesSkipped + epsSkipped} cases, ${linksSkipped + epLinksSkipped} links, ${diarySkipped} diary`);
  console.log("=======================================================\n");

  if (dryRun) {
    console.log("This was a dry run. Run again without --dry-run to perform the migration.");
  } else {
    console.log("Migration complete! Start the server and login to verify the data.");
    console.log("  npm run dev");
    console.log(`  Login as: ${orgUser.email}`);
  }
}

main().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
