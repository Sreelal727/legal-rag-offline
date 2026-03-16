import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-utils";
import { extractHtmlFromDocx } from "@/lib/docx-extract";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
  TabStopPosition,
  TabStopType,
} from "docx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface FormatStructure {
  headerLines: string[];
  bodyStyle: {
    hasNumberedParagraphs: boolean;
    hasTables: boolean;
    hasSignatureBlock: boolean;
    signatureLines: string[];
    headerText: string;
    footerText: string;
  };
}

/**
 * Analyze the format sample text to understand its structure
 */
function analyzeFormat(text: string): FormatStructure {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // First few lines are usually header (court name, case number, parties)
  const headerLines: string[] = [];
  let headerEnd = 0;
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    if (lines[i].length < 120) {
      headerLines.push(lines[i]);
      headerEnd = i + 1;
    } else {
      break;
    }
  }

  // Check for numbered paragraphs (1. 2. 3. or i. ii. iii.)
  const hasNumberedParagraphs = lines.some((l) => /^\d+[\.\)]\s/.test(l));

  // Check for table-like structures
  const hasTables = lines.some((l) => l.includes("\t") && l.split("\t").length >= 3);

  // Check for signature block at the end
  const lastLines = lines.slice(-8);
  const hasSignatureBlock = lastLines.some((l) =>
    /advocate|counsel|petitioner|respondent|deponent|verification|sd\/-|signature/i.test(l)
  );

  const signatureLines = hasSignatureBlock
    ? lastLines.filter((l) =>
        /advocate|counsel|petitioner|respondent|deponent|place|date|sd\/-|signature|sworn|verified/i.test(l)
      )
    : [];

  return {
    headerLines,
    bodyStyle: {
      hasNumberedParagraphs,
      hasTables,
      hasSignatureBlock,
      signatureLines,
      headerText: headerLines.slice(0, 3).join(" | "),
      footerText: "",
    },
  };
}

/**
 * Build DOCX paragraphs from AI content following format structure
 */
function buildFormattedDocx(content: string, structure: FormatStructure): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const lines = content.split("\n");

  // Track if we're in the header section
  let lineIndex = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      paragraphs.push(new Paragraph({ text: "" }));
      lineIndex++;
      continue;
    }

    // Strip markdown
    const cleanText = trimmed
      .replace(/^#+\s/, "")
      .replace(/\*\*/g, "")
      .replace(/\*/g, "");

    // First few lines — treat as centered header (court name, case info)
    if (lineIndex < structure.headerLines.length && lineIndex < 8) {
      const isCourt = /court|hon'ble|bench|jurisdiction/i.test(cleanText);
      const isCaseNumber = /case|no\.|o\.?s|w\.?p|crl|cmp|appeal|petition|suit/i.test(cleanText);

      paragraphs.push(new Paragraph({
        children: [new TextRun({
          text: cleanText,
          bold: isCourt || isCaseNumber || lineIndex < 3,
          font: "Times New Roman",
          size: isCourt ? 28 : 24,
          allCaps: isCourt,
        })],
        alignment: AlignmentType.CENTER,
        spacing: { before: lineIndex === 0 ? 0 : 80, after: 80 },
      }));
    }
    // Numbered paragraphs
    else if (/^\d+[\.\)]\s/.test(trimmed)) {
      const text = trimmed.replace(/^\d+[\.\)]\s/, "");
      const num = trimmed.match(/^(\d+)[\.\)]/)?.[1] || "";
      paragraphs.push(new Paragraph({
        children: [
          new TextRun({ text: `${num}. `, bold: true, font: "Times New Roman", size: 24 }),
          ...createRuns(text),
        ],
        spacing: { before: 120, after: 80 },
        alignment: AlignmentType.JUSTIFIED,
        indent: { left: 360 },
      }));
    }
    // Bullet points
    else if (/^[-•*]\s/.test(trimmed)) {
      paragraphs.push(new Paragraph({
        children: createRuns(trimmed.replace(/^[-•*]\s/, "")),
        bullet: { level: 0 },
        spacing: { before: 60, after: 60 },
      }));
    }
    // Headings (markdown or ALL CAPS short lines)
    else if (trimmed.startsWith("#") || (cleanText === cleanText.toUpperCase() && cleanText.length < 60 && cleanText.length > 3)) {
      paragraphs.push(new Paragraph({
        children: [new TextRun({
          text: cleanText,
          bold: true,
          font: "Times New Roman",
          size: 26,
          underline: {},
        })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 120 },
      }));
    }
    // Signature / verification block
    else if (/advocate|counsel|petitioner|respondent|deponent|place|date|sd\/-|signature|sworn|verified/i.test(cleanText) && lineIndex > lines.length - 15) {
      paragraphs.push(new Paragraph({
        children: [new TextRun({
          text: cleanText,
          font: "Times New Roman",
          size: 24,
        })],
        alignment: /sd\/-|signature|advocate|counsel/i.test(cleanText) ? AlignmentType.RIGHT : AlignmentType.LEFT,
        spacing: { before: 80, after: 40 },
      }));
    }
    // Regular paragraph
    else {
      paragraphs.push(new Paragraph({
        children: createRuns(cleanText),
        spacing: { before: 80, after: 80 },
        alignment: AlignmentType.JUSTIFIED,
      }));
    }

    lineIndex++;
  }

  return paragraphs;
}

