import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-utils";
import { extractStructuredContent } from "@/lib/docx-extract";
import { processFormatSample } from "@/lib/rag/format-pipeline";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

const UPLOAD_DIR = join(process.cwd(), "uploads", "format-samples");

export async function GET(request: NextRequest) {
  const { error } = await withAuth("notices:read");
  if (error) return error;

  const searchParams = request.nextUrl.searchParams;
  const category = searchParams.get("category");
  const activeOnly = searchParams.get("active") !== "false";

  const where: any = {};
  if (category) where.category = category;
  if (activeOnly) where.isActive = true;

  const samples = await prisma.formatSample.findMany({
    where,
    orderBy: { category: "asc" },
  });

  return NextResponse.json(samples);
}

export async function POST(request: NextRequest) {
  const { error } = await withAuth("settings:write");
  if (error) return error;

  const formData = await request.formData();
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

  // Save file to disk
  if (!existsSync(UPLOAD_DIR)) {
    mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  const uniqueName = `${Date.now()}-${fileName}`;
  const filePath = join(UPLOAD_DIR, uniqueName);
  const buffer = Buffer.from(await file.arrayBuffer());
  writeFileSync(filePath, buffer);

  // Extract structured content (markdown for DOCX, text for PDF/DOC)
  let textContent = "";
  let contentFormat: "markdown" | "text" = "text";
  try {
    const extracted = await extractStructuredContent(filePath, fileName);
    textContent = extracted.text;
    contentFormat = extracted.format;
  } catch {
    textContent = "[Text extraction failed - file stored for reference]";
  }

  const sample = await prisma.formatSample.create({
    data: {
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
  if (textContent && !textContent.startsWith("[Text extraction failed")) {
    processFormatSample(sample.id).catch((err) => {
      console.error(`Failed to index format sample ${sample.id}:`, err);
    });
  }

  return NextResponse.json(
    { ...sample, contentFormat },
    { status: 201 }
  );
}
