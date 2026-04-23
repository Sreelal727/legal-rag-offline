/**
 * Pilot harness for @opendataloader/pdf — compares its structured extraction
 * against the current pdf-parse baseline so you can decide whether to wire it
 * into the Bank Opinion / Scrutiny pipelines.
 *
 * Usage:
 *   npx tsx scripts/try-opendataloader.ts <pdf-path> [<pdf-path> ...]
 *
 * Example:
 *   npx tsx scripts/try-opendataloader.ts \
 *     "/path/to/EC_sample.pdf" \
 *     "/path/to/sale_deed_sample.pdf"
 *
 * Outputs (per PDF) land in `./pilot-output/<basename>/`:
 *   - opendataloader.md          — structured markdown (headings + tables)
 *   - opendataloader.json        — element tree with bounding boxes
 *   - opendataloader.pdf         — annotated PDF (visual debug)
 *   - pdfparse.txt               — current baseline for comparison
 *   - report.md                  — side-by-side summary
 *
 * Requires: Java 11+ (OpenJDK recommended — `brew install openjdk@17`).
 */

import { convert } from "@opendataloader/pdf";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";

const PILOT_DIR = path.resolve(process.cwd(), "pilot-output");

interface ExtractionResult {
  durationMs: number;
  chars: number;
  tableCount: number;
  headingCount: number;
  listCount: number;
  pageCount: number;
}

async function ensureDir(dir: string) {
  await mkdir(dir, { recursive: true });
}

function countMatches(text: string, pattern: RegExp): number {
  return text.match(pattern)?.length ?? 0;
}

async function runOpendataloader(pdfPath: string, outDir: string): Promise<ExtractionResult> {
  const t0 = performance.now();
  // One batched call — each invocation spawns a JVM (~300-500ms cold start),
  // so real integration must also batch files.
  await convert([pdfPath], {
    outputDir: outDir,
    format: ["markdown", "json", "pdf"],
    readingOrder: "xycut",
    tableMethod: "cluster", // better for borderless EC tables
    quiet: true,
  });
  const durationMs = performance.now() - t0;

  const base = path.basename(pdfPath, path.extname(pdfPath));
  const mdPath = path.join(outDir, `${base}.md`);
  const jsonPath = path.join(outDir, `${base}.json`);

  const md = await readFile(mdPath, "utf8").catch(() => "");
  const jsonText = await readFile(jsonPath, "utf8").catch(() => "");

  // Normalize output filenames for the report so callers don't need to
  // know opendataloader's derived-name convention.
  if (md) await writeFile(path.join(outDir, "opendataloader.md"), md);
  if (jsonText) await writeFile(path.join(outDir, "opendataloader.json"), jsonText);

  const parsed = jsonText ? JSON.parse(jsonText) : null;
  const elements = collectElements(parsed);

  return {
    durationMs,
    chars: md.length,
    // Headings — markdown "## " lines *and* element types from JSON.
    headingCount:
      countMatches(md, /^#{1,6} /gm) + elements.filter((e) => /heading/i.test(e.type ?? "")).length,
    tableCount:
      countMatches(md, /^\|.*\|$/gm) > 0
        ? countMatches(md, /^\|\s*---/gm) // number of actual md tables
        : 0,
    listCount: countMatches(md, /^\s*[-*+]\s+/gm) + countMatches(md, /^\s*\d+\.\s+/gm),
    pageCount: parsed?.pages?.length ?? parsed?.pageCount ?? 0,
  };
}

interface Elem { type?: string; children?: Elem[] }
function collectElements(node: unknown): Elem[] {
  const out: Elem[] = [];
  const walk = (n: any) => {
    if (!n || typeof n !== "object") return;
    if (typeof n.type === "string") out.push(n);
    if (Array.isArray(n.children)) n.children.forEach(walk);
    if (Array.isArray(n.pages)) n.pages.forEach(walk);
    if (Array.isArray(n.elements)) n.elements.forEach(walk);
  };
  walk(node);
  return out;
}

async function runPdfParse(pdfPath: string, outDir: string): Promise<ExtractionResult> {
  const t0 = performance.now();
  // pdf-parse v2.x uses a class-based API — the v1 call form `pdf(buffer)` is
  // no longer exported. The app's own src/lib/docx-extract.ts still uses the
  // v1 form; that path is currently broken against the installed v2.4.5.
  const { PDFParse } = (await import("pdf-parse")) as any;
  const buf = await readFile(pdfPath);
  const parser = new PDFParse({ data: buf });
  const parsed = await parser.getText();
  const durationMs = performance.now() - t0;

  const text: string = parsed?.text ?? "";
  await writeFile(path.join(outDir, "pdfparse.txt"), text);

  return {
    durationMs,
    chars: text.length,
    // Flat text — can't detect tables; approximate headings via caps-only lines.
    tableCount: 0,
    headingCount: countMatches(text, /^[A-Z][A-Z\s]{4,}$/gm),
    listCount: countMatches(text, /^\s*\d+[.)]\s+/gm),
    pageCount: parsed?.total ?? parsed?.pages?.length ?? 0,
  };
}

