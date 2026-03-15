import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-utils";
import { semanticSearch } from "@/lib/rag/pipeline";

export async function POST(request: NextRequest) {
  const { error } = await withAuth("documents:read");
  if (error) return error;

  const { query, caseId, limit } = await request.json();

  if (!query) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  try {
    const results = await semanticSearch(query, caseId, limit);
    return NextResponse.json(results);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
