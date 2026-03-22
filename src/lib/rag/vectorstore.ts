import { ChromaClient, Collection } from "chromadb";

let client: ChromaClient | null = null;
let collection: Collection | null = null;
let formatCollection: Collection | null = null;
let chromaAvailable: boolean | null = null;

const COLLECTION_NAME = "legal_documents";
const FORMAT_COLLECTION_NAME = "legal_formats";

async function isChromaAvailable(): Promise<boolean> {
  if (chromaAvailable !== null) return chromaAvailable;
  try {
    const c = new ChromaClient({ path: process.env.CHROMA_PATH || "./chroma-data" });
    await c.heartbeat();
    chromaAvailable = true;
  } catch {
    console.warn("[ChromaDB] Not available — RAG features will be disabled. Start ChromaDB to enable semantic search.");
    chromaAvailable = false;
  }
  return chromaAvailable;
}

export async function getChromaClient() {
  if (!await isChromaAvailable()) return null;
  if (!client) {
    client = new ChromaClient({ path: process.env.CHROMA_PATH || "./chroma-data" });
  }
  return client;
}

// ─── Case Documents Collection ───

export async function getCollection() {
  if (!await isChromaAvailable()) return null;
  if (!collection) {
    const chromaClient = await getChromaClient();
    if (!chromaClient) return null;
    collection = await chromaClient.getOrCreateCollection({
      name: COLLECTION_NAME,
      metadata: { "hnsw:space": "cosine" },
    });
  }
  return collection;
}

export async function addDocuments(
  ids: string[],
  embeddings: number[][],
  documents: string[],
  metadatas: Record<string, string>[]
) {
  const col = await getCollection();
  if (!col) return;
  await col.add({ ids, embeddings, documents, metadatas });
}

export async function searchDocuments(
  queryEmbedding: number[],
  nResults: number = 10,
  filter?: Record<string, string>
) {
  const col = await getCollection();
  if (!col) return { ids: [[]], documents: [[]], metadatas: [[]], distances: [[]] };
  const results = await col.query({
    queryEmbeddings: [queryEmbedding],
    nResults,
    where: filter,
  });
  return results;
}

export async function deleteDocumentChunks(documentId: string) {
  const col = await getCollection();
  if (!col) return;
  await col.delete({ where: { documentId } });
}

// ─── Format Library Collection ───

export async function getFormatCollection() {
  if (!await isChromaAvailable()) return null;
  if (!formatCollection) {
    const chromaClient = await getChromaClient();
    if (!chromaClient) return null;
    formatCollection = await chromaClient.getOrCreateCollection({
      name: FORMAT_COLLECTION_NAME,
      metadata: { "hnsw:space": "cosine" },
    });
  }
  return formatCollection;
}

export async function addFormatDocuments(
  ids: string[],
  embeddings: number[][],
  documents: string[],
  metadatas: Record<string, string>[]
) {
  const col = await getFormatCollection();
  if (!col) return;
  await col.add({ ids, embeddings, documents, metadatas });
}

export async function searchFormatDocuments(
  queryEmbedding: number[],
  nResults: number = 5,
  filter?: Record<string, string>
) {
  const col = await getFormatCollection();
  if (!col) return { ids: [[]], documents: [[]], metadatas: [[]], distances: [[]] };
  const results = await col.query({
    queryEmbeddings: [queryEmbedding],
    nResults,
    where: filter,
  });
  return results;
}

export async function deleteFormatChunks(formatSampleId: string) {
  const col = await getFormatCollection();
  if (!col) return;
  await col.delete({ where: { formatSampleId } });
}