function createRuns(text: string): TextRun[] {
  const runs: TextRun[] = [];
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);

  for (const part of parts) {
    if (part.startsWith("**") && part.endsWith("**")) {
      runs.push(new TextRun({ text: part.slice(2, -2), bold: true, font: "Times New Roman", size: 24 }));
    } else if (part.startsWith("*") && part.endsWith("*")) {
      runs.push(new TextRun({ text: part.slice(1, -1), italics: true, font: "Times New Roman", size: 24 }));
    } else if (part) {
      runs.push(new TextRun({ text: part, font: "Times New Roman", size: 24 }));
    }
  }

  return runs.length > 0 ? runs : [new TextRun({ text, font: "Times New Roman", size: 24 })];
}

/**
 * Build plain DOCX without format sample
 */
function buildPlainDocx(content: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      paragraphs.push(new Paragraph({ text: "" }));
      continue;
    }

    if (trimmed.startsWith("### ")) {
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: trimmed.slice(4), bold: true, font: "Times New Roman", size: 26 })],
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 100 },
      }));
    } else if (trimmed.startsWith("## ")) {
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: trimmed.slice(3), bold: true, font: "Times New Roman", size: 28 })],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
      }));
    } else if (trimmed.startsWith("# ")) {
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: trimmed.slice(2), bold: true, font: "Times New Roman", size: 32 })],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 280, after: 140 },
      }));
    } else if (/^[-•*]\s/.test(trimmed)) {
      paragraphs.push(new Paragraph({
        children: createRuns(trimmed.replace(/^[-•*]\s/, "")),
        bullet: { level: 0 },
        spacing: { before: 60, after: 60 },
      }));
    } else {
      paragraphs.push(new Paragraph({
        children: createRuns(trimmed),
        spacing: { before: 80, after: 80 },
        alignment: AlignmentType.JUSTIFIED,
      }));
    }
  }

  return paragraphs;
}

/**
 * Generate PDF following format sample structure
 */
