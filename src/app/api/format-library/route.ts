import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, getOrgId } from "@/lib/api-utils";
// NOTE: Do NOT import format-pipeline at top level — it pulls in chromadb +
// @xenova/transformers which crash on Vercel serverless. Use dynamic import.
import { writeFileSync, mkdirSync, existsSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// Increase timeout for file processing on Vercel (default 10s is too short)
export const maxDuration = 60;

// Use /tmp on serverless (Vercel), fallback to project dir locally
const UPLOAD_DIR = process.env.VERCEL
  ? join(tmpdir(), "format-samples")
  : join(process.cwd(), "uploads", "format-samples");

export async function GET(request: NextRequest) {
  const { error, session } = await withAuth("notices:read");
  if (error) return error;

  const searchParams = request.nextUrl.searchParams;
  const category = searchParams.get("category");
  const activeOnly = searchParams.get("active") !== "false";

  const where: any = { organizationId: getOrgId(session!) };
  if (category) where.category = category;
  if (activeOnly) where.isActive = true;

  const samples = await prisma.formatSample.findMany({
    where,
    orderBy: { category: "asc" },
    select: {
      id: true,
      name: true,
      category: true,
      subcategory: true,
      description: true,
      textContent: true,
      filePath: true,
      fileName: true,
      fileSize: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(samples);
}

export async function POST(request: NextRequest) {
  try {
    const { error, session } = await withAuth("settings:write");
    if (error) return error;

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (e: any) {
      console.error("FormData parse error:", e);
      return NextResponse.json(
        { error: "Failed to parse upload. File may be too large (max ~4.5MB)." },
        { status: 413 }
      );
    }

    const file = formData.get("file") as File;
    const name = formData.get("name") as string;
    const category = formData.get("category") as string;
    const subcategory = formData.get("subcategory") as string | null;
    const description = formData.get("description") as string | null;

    if (!file || !name || !category) {
      return NextResponse.json({ error: "File, name, and category are required" }, { status: 400 });
    }

    const fileName = file.name;
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (!ext || !["doc", "docx", "pdf"].includes(ext)) {
      return NextResponse.json({ error: "Only .doc, .docx, and .pdf files are supported" }, { status: 400 });
    }

    // Read file into buffer
    let buffer: Buffer;
    try {
      buffer = Buffer.from(await file.arrayBuffer());
    } catch (e: any) {
      console.error("File read error:", e);
      return NextResponse.json({ error: "Failed to read uploaded file" }, { status: 500 });
    }

    // Save file to temp disk for extraction
    let filePath = "";
    try {
      if (!existsSync(UPLOAD_DIR)) {
        mkdirSync(UPLOAD_DIR, { recursive: true });
      }
      const uniqueName = `${Date.now()}-${fileName}`;
      filePath = join(UPLOAD_DIR, uniqueName);
      writeFileSync(filePath, buffer);
    } catch (e: any) {
      console.error("File write error:", e);
      // Even if temp write fails, we can still store in DB without extraction
      filePath = `virtual://${Date.now()}-${fileName}`;
    }

    // Extract structured content (markdown for DOCX, text for PDF/DOC)
    // Lazy-import to avoid module-level crashes on Vercel
    let textContent = "";
    let contentFormat: "markdown" | "text" = "text";
    try {
      const { extractStructuredContent } = await import("@/lib/docx-extract");
      const extracted = await extractStructuredContent(filePath, fileName);
      textContent = extracted.text;
      contentFormat = extracted.format;
    } catch (e: any) {
      console.error("Extraction error:", e?.message || e);
      textContent = "[Text extraction failed - file stored for reference]";
    }

    // Clean up temp file on serverless (file is ephemeral anyway)
    if (process.env.VERCEL && filePath && !filePath.startsWith("virtual://")) {
      try { unlinkSync(filePath); } catch {}
    }

    const sample = await prisma.formatSample.create({
      data: {
        organizationId: getOrgId(session!),
        name,
        category,
        subcategory: subcategory || null,
        description: description || null,
        textContent,
        filePath,
        fileName,
        fileSize: buffer.length,
      },
    });

    // Index format sample into ChromaDB for semantic search (non-blocking)
    // Dynamic import to avoid loading chromadb/@xenova/transformers at module level
    if (textContent && !textContent.startsWith("[Text extraction failed")) {
      import("@/lib/rag/format-pipeline")
        .then(({ processFormatSample }) => processFormatSample(sample.id))
        .catch((err) => {
          console.error(`Failed to index format sample ${sample.id}:`, err);
        });
    }

    return NextResponse.json(
      { ...sample, contentFormat },
      { status: 201 }
    );
  } catch (e: any) {
    console.error("Upload handler error:", e);
    return NextResponse.json(
      { error: e?.message || "Internal server error during upload" },
      { status: 500 }
    );
  }
}
