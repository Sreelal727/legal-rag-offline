import { chatCompletion } from "@/lib/llm";
import type { ClassificationResult, DocumentType } from "./types";
import { DOCUMENT_TYPES } from "./types";

const BATCH_SIZE = 5;

const CLASSIFICATION_PROMPT = `You are a legal document classifier specializing in Indian property documents (Kerala/South India).
Classify each document into one of these types:
${DOCUMENT_TYPES.filter((t) => t !== "UNKNOWN").join(", ")}

For each document, return:
- documentType: the type from the list above
- confidence: 0.0 to 1.0
- language: "en" (English), "ml" (Malayalam), or "mixed"
- reasoning: brief explanation

IMPORTANT:
- "SALE_DEED" includes Aadharam/aadharam (title deed in Kerala)
- "PATTAYAM" is a government land grant
- "ENCUMBRANCE_CERTIFICATE" may be abbreviated as EC
- "TAX_RECEIPT" includes property tax, land tax, building tax receipts
- Use "OTHER" for documents that don't fit any category
- Malayalam documents will have Malayalam script characters

Return a JSON array of objects. One object per document. No markdown formatting.`;

export async function classifyDocuments(
  documents: { id: string; text: string }[]
): Promise<Map<string, ClassificationResult>> {
  const results = new Map<string, ClassificationResult>();

  // Process in batches
  for (let i = 0; i < documents.length; i += BATCH_SIZE) {
    const batch = documents.slice(i, i + BATCH_SIZE);

    const docsText = batch
      .map((doc, idx) => {
        const preview = doc.text.substring(0, 500).trim();
        return `--- DOCUMENT ${idx + 1} (ID: ${doc.id}) ---\n${preview}`;
      })
      .join("\n\n");

    try {
      const response = await chatCompletion([
        { role: "system", content: CLASSIFICATION_PROMPT },
        {
          role: "user",
          content: `Classify these ${batch.length} documents. Return a JSON array.\n\n${docsText}`,
        },
      ]);

      const parsed = parseJsonResponse(response as string);

      if (Array.isArray(parsed)) {
        for (let j = 0; j < batch.length && j < parsed.length; j++) {
          const classification = parsed[j];
          const docType = DOCUMENT_TYPES.includes(classification.documentType as DocumentType)
            ? (classification.documentType as DocumentType)
            : "UNKNOWN";

          results.set(batch[j].id, {
            documentType: docType,
            confidence: Math.min(1, Math.max(0, classification.confidence || 0.5)),
            language: (["en", "ml", "mixed"].includes(classification.language) ? classification.language : "en") as "en" | "ml" | "mixed",
            reasoning: classification.reasoning || "",
          });
        }
      }
    } catch (err) {
      console.error(`Classification batch failed:`, err);
      // Fall back to UNKNOWN for failed batch
      for (const doc of batch) {
        results.set(doc.id, {
          documentType: "UNKNOWN",
          confidence: 0,
          language: "en",
          reasoning: "Classification failed",
        });
      }
    }
  }

  return results;
}

function parseJsonResponse(response: string): any {
  // Try direct parse first
  try {
    return JSON.parse(response);
  } catch {
    // Try to extract JSON from markdown code blocks
    const match = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      return JSON.parse(match[1].trim());
    }
    // Try to find array in the response
    const arrayMatch = response.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      return JSON.parse(arrayMatch[0]);
    }
    throw new Error("Could not parse JSON from LLM response");
  }
}