function fmt(ms: number): string {
  return ms < 1000 ? `${ms.toFixed(0)}ms` : `${(ms / 1000).toFixed(2)}s`;
}

async function processPdf(pdfPath: string) {
  const absPath = path.resolve(pdfPath);
  const info = await stat(absPath).catch(() => null);
  if (!info) {
    console.error(`✗ Not found: ${pdfPath}`);
    return;
  }

  const base = path.basename(absPath, path.extname(absPath));
  const outDir = path.join(PILOT_DIR, base);
  await ensureDir(outDir);

  console.log(`\n▸ ${path.basename(absPath)}  (${(info.size / 1024).toFixed(0)} KB)`);

  let odl: ExtractionResult | null = null;
  let pdp: ExtractionResult | null = null;

  try {
    odl = await runOpendataloader(absPath, outDir);
    console.log(
      `  opendataloader:  ${fmt(odl.durationMs)}  ${odl.chars.toLocaleString()} chars  ` +
        `${odl.pageCount}p  ${odl.headingCount} headings  ${odl.tableCount} tables  ${odl.listCount} list items`,
    );
  } catch (e: any) {
    console.error(`  opendataloader:  FAILED — ${e.message}`);
  }

  try {
    pdp = await runPdfParse(absPath, outDir);
    console.log(
      `  pdf-parse:       ${fmt(pdp.durationMs)}  ${pdp.chars.toLocaleString()} chars  ` +
        `${pdp.pageCount}p  ${pdp.headingCount} caps-heads  ${pdp.listCount} list items  0 tables (can't detect)`,
    );
  } catch (e: any) {
    console.error(`  pdf-parse:       FAILED — ${e.message}`);
  }

  // Human-readable side-by-side report.
  const report = [
    `# Extraction comparison — ${path.basename(absPath)}`,
    ``,
    `| Metric | opendataloader | pdf-parse (baseline) |`,
    `|---|---|---|`,
    `| Duration | ${odl ? fmt(odl.durationMs) : "—"} | ${pdp ? fmt(pdp.durationMs) : "—"} |`,
    `| Characters | ${odl?.chars.toLocaleString() ?? "—"} | ${pdp?.chars.toLocaleString() ?? "—"} |`,
    `| Pages | ${odl?.pageCount ?? "—"} | ${pdp?.pageCount ?? "—"} |`,
    `| Headings | ${odl?.headingCount ?? "—"} | ${pdp?.headingCount ?? "—"} (caps heuristic) |`,
    `| Tables | ${odl?.tableCount ?? "—"} | 0 (unsupported) |`,
    `| List items | ${odl?.listCount ?? "—"} | ${pdp?.listCount ?? "—"} |`,
    ``,
    `## What to eyeball`,
    ``,
    `1. **Open \`opendataloader.md\`** — confirm that:`,
    `   - EC tables come out as proper \`|---|\` markdown tables`,
    `   - Deed headings (e.g., "SCHEDULE OF PROPERTY", "WITNESSES") are real \`##\` headings`,
    `   - Paragraph order matches the printed PDF`,
    `2. **Open \`opendataloader.pdf\`** — the annotated PDF shows detected bounding boxes per element. Useful for citations.`,
    `3. **Diff against \`pdfparse.txt\`** — scan for where structure collapsed into prose today.`,
    ``,
    `## Decision signal`,
    ``,
    `- ✅ Tables survive intact + heading hierarchy is right ⇒ wire into \`bank-opinion\` + \`scrutiny\` pipelines.`,
    `- ⚠️  Tables malformed on borderless EC but headings OK ⇒ keep testing with \`tableMethod: "cluster"\` or revisit hybrid mode.`,
    `- ❌ Output barely better than baseline on your real PDFs ⇒ stick with \`pdf-parse\` + prompt tuning, don't add Java dep.`,
    ``,
  ].join("\n");
  await writeFile(path.join(outDir, "report.md"), report);
  console.log(`  → ${path.relative(process.cwd(), outDir)}/`);
}

async function main() {
  const pdfs = process.argv.slice(2);
  if (pdfs.length === 0) {
    console.log(`Usage: npx tsx scripts/try-opendataloader.ts <pdf> [<pdf> ...]

Point it at real Encumbrance Certificates, sale deeds, property tax receipts —
the documents you'd feed into Bank Opinion. Outputs go to ./pilot-output/.
`);
    process.exit(1);
  }

  await ensureDir(PILOT_DIR);
  console.log(`Pilot output: ${PILOT_DIR}`);

  for (const pdf of pdfs) {
    await processPdf(pdf);
  }

  console.log(`\nDone. Review report.md in each subfolder.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
