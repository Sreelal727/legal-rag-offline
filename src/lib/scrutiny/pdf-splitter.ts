import { chatCompletion } from "@/lib/llm";

interface PageInfo {
  pageNumber: number;
  text: string;
}

interface DocumentSegment {
  startPage: number;
  endPage: number;
  documentType: string;
  text: string;
}

const SPLIT_PROMPT = `You are analyzing pages from a bundle of property documents submitted to a bank.
Your job is to identify where one document ends and another begins.

Each page has a page number and its text content (first and last 200 characters).
Group consecutive pages that belong to the same document.

Return a JSON array where each element represents a distinct document:
[
  { "startPage": 1, "endPage": 3, "documentType": "brief description" },
  { "startPage": 4, "endPage": 4, "documentType": "brief description" },
  ...
]

Look for:
- Headers/titles that indicate a new document (SALE DEED, ENCUMBRANCE CERTIFICATE, TAX RECEIPT, etc.)
- Changes in formatting, language, or document style
- Registration numbers or official stamps indicating document boundaries
- Page "1 of N" or "Page 1" patterns indicating a new document start

Return ONLY valid JSON, no markdown.`;

export async function splitBundlePdf(pages: PageInfo[]): Promise<DocumentSegment[]> {
  if (pages.length <= 1) {
    return [{
      startPage: 1,
      endPage: 1,
      documentType: "single page document",
      text: pages[0]?.text || "",
    }];
  }

  // Prepare condensed page info for LLM
  const PAGES_PER_BATCH = 20;
  const allSegments: DocumentSegment[] = [];

  for (let i = 0; i < pages.length; i += PAGES_PER_BATCH) {
    const batch = pages.slice(i, i + PAGES_PER_BATCH);

    const pagesSummary = batch.map((p) => {
      const firstChars = p.text.substring(0, 200).trim();
      const lastChars = p.text.length > 400 ? p.text.substring(p.text.length - 200).trim() : "";
      return `--- PAGE ${p.pageNumber} ---\nSTART: ${firstChars}\n${lastChars ? `END: ${lastChars}` : ""}`;
    }).join("\n\n");

    try {
      const response = await chatCompletion([
        { role: "system", content: SPLIT_PROMPT },
        {
          role: "user",
          content: `Identify document boundaries in these ${batch.length} pages:\n\n${pagesSummary}`,
        },
      ]);

      const parsed = parseJsonResponse(response as string);
      if (Array.isArray(parsed)) {
        for (const seg of parsed) {
          const startPage = seg.startPage;
          const endPage = seg.endPage;
          // Collect full text for this segment
          const segmentPages = pages.filter(
            (p) => p.pageNumber >= startPage && p.pageNumber <= endPage
          );
          allSegments.push({
            startPage,
            endPage,
            documentType: seg.documentType || "unknown",
            text: segmentPages.map((p) => p.text).join("\n\n"),
          });
        }
      }
    } catch (err) {
      console.error("PDF split failed for batch:", err);
      // Fall back: treat entire batch as one document
      allSegments.push({
        startPage: batch[0].pageNumber,
        endPage: batch[batch.length - 1].pageNumber,
        documentType: "unsplit batch",
        text: batch.map((p) => p.text).join("\n\n"),
      });
    }
  }

  return allSegments.length > 0 ? allSegments : [{
    startPage: 1,
    endPage: pages.length,
    documentType: "full bundle",
    text: pages.map((p) => p.text).join("\n\n"),
  }];
}

function parseJsonResponse(response: string): any {
  try {
    return JSON.parse(response);
  } catch {
    const match = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) return JSON.parse(match[1].trim());
    const arrayMatch = response.match(/\[[\s\S]*\]/);
    if (arrayMatch) return JSON.parse(arrayMatch[0]);
    throw new Error("Could not parse JSON from LLM response");
  }
}
