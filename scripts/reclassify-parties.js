/**
 * Party Reclassification Migration Script
 *
 * Moves clients who are ONLY respondents/defendants from the Client table
 * into the OppositeParty table, where they correctly belong.
 *
 * Summary of actions:
 *  - 4,430 "pure respondents" → create OppositeParty records, remove from Client visible list
 *  - 203 "both" clients      → keep as Client, also create OppositeParty for respondent cases
 *  - 1,197 pure petitioners  → unchanged (true clients)
 *  - 310 with no cases       → unchanged
 *
 * Run: node scripts/reclassify-parties.js
 * Dry run: node scripts/reclassify-parties.js --dry-run
 */

const Database = require("better-sqlite3");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const DB_PATH = path.join(__dirname, "../data/legal-rag.db");
const DRY_RUN = process.argv.includes("--dry-run");

const db = new Database(DB_PATH);

// ─── Helpers ────────────────────────────────────────────────────────────────

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function mapPartyType(clientType) {
  // In these civil recovery cases, respondents are typically defendants
  return "DEFENDANT";
}

function buildNotes(client) {
  const parts = [];
  if (client.aadharNumber) parts.push(`Aadhaar: ${client.aadharNumber}`);
  if (client.panNumber) parts.push(`PAN: ${client.panNumber}`);
  if (client.occupation) parts.push(`Occupation: ${client.occupation}`);
  if (client.dob) parts.push(`DOB: ${client.dob}`);
  if (client.age) parts.push(`Age: ${client.age}`);
  if (client.gstNumber) parts.push(`GST: ${client.gstNumber}`);
  if (client.notes) parts.push(client.notes);
  return parts.join(" | ") || null;
}

// ─── Main Migration ──────────────────────────────────────────────────────────

