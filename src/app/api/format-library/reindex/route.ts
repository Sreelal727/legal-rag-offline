import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-utils";
// Dynamic import to avoid loading chromadb/@xenova/transformers at module level

export const maxDuration = 60;

/**
 * POST /api/format-library/reindex
 * Re-indexes all existing format samples into ChromaDB.
 * Useful after initial setup or when the index needs rebuilding.
 */
export async function POST() {
  const { error } = await withAuth("settings:write");
  if (error) return error;

  try {
    const { reindexAllFormats } = await import("@/lib/rag/format-pipeline");
    const results = await reindexAllFormats();
    const totalChunks = results.reduce((sum, r) => sum + (r.chunks || 0), 0);
    const failed = results.filter((r) => "error" in r);

    return NextResponse.json({
      success: true,
      message: `Re-indexed ${results.length} format samples (${totalChunks} total chunks)`,
      indexed: results.length - failed.length,
      failed: failed.length,
      details: results,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: `Re-index failed: ${err.message}` },
      { status: 500 }
    );
  }
}
