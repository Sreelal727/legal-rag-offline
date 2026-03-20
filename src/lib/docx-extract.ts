import mammoth from "mammoth";
import WordExtractor from "word-extractor";
import { readFileSync } from "fs";
import TurndownService from "turndown";

const turndown = new TurndownService({
  headingStyle: "atx",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
});

// Preserve table structure in markdown
turndown.addRule("tableCell", {
  filter: ["th", "td"],
  replacement: (content) => ` ${content.trim()} |`,
});

turndown.addRule("tableRow", {
  filter: "tr",
  replacement: (content) => `|${content}\n`,
});

turndown.addRule("table", {
  filter: "table",
  replacement: (content) => `\n${content}\n`,
});

// Preserve line breaks
turndown.addRule("lineBreak", {
  filter: "br",
  replacement: () => "\n",
});

/**
 * Extract raw text from DOCX (legacy - simple text)
 */
export async function extractTextFromDocx(filePath: string): Promise<string> {
  const buffer = readFileSync(filePath);
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

/**
 * Extract HTML from DOCX
 */
export async function extractHtmlFromDocx(filePath: string): Promise<string> {
  const buffer = readFileSync(filePath);
  const result = await mammoth.convertToHtml({ buffer });
  return result.value;
}

/**
 * Extract structured Markdown from DOCX — preserves headings, lists, tables, bold/italic
 */
export async function extractMarkdownFromDocx(filePath: string): Promise<string> {
  const buffer = readFileSync(filePath);
  const htmlResult = await mammoth.convertToHtml({ buffer });
  const html = htmlResult.value;

  if (!html || html.trim().length === 0) {
    // Fallback to raw text if HTML conversion yields nothing
    const textResult = await mammoth.extractRawText({ buffer });
    return textResult.value;
  }

  const markdown = turndown.turndown(html);

  // Clean up: remove excessive blank lines while keeping structure
  return markdown
    .replace(/\n{4,}/g, "\n\n\n")
    .replace(/^\s+$/gm, "")
    .trim();
}

/**
 * Extract text from old binary .doc format using word-extractor
 */
export async function extractTextFromDoc(filePath: string): Promise<string> {
  const extractor = new WordExtractor();
  const doc = await extractor.extract(filePath);
  const body = doc.getBody();

  if (!body || body.trim().length === 0) {
    throw new Error("No text content found in .doc file");
  }

  // Clean up: normalize whitespace while preserving structure
  return body
    .replace(/\r\n/g, "\n")
    .replace(/\t+/g, "\t")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

/**
 * Extract text from PDF using pdf-parse
 */
export async function extractTextFromPdf(filePath: string): Promise<string> {
  const pdfParse = await import("pdf-parse");
  const pdf = (pdfParse as any).default || pdfParse;
  const buffer = readFileSync(filePath);
  const data = await pdf(buffer);
  return data.text;
}

/**
 * Extract structured content from any supported file type
 * Returns markdown for DOCX, text for PDF/TXT
 */
export async function extractStructuredContent(
  filePath: string,
  fileName: string
): Promise<{ text: string; format: "markdown" | "text" }> {
  const ext = fileName.split(".").pop()?.toLowerCase();

  if (ext === "docx") {
    const markdown = await extractMarkdownFromDocx(filePath);
    return { text: markdown, format: "markdown" };
  }

  if (ext === "doc") {
    // Use word-extractor for old binary .doc format (mammoth only supports .docx)
    try {
      const text = await extractTextFromDoc(filePath);
      return { text, format: "text" };
    } catch {
      // Fallback: try mammoth in case it's actually a .docx with wrong extension
      try {
        const text = await extractTextFromDocx(filePath);
        return { text, format: "text" };
      } catch {
        return { text: "[Text extraction failed for .doc file]", format: "text" };
      }
    }
  }

  if (ext === "pdf") {
    const text = await extractTextFromPdf(filePath);
    return { text, format: "text" };
  }

  // Fallback for any other text-based file
  const buffer = readFileSync(filePath);
  return { text: buffer.toString("utf-8"), format: "text" };
}