function main() {
  log(`Starting party reclassification${DRY_RUN ? " (DRY RUN)" : ""}...`);

  // Get all clients that appear as RESPONDENT, with their case links
  const respondentLinks = db.prepare(`
    SELECT
      cc.id AS caseclientId,
      cc.caseId,
      cc.clientId,
      cc.role,
      c.name,
      c.fatherHusbandName,
      c.designation,
      c.address,
      c.city,
      c.district,
      c.state,
      c.pincode,
      c.phone,
      c.alternatePhone,
      c.email,
      c.aadharNumber,
      c.panNumber,
      c.gstNumber,
      c.occupation,
      c.dob,
      c.age,
      c.notes,
      c.clientType,
      c.organizationId,
      CASE
        WHEN c.id IN (SELECT clientId FROM CaseClient WHERE role = 'PETITIONER')
        THEN 1 ELSE 0
      END AS isAlsoPetitioner
    FROM CaseClient cc
    JOIN Client c ON c.id = cc.clientId
    WHERE cc.role = 'RESPONDENT'
    ORDER BY c.name
  `).all();

  log(`Found ${respondentLinks.length} RESPONDENT case-client links to process`);

  // Stats
  let created = 0;
  let skipped = 0;
  let errors = 0;
  let removedCaseClientLinks = 0;

  // Prepare statements
  const insertOppositeParty = db.prepare(`
    INSERT INTO OppositeParty (
      id, caseId, name, fatherHusbandName, designation,
      address, city, district, state, pincode,
      phone, email, partyType, notes,
      createdAt, updatedAt
    ) VALUES (
      @id, @caseId, @name, @fatherHusbandName, @designation,
      @address, @city, @district, @state, @pincode,
      @phone, @email, @partyType, @notes,
      @createdAt, @updatedAt
    )
  `);

  const deleteCaseClient = db.prepare(`
    DELETE FROM CaseClient WHERE id = ?
  `);

  const checkExisting = db.prepare(`
    SELECT id FROM OppositeParty
    WHERE caseId = ? AND name = ?
    LIMIT 1
  `);

  const now = new Date().toISOString();

  // Run in a transaction for performance and safety
  const migrate = db.transaction(() => {
    for (const link of respondentLinks) {
      try {
        // Check if OppositeParty already exists for this case+name
        const existing = checkExisting.get(link.caseId, link.name);
        if (existing) {
          skipped++;
          // Still remove the CaseClient RESPONDENT link
          if (!DRY_RUN) deleteCaseClient.run(link.caseclientId);
          removedCaseClientLinks++;
          continue;
        }

        const notes = buildNotes(link);

        if (!DRY_RUN) {
          insertOppositeParty.run({
            id: uuidv4(),
            caseId: link.caseId,
            name: link.name,
            fatherHusbandName: link.fatherHusbandName || null,
            designation: link.designation || null,
            address: [link.address, link.city, link.district, link.state, link.pincode]
              .filter(Boolean).join(", ") || null,
            city: link.city || null,
            district: link.district || null,
            state: link.state || null,
            pincode: link.pincode || null,
            phone: link.phone || link.alternatePhone || null,
            email: link.email || null,
            partyType: mapPartyType(link.clientType),
            notes,
            createdAt: now,
            updatedAt: now,
          });

          deleteCaseClient.run(link.caseclientId);
        }

        created++;
        removedCaseClientLinks++;

        if (created % 500 === 0) {
          log(`  Progress: ${created} OppositeParty records created...`);
        }
      } catch (err) {
        errors++;
        if (errors <= 10) {
          log(`  ERROR for ${link.name} (case ${link.caseId}): ${err.message}`);
        }
      }
    }
  });

  migrate();

  log(`\n=== Migration Complete ===`);
  log(`OppositeParty records created: ${created}`);
  log(`Skipped (already existed): ${skipped}`);
  log(`CaseClient RESPONDENT links removed: ${removedCaseClientLinks}`);
  log(`Errors: ${errors}`);

  // Now handle Client records that are now pure respondents
  // (no more PETITIONER role after the migration)
  if (!DRY_RUN) {
    const orphanClients = db.prepare(`
      SELECT id, name FROM Client
      WHERE id NOT IN (SELECT clientId FROM CaseClient)
      AND id NOT IN (
        SELECT clientId FROM CaseClient WHERE role = 'PETITIONER'
      )
      AND notes NOT LIKE '%[opposition]%'
    `).all();

    log(`\nClients that are now only respondents (can be cleaned): ${orphanClients.length}`);

    // Mark them in notes rather than deleting (safe approach)
    const markAsOpposition = db.prepare(`
      UPDATE Client SET
        notes = CASE
          WHEN notes IS NULL OR notes = '' THEN '[opposition] Reclassified as opposite party'
          ELSE notes || ' | [opposition] Reclassified as opposite party'
        END,
        isActive = 0,
        updatedAt = ?
      WHERE id = ?
    `);

    const markAll = db.transaction(() => {
      for (const client of orphanClients) {
        markAsOpposition.run(now, client.id);
      }
    });
    markAll();
    log(`Marked ${orphanClients.length} clients as inactive/opposition`);
  }

  // Final stats
  const finalCounts = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM Client WHERE isActive = 1) AS activeClients,
      (SELECT COUNT(*) FROM Client WHERE isActive = 0) AS inactiveClients,
      (SELECT COUNT(*) FROM OppositeParty) AS oppositeParties,
      (SELECT COUNT(*) FROM CaseClient WHERE role = 'PETITIONER') AS petitionerLinks,
      (SELECT COUNT(*) FROM CaseClient WHERE role = 'RESPONDENT') AS respondentLinks
  `).get();

  log(`\n=== Final DB State ===`);
  log(`Active clients (true clients): ${finalCounts.activeClients}`);
  log(`Inactive clients (marked as opposition): ${finalCounts.inactiveClients}`);
  log(`OppositeParty records: ${finalCounts.oppositeParties}`);
  log(`CaseClient PETITIONER links: ${finalCounts.petitionerLinks}`);
  log(`CaseClient RESPONDENT links remaining: ${finalCounts.respondentLinks}`);

  db.close();
}

main();
