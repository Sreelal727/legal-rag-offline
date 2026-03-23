import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-utils";
import { processFormatSample } from "@/lib/rag/format-pipeline";
import { existsSync, writeFileSync, mkdirSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

export const maxDuration = 60;

/**
 * POST /api/format-library/reextract
 * Re-extracts text from all format samples that have failed extraction.
 * Then re-indexes them into ChromaDB.
 */
export async function POST() {
  const { error } = await withAuth("settings:write");
  if (error) return error;

  try {
    // Find all samples with failed or empty text extraction
    const samples = await prisma.formatSample.findMany({
      where: {
        isActive: true,
      },
      select: { id: true, name: true, fileName: true, filePath: true, textContent: true, fileData: true },
    });

    const results = [];

    for (const sample of samples) {
      const needsReextract =
        !sample.textContent ||
        sample.textContent.startsWith("[Text extraction failed") ||
        sample.textContent.length < 50;

      if (!needsReextract) {
        results.push({ id: sample.id, name: sample.name, status: "skipped", reason: "already extracted" });
        continue;
      }

      // Restore file from database if not on disk
      let extractPath = sample.filePath;
      let tempFile = false;
      if (!existsSync(sample.filePath)) {
        if (!sample.fileData) {
          results.push({ id: sample.id, name: sample.name, status: "failed", reason: "file not found on disk and no stored data" });
          continue;
        }
        const tmpDir = join(tmpdir(), "format-samples");
        if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });
        extractPath = join(tmpDir, `reextract-${sample.id}-${sample.fileName}`);
        writeFileSync(extractPath, Buffer.from(sample.fileData, "base64"));
        tempFile = true;
      }

      try {
        const { extractStructuredContent } = await import("@/lib/docx-extract");
        const extracted = await extractStructuredContent(extractPath, sample.fileName);

        // Update text content in database
        await prisma.formatSample.update({
          where: { id: sample.id },
          data: { textContent: extracted.text },
        });

        // Index into ChromaDB
        let chunks = 0;
        try {
          const indexResult = await processFormatSample(sample.id);
          chunks = indexResult.chunks;
        } catch (indexErr: any) {
          console.error(`Failed to index ${sample.name}:`, indexErr.message);
        }

        results.push({
          id: sample.id,
          name: sample.name,
          status: "success",
          textLength: extracted.text.length,
          format: extracted.format,
          chunks,
        });
      } catch (err: any) {
        results.push({ id: sample.id, name: sample.name, status: "failed", reason: err.message });
      } finally {
        if (tempFile) {
          try { unlinkSync(extractPath); } catch {}
        }
      }
    }

    const fixed = results.filter((r) => r.status === "success").length;
    const failed = results.filter((r) => r.status === "failed").length;

    return NextResponse.json({
      success: true,
      message: `Re-extracted ${fixed} format samples (${failed} failed)`,
      results,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: `Re-extract failed: ${err.message}` },
      { status: 500 }
    );
  }
}
