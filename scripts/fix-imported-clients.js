"use strict";
const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "../data/legal-rag.db"));

// Fix persons incorrectly imported as COMPANY from BANK.DBF
const fix1 = db.prepare(`
  UPDATE Client
  SET clientType = 'INDIVIDUAL', updatedAt = datetime('now')
  WHERE clientType = 'COMPANY'
    AND notes LIKE 'Legacy code:%'
    AND (
      name LIKE '% S/o%' OR name LIKE '% W/o%' OR name LIKE '% D/o%'
      OR name LIKE 'S/o%' OR name LIKE 'W/o%' OR name LIKE 'D/o%'
      OR name LIKE 'Sri %' OR name LIKE 'Smt.%' OR name LIKE 'Sri.%'
    )
`).run();
console.log("Fixed person→INDIVIDUAL:", fix1.changes);

// Also fix "The Official Receiver" and "The Receiver" — set as COMPANY but not a bank
const fix2 = db.prepare(`
  UPDATE Client
  SET clientType = 'COMPANY', updatedAt = datetime('now')
  WHERE notes LIKE 'Legacy code:%'
    AND (name LIKE '%Receiver%' OR name LIKE '%Liquidator%')
`).run();
console.log("Receiver/Liquidator kept as COMPANY:", fix2.changes);

// Verify
const total = db.prepare("SELECT COUNT(*) as n FROM Client").get().n;
const active = db.prepare("SELECT COUNT(*) as n FROM Client WHERE isActive=1").get().n;
const company = db.prepare("SELECT COUNT(*) as n FROM Client WHERE clientType='COMPANY'").get().n;
const legacyBanks = db.prepare("SELECT COUNT(*) as n FROM Client WHERE clientType='COMPANY' AND notes LIKE 'Legacy code:%'").get().n;

console.log("\n=== CLIENT TABLE AFTER CLEANUP ===");
console.log("Total clients:       ", total);
console.log("Active clients:      ", active);
console.log("Company/Bank type:   ", company);
console.log("Legacy-imported banks:", legacyBanks);

console.log("\n=== SAMPLE LEGACY BANKS ===");
const banks = db.prepare(
  "SELECT name FROM Client WHERE clientType='COMPANY' AND notes LIKE 'Legacy code:%' ORDER BY name LIMIT 20"
).all();
banks.forEach(b => console.log(" -", b.name));
