import { prisma } from "@/lib/prisma";
import { chunkText } from "./chunker";
import { generateEmbedding, generateEmbeddings } from "./embeddings";
import { addDocuments, searchDocuments, deleteDocumentChunks } from "./vectorstore";
import { v4 as uuid } from "uuid";
import * as mammoth from "mammoth";
import fs from "fs/promises";
import path from "path";

export async function extractText(filePath: string, fileType: string): Promise<string> {
  const absolutePath = path.resolve(filePath);
  const buffer = await fs.readFile(absolutePath);

  if (fileType === "application/pdf" || filePath.endsWith(".pdf")) {
    // pdf-parse v2 API: class-based, not a function
    const { PDFParse } = await import("pdf-parse") as any;
    const result = await new PDFParse({ data: buffer }).getText();
    return result.text;
  }

  if (
    fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    filePath.endsWith(".docx")
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (fileType.startsWith("text/") || filePath.endsWith(".txt")) {
    return buffer.toString("utf-8");
  }

  throw new Error(`Unsupported file type: ${fileType}`);
}

export async function processDocument(documentId: string) {
  const document = await prisma.document.findUnique({ where: { id: documentId } });
  if (!document) throw new Error("Document not found");

  // Extract text
  const text = await extractText(document.filePath, document.fileType);

  // Update document with extracted text
  await prisma.document.update({
    where: { id: documentId },
    data: { extractedText: text },
  });

  // Chunk the text
  const chunks = chunkText(text);

  // Generate embeddings
  const embeddings = await generateEmbeddings(chunks.map((c) => c.content));

  // Store in ChromaDB and SQLite
  const chromaIds: string[] = [];
  const chromaDocuments: string[] = [];
  const chromaMetadatas: Record<string, string>[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chromaId = uuid();
    chromaIds.push(chromaId);
    chromaDocuments.push(chunks[i].content);
    chromaMetadatas.push({
      documentId: document.id,
      documentTitle: document.title,
      chunkIndex: String(chunks[i].index),
      caseId: document.caseId || "",
    });

    // Store chunk metadata in SQLite
    await prisma.documentChunk.create({
      data: {
        documentId: document.id,
        content: chunks[i].content,
        chunkIndex: chunks[i].index,
        metadata: JSON.stringify(chunks[i].metadata),
        chromaId,
      },
    });
  }

  // Add to ChromaDB
  if (chromaIds.length > 0) {
    await addDocuments(chromaIds, embeddings, chromaDocuments, chromaMetadatas);
  }

  // Mark as processed
  await prisma.document.update({
    where: { id: documentId },
    data: { isProcessed: true },
  });

  return { chunks: chunks.length, documentId };
}

export async function semanticSearch(query: string, caseId?: string, limit: number = 10) {
  const queryEmbedding = await generateEmbedding(query);

  const filter = caseId ? { caseId } : undefined;
  const results = await searchDocuments(queryEmbedding, limit, filter);

  if (!results.documents?.[0]) return [];

  return results.documents[0].map((doc, i) => ({
    content: doc,
    metadata: results.metadatas?.[0]?.[i] || {},
    distance: results.distances?.[0]?.[i] || 0,
    id: results.ids?.[0]?.[i] || "",
  }));
}
