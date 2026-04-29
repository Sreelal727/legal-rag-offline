/**
 * One-time import: reads every bank opinion reference file from
 * D:\anadhakrishnan\Documents\Opini[on 28.5.2024\<BANK>\<year>\JN*.doc
 * and upserts them into the FormatSample table (category = "bank-opinion").
 *
 * Run:
 *   npx tsx scripts/import-bank-formats.ts
 *
 * Safe to re-run — existing rows for the same bank are updated in place.
 */

import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { readdirSync, statSync, existsSync } from "fs";
import { extractDocText } from "../src/lib/document-analyzer";

const OPINIONS_BASE = "D:/anadhakrishnan/Documents/Opini[on 28.5.2024";
const CATEGORY = "bank-opinion";

function pickReferenceFile(bankDir: string): string | null {
  let entries: string[];
  try { entries = readdirSync(bankDir); } catch { return null; }

  const years = entries
    .filter((e) => /^\d{4}$/.test(e))
    .map((e) => ({ name: e, year: parseInt(e, 10) }))
    .sort((a, b) => b.year - a.year);

  for (const y of years) {
    const yearDir = path.join(bankDir, y.name);
    let files: string[];
    try { files = readdirSync(yearDir); } catch { continue; }
    const docs = files.filter(
      (f) => !f.startsWith("~") && /\.docx?$/i.test(f) && /^JN/i.test(f)
    );
    if (docs.length > 0) {
      const sized = docs
        .map((f) => ({ f, size: safeSize(path.join(yearDir, f)) }))
        .sort((a, b) => b.size - a.size);
      return path.join(yearDir, sized[0].f);
    }
  }

  // Fallback: JN*.doc directly in bank folder
  const direct = entries.filter(
    (f) => !f.startsWith("~") && /\.docx?$/i.test(f) && /^JN/i.test(f)
  );
  if (direct.length > 0) {
    const sized = direct
      .map((f) => ({ f, size: safeSize(path.join(bankDir, f)) }))
      .sort((a, b) => b.size - a.size);
    return path.join(bankDir, sized[0].f);
  }
  return null;
}

function safeSize(p: string): number {
  try { return statSync(p).size; } catch { return 0; }
}

async function main() {
  const dbPath = process.env.DATABASE_PATH || "./data/legal-rag.db";
  const adapter = new PrismaBetterSqlite3({ url: dbPath });
  const prisma = new PrismaClient({ adapter } as any);

  // Get the first (and typically only) organisation
  const org = await prisma.organization.findFirst({ select: { id: true, name: true } });
  if (!org) {
    console.error("No organisation found in DB. Run setup-anathakrishnan.ts first.");
    process.exit(1);
  }
  console.log(`Organisation: ${org.name} (${org.id})`);

  if (!existsSync(OPINIONS_BASE)) {
    console.error(`Opinions folder not found: ${OPINIONS_BASE}`);
    process.exit(1);
  }

  const folders = readdirSync(OPINIONS_BASE).filter((f) => {
    if (f.startsWith("~") || f.startsWith(".")) return false;
    const full = path.join(OPINIONS_BASE, f);
    try { return statSync(full).isDirectory(); } catch { return false; }
  });

  console.log(`\nFound ${folders.length} bank folders. Scanning for JN*.doc files...\n`);

  let imported = 0;
  let skipped = 0;

  for (const folder of folders) {
    const bankDir = path.join(OPINIONS_BASE, folder);
    const filePath = pickReferenceFile(bankDir);

    if (!filePath) {
      console.log(`  SKIP  ${folder} — no JN*.doc found`);
      skipped++;
      continue;
    }

    const fileName = path.basename(filePath);
    const fileSize = safeSize(filePath);

    let text = "";
    try {
      text = await extractDocText(filePath);
    } catch (err: any) {
      console.log(`  ERROR ${folder}/${fileName} — ${err.message}`);
      skipped++;
      continue;
    }

    if (!text || text.replace(/\s/g, "").length < 50) {
      console.log(`  SKIP  ${folder}/${fileName} — empty or unreadable`);
      skipped++;
      continue;
    }

    // Upsert: one row per bank subcategory
    const existing = await prisma.formatSample.findFirst({
      where: { organizationId: org.id, category: CATEGORY, subcategory: folder },
      select: { id: true },
    });

    if (existing) {
      await prisma.formatSample.update({
        where: { id: existing.id },
        data: {
          name: `${folder} Bank Opinion Format`,
          textContent: text,
          filePath,
          fileName,
          fileSize,
          isActive: true,
        },
      });
      console.log(`  UPDATE ${folder} ← ${fileName} (${Math.round(fileSize / 1024)}KB, ${text.length} chars)`);
    } else {
      await prisma.formatSample.create({
        data: {
          name: `${folder} Bank Opinion Format`,
          category: CATEGORY,
          subcategory: folder,
          description: `Reference bank legal opinion in ${folder} house style`,
          textContent: text,
          filePath,
          fileName,
          fileSize,
          isActive: true,
          organizationId: org.id,
        },
      });
      console.log(`  CREATE ${folder} ← ${fileName} (${Math.round(fileSize / 1024)}KB, ${text.length} chars)`);
    }
    imported++;
  }

  console.log(`\nDone. Imported/updated: ${imported}  Skipped: ${skipped}`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