function buildFormattedPdf(content: string, structure: FormatStructure): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - 2 * margin;
  let y = 25;

  const lines = content.split("\n");
  let lineIndex = 0;

  doc.setFont("times", "normal");

  for (const line of lines) {
    const trimmed = line.trim()
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/^#+\s/, "");

    if (!trimmed) {
      y += 5;
      lineIndex++;
      continue;
    }

    // New page check
    if (y > pageHeight - 25) {
      doc.addPage();
      y = 25;
    }

    // Header lines — centered, bold
    if (lineIndex < structure.headerLines.length && lineIndex < 8) {
      const isCourt = /court|hon'ble|bench|jurisdiction/i.test(trimmed);
      doc.setFont("times", "bold");
      doc.setFontSize(isCourt ? 14 : 12);
      doc.text(trimmed, pageWidth / 2, y, { align: "center" });
      y += isCourt ? 8 : 6;
    }
    // ALL CAPS headings
    else if (trimmed === trimmed.toUpperCase() && trimmed.length < 60 && trimmed.length > 3) {
      doc.setFont("times", "bold");
      doc.setFontSize(13);
      doc.text(trimmed, pageWidth / 2, y, { align: "center" });
      y += 8;
    }
    // Numbered paragraphs
    else if (/^\d+[\.\)]\s/.test(trimmed)) {
      doc.setFont("times", "normal");
      doc.setFontSize(12);
      const wrapped = doc.splitTextToSize(trimmed, maxWidth - 10);
      for (const wl of wrapped) {
        if (y > pageHeight - 25) { doc.addPage(); y = 25; }
        doc.text(wl, margin + 5, y);
        y += 6;
      }
      y += 2;
    }
    // Signature block
    else if (/advocate|counsel|sd\/-|signature/i.test(trimmed) && lineIndex > lines.length - 15) {
      doc.setFont("times", "normal");
      doc.setFontSize(12);
      doc.text(trimmed, pageWidth - margin, y, { align: "right" });
      y += 6;
    }
    // Regular paragraph
    else {
      doc.setFont("times", "normal");
      doc.setFontSize(12);
      const wrapped = doc.splitTextToSize(trimmed, maxWidth);
      for (const wl of wrapped) {
        if (y > pageHeight - 25) { doc.addPage(); y = 25; }
        doc.text(wl, margin, y);
        y += 6;
      }
      y += 2;
    }

    lineIndex++;
  }

  return doc;
}

export async function POST(request: NextRequest) {
  const { error } = await withAuth("chat:use");
  if (error) return error;

  const { content, format: exportFormat, formatSampleId } = await request.json();

  if (!content || !exportFormat) {
    return NextResponse.json({ error: "Content and format are required" }, { status: 400 });
  }

  // Fetch format sample if provided
  let structure: FormatStructure | null = null;
  if (formatSampleId) {
    try {
      const sample = await prisma.formatSample.findUnique({
        where: { id: formatSampleId },
        select: { textContent: true, name: true },
      });
      if (sample) {
        structure = analyzeFormat(sample.textContent);
      }
    } catch (err) {
      console.error("Failed to fetch format sample:", err);
    }
  }

  if (exportFormat === "docx") {
    const children = structure
      ? buildFormattedDocx(content, structure)
      : buildPlainDocx(content);

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

    const buffer = await Packer.toBuffer(doc);
    const uint8 = new Uint8Array(buffer);

    return new NextResponse(uint8, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="legal-document.docx"`,
      },
    });
  }

  if (exportFormat === "pdf") {
    const doc = structure
      ? buildFormattedPdf(content, structure)
      : (() => {
          const pdf = new jsPDF();
          const pageWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();
          const margin = 20;
          let y = 25;
          const plainText = content.replace(/\*\*/g, "").replace(/\*/g, "").replace(/^#+\s/gm, "");
          pdf.setFont("times", "normal");
          pdf.setFontSize(12);
          for (const line of plainText.split("\n")) {
            const trimmed = line.trim();
            if (!trimmed) { y += 5; continue; }
            const wrapped = pdf.splitTextToSize(trimmed, pageWidth - 2 * margin);
            for (const wl of wrapped) {
              if (y > pageHeight - 25) { pdf.addPage(); y = 25; }
              pdf.text(wl, margin, y);
              y += 6;
            }
            y += 2;
          }
          return pdf;
        })();

    const pdfUint8 = new Uint8Array(doc.output("arraybuffer"));

    return new NextResponse(pdfUint8, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="legal-document.pdf"`,
      },
    });
  }

  return NextResponse.json({ error: "Invalid format. Use 'docx' or 'pdf'" }, { status: 400 });
}
