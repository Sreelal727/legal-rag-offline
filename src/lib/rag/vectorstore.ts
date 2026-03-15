import { ChromaClient, Collection } from "chromadb";

let client: ChromaClient | null = null;
let collection: Collection | null = null;

const COLLECTION_NAME = "legal_documents";

export async function getChromaClient() {
  if (!client) {
    client = new ChromaClient({ path: process.env.CHROMA_PATH || "./chroma-data" });
  }
  return client;
}

export async function getCollection() {
  if (!collection) {
    const chromaClient = await getChromaClient();
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
  await col.add({ ids, embeddings, documents, metadatas });
}

export async function searchDocuments(
  queryEmbedding: number[],
  nResults: number = 10,
  filter?: Record<string, string>
) {
  const col = await getCollection();
  const results = await col.query({
    queryEmbeddings: [queryEmbedding],
    nResults,
    where: filter,
  });
  return results;
}

export async function deleteDocumentChunks(documentId: string) {
  const col = await getCollection();
  await col.delete({ where: { documentId } });
}
