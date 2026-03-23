import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-utils";
// Do NOT import vectorstore at top level — it pulls in chromadb which crashes on Vercel
import { unlinkSync, existsSync } from "fs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await withAuth("notices:read");
  if (error) return error;

  const { id } = await params;
  const sample = await prisma.formatSample.findUnique({ where: { id } });
  if (!sample) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(sample);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await withAuth("settings:write");
  if (error) return error;

  const { id } = await params;
  const body = await request.json();

  const sample = await prisma.formatSample.update({
    where: { id },
    data: {
      name: body.name,
      category: body.category,
      subcategory: body.subcategory,
      description: body.description,
      isActive: body.isActive,
    },
  });

  return NextResponse.json(sample);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await withAuth("settings:write");
  if (error) return error;

  const { id } = await params;
  const sample = await prisma.formatSample.findUnique({ where: { id } });
  if (!sample) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Delete file from disk (may not exist on serverless)
  try {
    if (sample.filePath && existsSync(sample.filePath)) {
      unlinkSync(sample.filePath);
    }
  } catch {}

  // Remove from ChromaDB format index (dynamic import to avoid crash on Vercel)
  try {
    const { deleteFormatChunks } = await import("@/lib/rag/vectorstore");
    await deleteFormatChunks(id);
  } catch {
    // ChromaDB might not be running or collection might not exist
  }

  await prisma.formatSample.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
