import { prisma } from "@/lib/prisma";
import { chunkText } from "./chunker";
import { generateEmbedding, generateEmbeddings } from "./embeddings";
import { addFormatDocuments, searchFormatDocuments, deleteFormatChunks } from "./vectorstore";
import { v4 as uuid } from "uuid";

/**
 * Process a format sample: chunk its text content and store embeddings in ChromaDB.
 * This enables semantic search to find the most relevant format for a given query.
 */
export async function processFormatSample(formatSampleId: string) {
  const sample = await prisma.formatSample.findUnique({
    where: { id: formatSampleId },
  });

  if (!sample) throw new Error("Format sample not found");
  if (!sample.textContent || sample.textContent.startsWith("[Text extraction failed")) {
    throw new Error("No text content available for this format sample");
  }

  // Remove any existing chunks for this sample (re-index)
  try {
    await deleteFormatChunks(formatSampleId);
  } catch {
    // Collection might not exist yet, that's fine
  }

  // Chunk the text content with smaller chunks for formats (they tend to be shorter & more structured)
  const chunks = chunkText(sample.textContent, 800, 150);

  if (chunks.length === 0) {
    return { chunks: 0, formatSampleId };
  }

  // Generate embeddings for all chunks
  const embeddings = await generateEmbeddings(chunks.map((c) => c.content));

  // Prepare ChromaDB entries
  const chromaIds: string[] = [];
  const chromaDocuments: string[] = [];
  const chromaMetadatas: Record<string, string>[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chromaId = uuid();
    chromaIds.push(chromaId);
    chromaDocuments.push(chunks[i].content);
    chromaMetadatas.push({
      formatSampleId: sample.id,
      formatName: sample.name,
      category: sample.category,
      subcategory: sample.subcategory || "",
      chunkIndex: String(chunks[i].index),
    });
  }

  // Store in ChromaDB "legal_formats" collection
  await addFormatDocuments(chromaIds, embeddings, chromaDocuments, chromaMetadatas);

  return { chunks: chunks.length, formatSampleId };
}

/**
 * Semantic search on the format library.
 * Returns the most relevant format samples for a given query.
 */
export async function searchFormats(query: string, limit: number = 3) {
  const queryEmbedding = await generateEmbedding(query);

  const results = await searchFormatDocuments(queryEmbedding, limit * 2);

  if (!results.documents?.[0] || results.documents[0].length === 0) {
    return [];
  }

  // Group results by formatSampleId and aggregate relevance
  const sampleMap = new Map<
    string,
    {
      formatSampleId: string;
      formatName: string;
      category: string;
      subcategory: string;
      chunks: string[];
      bestDistance: number;
      avgDistance: number;
    }
  >();

  for (let i = 0; i < results.documents[0].length; i++) {
    const meta = results.metadatas?.[0]?.[i] as Record<string, string> | undefined;
    const distance = results.distances?.[0]?.[i] ?? 1;
    const content = results.documents[0][i];
    const sampleId = meta?.formatSampleId || "";

    if (!sampleId) continue;

    if (!sampleMap.has(sampleId)) {
      sampleMap.set(sampleId, {
        formatSampleId: sampleId,
        formatName: meta?.formatName || "",
        category: meta?.category || "",
        subcategory: meta?.subcategory || "",
        chunks: [],
        bestDistance: distance,
        avgDistance: distance,
      });
    }

    const entry = sampleMap.get(sampleId)!;
    entry.chunks.push(content || "");
    entry.bestDistance = Math.min(entry.bestDistance, distance);
    entry.avgDistance = (entry.avgDistance + distance) / 2;
  }

  // Sort by best distance (lower = more relevant) and take top 'limit'
  const sorted = Array.from(sampleMap.values())
    .sort((a, b) => a.bestDistance - b.bestDistance)
    .slice(0, limit);

  return sorted;
}

/**
 * Re-index all existing format samples in the library.
 * Useful for initial setup or rebuilding the index.
 */
export async function reindexAllFormats() {
  const samples = await prisma.formatSample.findMany({
    where: {
      isActive: true,
      textContent: { not: "" },
    },
    select: { id: true, name: true },
  });

  const results = [];
  for (const sample of samples) {
    try {
      const result = await processFormatSample(sample.id);
      results.push({ id: sample.id, name: sample.name, ...result });
    } catch (err: any) {
      results.push({
        id: sample.id,
        name: sample.name,
        error: err.message,
        chunks: 0,
      });
    }
  }

  return results;
}
