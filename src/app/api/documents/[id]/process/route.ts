import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-utils";

export const maxDuration = 60;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await withAuth("documents:upload");
  if (error) return error;

  const { id } = await params;

  try {
    const { processDocument } = await import("@/lib/rag/pipeline");
    const result = await processDocument(id);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
