import dotenv from "dotenv";
import path from "path";
import { createClient } from "@libsql/client";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const migrations = [
  // 1. Create Organization table
  `CREATE TABLE IF NOT EXISTS "Organization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "gstin" TEXT,
    "registrationNumber" TEXT,
    "letterheadUrl" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'FREE_TRIAL',
    "planExpiresAt" DATETIME,
    "maxUsers" INTEGER NOT NULL DEFAULT 5,
    "maxCases" INTEGER NOT NULL DEFAULT 50,
    "maxDocuments" INTEGER NOT NULL DEFAULT 100,
    "maxAiQueries" INTEGER NOT NULL DEFAULT 500,
    "aiQueriesUsed" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Organization_slug_key" ON "Organization"("slug")`,

  // 2. Create PasswordResetToken table
  `CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT NOT NULL,
    CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PasswordResetToken_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_token_key" ON "PasswordResetToken"("token")`,

  // 3. Insert default Organization from existing FirmSettings
  `INSERT OR IGNORE INTO "Organization" ("id", "name", "slug", "address", "phone", "email", "gstin", "plan", "maxUsers", "maxCases", "maxDocuments", "maxAiQueries", "updatedAt")
   SELECT 'default-org', COALESCE(fs."firmName", 'Legal Practice'), 'default', fs."address", fs."phone", fs."email", fs."gstin", 'PROFESSIONAL', 25, 500, 5000, 1000, CURRENT_TIMESTAMP
   FROM "FirmSettings" fs LIMIT 1`,

  // Fallback if no FirmSettings exists
  `INSERT OR IGNORE INTO "Organization" ("id", "name", "slug", "plan", "maxUsers", "maxCases", "maxDocuments", "maxAiQueries", "updatedAt")
   VALUES ('default-org', 'Legal Practice', 'default', 'PROFESSIONAL', 25, 500, 5000, 1000, CURRENT_TIMESTAMP)`,

  // 4. Add organizationId columns and login security fields to existing tables
  // User table
  `ALTER TABLE "User" ADD COLUMN "organizationId" TEXT REFERENCES "Organization"("id") ON DELETE CASCADE`,
  `ALTER TABLE "User" ADD COLUMN "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE "User" ADD COLUMN "lockedUntil" DATETIME`,
  `ALTER TABLE "User" ADD COLUMN "lastLoginAt" DATETIME`,
  `UPDATE "User" SET "organizationId" = 'default-org' WHERE "organizationId" IS NULL`,

  // Client table
  `ALTER TABLE "Client" ADD COLUMN "organizationId" TEXT REFERENCES "Organization"("id") ON DELETE CASCADE`,
  `UPDATE "Client" SET "organizationId" = 'default-org' WHERE "organizationId" IS NULL`,

  // Case table
  `ALTER TABLE "Case" ADD COLUMN "organizationId" TEXT REFERENCES "Organization"("id") ON DELETE CASCADE`,
  `UPDATE "Case" SET "organizationId" = 'default-org' WHERE "organizationId" IS NULL`,

  // Document table
  `ALTER TABLE "Document" ADD COLUMN "organizationId" TEXT REFERENCES "Organization"("id") ON DELETE CASCADE`,
  `UPDATE "Document" SET "organizationId" = 'default-org' WHERE "organizationId" IS NULL`,

  // DiaryEntry table
  `ALTER TABLE "DiaryEntry" ADD COLUMN "organizationId" TEXT REFERENCES "Organization"("id") ON DELETE CASCADE`,
  `UPDATE "DiaryEntry" SET "organizationId" = 'default-org' WHERE "organizationId" IS NULL`,

  // ScheduleEvent table
  `ALTER TABLE "ScheduleEvent" ADD COLUMN "organizationId" TEXT REFERENCES "Organization"("id") ON DELETE CASCADE`,
  `UPDATE "ScheduleEvent" SET "organizationId" = 'default-org' WHERE "organizationId" IS NULL`,

  // LimitationTracker table
  `ALTER TABLE "LimitationTracker" ADD COLUMN "organizationId" TEXT REFERENCES "Organization"("id") ON DELETE CASCADE`,
  `UPDATE "LimitationTracker" SET "organizationId" = 'default-org' WHERE "organizationId" IS NULL`,

  // NoticeTemplate table
  `ALTER TABLE "NoticeTemplate" ADD COLUMN "organizationId" TEXT REFERENCES "Organization"("id") ON DELETE CASCADE`,
  `UPDATE "NoticeTemplate" SET "organizationId" = 'default-org' WHERE "organizationId" IS NULL`,

  // Notice table
  `ALTER TABLE "Notice" ADD COLUMN "organizationId" TEXT REFERENCES "Organization"("id") ON DELETE CASCADE`,
  `UPDATE "Notice" SET "organizationId" = 'default-org' WHERE "organizationId" IS NULL`,

  // ChatSession table
  `ALTER TABLE "ChatSession" ADD COLUMN "organizationId" TEXT REFERENCES "Organization"("id") ON DELETE CASCADE`,
  `UPDATE "ChatSession" SET "organizationId" = 'default-org' WHERE "organizationId" IS NULL`,

  // AuditLog table
  `ALTER TABLE "AuditLog" ADD COLUMN "organizationId" TEXT REFERENCES "Organization"("id") ON DELETE CASCADE`,
  `UPDATE "AuditLog" SET "organizationId" = 'default-org' WHERE "organizationId" IS NULL`,

  // TimeEntry table
  `ALTER TABLE "TimeEntry" ADD COLUMN "organizationId" TEXT REFERENCES "Organization"("id") ON DELETE CASCADE`,
  `UPDATE "TimeEntry" SET "organizationId" = 'default-org' WHERE "organizationId" IS NULL`,

  // Invoice table
  `ALTER TABLE "Invoice" ADD COLUMN "organizationId" TEXT REFERENCES "Organization"("id") ON DELETE CASCADE`,
  `UPDATE "Invoice" SET "organizationId" = 'default-org' WHERE "organizationId" IS NULL`,

  // FormatSample table
  `ALTER TABLE "FormatSample" ADD COLUMN "organizationId" TEXT REFERENCES "Organization"("id") ON DELETE CASCADE`,
  `UPDATE "FormatSample" SET "organizationId" = 'default-org' WHERE "organizationId" IS NULL`,

  // DocumentSubmission table
  `ALTER TABLE "DocumentSubmission" ADD COLUMN "organizationId" TEXT REFERENCES "Organization"("id") ON DELETE CASCADE`,
  `UPDATE "DocumentSubmission" SET "organizationId" = 'default-org' WHERE "organizationId" IS NULL`,
];

async function main() {
  console.log("Running migrations on Turso...");
  let success = 0;
  let skipped = 0;

  for (const sql of migrations) {
    try {
      await client.execute(sql);
      success++;
      console.log(`  ✓ ${sql.substring(0, 60)}...`);
    } catch (err: any) {
      if (err.message?.includes("duplicate column") || err.message?.includes("already exists")) {
        skipped++;
        console.log(`  ⊘ Skipped (already exists): ${sql.substring(0, 60)}...`);
      } else {
        console.error(`  ✗ Failed: ${sql.substring(0, 60)}...`);
        console.error(`    ${err.message}`);
      }
    }
  }

  console.log(`\nDone: ${success} applied, ${skipped} skipped`);
}

main().catch(console.error);
