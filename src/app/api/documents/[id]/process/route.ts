import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-utils";
import { processDocument } from "@/lib/rag/pipeline";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await withAuth("documents:upload");
  if (error) return error;

  const { id } = await params;

  try {
    const result = await processDocument(id);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
