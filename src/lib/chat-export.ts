import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
} from "docx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";

/**
 * Parse markdown-like content into structured blocks for export
 */
function parseContent(text: string): { type: string; text: string; level?: number }[] {
  const lines = text.split("\n");
  const blocks: { type: string; text: string; level?: number }[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      blocks.push({ type: "empty", text: "" });
    } else if (trimmed.startsWith("### ")) {
      blocks.push({ type: "heading", text: trimmed.replace(/^### /, ""), level: 3 });
    } else if (trimmed.startsWith("## ")) {
      blocks.push({ type: "heading", text: trimmed.replace(/^## /, ""), level: 2 });
    } else if (trimmed.startsWith("# ")) {
      blocks.push({ type: "heading", text: trimmed.replace(/^# /, ""), level: 1 });
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      blocks.push({ type: "bullet", text: trimmed.replace(/^[-*] /, "") });
    } else if (/^\d+\.\s/.test(trimmed)) {
      blocks.push({ type: "numbered", text: trimmed.replace(/^\d+\.\s/, "") });
    } else {
      blocks.push({ type: "paragraph", text: trimmed });
    }
  }

  return blocks;
}

/**
 * Convert markdown bold/italic to TextRuns for docx
 */
function createTextRuns(text: string, baseFontSize: number = 24): TextRun[] {
  const runs: TextRun[] = [];
  // Split by **bold** and *italic* patterns
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);

  for (const part of parts) {
    if (part.startsWith("**") && part.endsWith("**")) {
      runs.push(new TextRun({
        text: part.slice(2, -2),
        bold: true,
        font: "Times New Roman",
        size: baseFontSize,
      }));
    } else if (part.startsWith("*") && part.endsWith("*")) {
      runs.push(new TextRun({
        text: part.slice(1, -1),
        italics: true,
        font: "Times New Roman",
        size: baseFontSize,
      }));
    } else if (part) {
      runs.push(new TextRun({
        text: part,
        font: "Times New Roman",
        size: baseFontSize,
      }));
    }
  }

  return runs;
}

/**
 * Strip markdown formatting for plain text
 */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^#+\s/gm, "")
    .replace(/^[-*]\s/gm, "• ")
    .replace(/^\d+\.\s/gm, (m) => m);
}

/**
 * Export content as DOCX file
 */
export async function exportAsDocx(content: string, filename: string = "document") {
  const blocks = parseContent(content);
  const children: Paragraph[] = [];

  for (const block of blocks) {
    if (block.type === "empty") {
      children.push(new Paragraph({ text: "" }));
    } else if (block.type === "heading") {
      const level = block.level === 1
        ? HeadingLevel.HEADING_1
        : block.level === 2
          ? HeadingLevel.HEADING_2
          : HeadingLevel.HEADING_3;
      children.push(new Paragraph({
        children: createTextRuns(block.text, block.level === 1 ? 32 : block.level === 2 ? 28 : 26),
        heading: level,
        spacing: { before: 240, after: 120 },
      }));
    } else if (block.type === "bullet") {
      children.push(new Paragraph({
        children: createTextRuns(block.text),
        bullet: { level: 0 },
        spacing: { before: 60, after: 60 },
      }));
    } else if (block.type === "numbered") {
      children.push(new Paragraph({
        children: createTextRuns(block.text),
        spacing: { before: 60, after: 60 },
      }));
    } else {
      children.push(new Paragraph({
        children: createTextRuns(block.text),
        spacing: { before: 80, after: 80 },
        alignment: AlignmentType.JUSTIFIED,
      }));
    }
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${filename}.docx`);
}

/**
 * Export content as PDF file
 */
export function exportAsPdf(content: string, filename: string = "document") {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - 2 * margin;
  let y = 25;

  const plainText = stripMarkdown(content);
  const lines = plainText.split("\n");

  doc.setFont("times", "normal");

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      y += 6;
      continue;
    }

    // Check if it looks like a heading (original markdown stripped, but check for ALL CAPS or short bold lines)
    let fontSize = 12;
    let fontStyle: "normal" | "bold" = "normal";

    if (trimmed === trimmed.toUpperCase() && trimmed.length < 80 && trimmed.length > 3) {
      fontSize = 14;
      fontStyle = "bold";
    }

    doc.setFont("times", fontStyle);
    doc.setFontSize(fontSize);

    const wrappedLines = doc.splitTextToSize(trimmed, maxWidth);

    for (const wLine of wrappedLines) {
      // Check if we need a new page
      if (y > doc.internal.pageSize.getHeight() - 25) {
        doc.addPage();
        y = 25;
      }
      doc.text(wLine, margin, y);
      y += fontSize * 0.5 + 2;
    }

    y += 2;
  }

  doc.save(`${filename}.pdf`);
}
