import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-utils";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  VerticalAlign,
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

function analyzeFormat(text: string): FormatStructure {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  const headerLines: string[] = [];
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    if (lines[i].length < 120) {
      headerLines.push(lines[i]);
    } else {
      break;
    }
  }

  const hasNumberedParagraphs = lines.some((l) => /^\d+[\.\)]\s/.test(l));
  const hasTables = lines.some((l) => l.includes("\t") && l.split("\t").length >= 3);
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
    bodyStyle: { hasNumberedParagraphs, hasTables, hasSignatureBlock, signatureLines, headerText: "", footerText: "" },
  };
}

// --- Markdown table parsing ---
interface ParsedTable {
  headers: string[];
  rows: string[][];
}

function parseMarkdownTables(content: string): { segments: Array<{ type: "text" | "table"; content: string; table?: ParsedTable }> } {
  const lines = content.split("\n");
  const segments: Array<{ type: "text" | "table"; content: string; table?: ParsedTable }> = [];
  let i = 0;
  let textBuf: string[] = [];

  while (i < lines.length) {
    const line = lines[i];
    // Detect start of markdown table: line with | ... | followed by |---|
    if (line.trim().startsWith("|") && i + 1 < lines.length && /^\|[\s\-:]+\|/.test(lines[i + 1].trim())) {
      // Flush text buffer
      if (textBuf.length > 0) {
        segments.push({ type: "text", content: textBuf.join("\n") });
        textBuf = [];
      }
      // Parse table
      const headers = line.trim().split("|").filter(Boolean).map((h) => h.trim());
      i += 2; // skip header + separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const cells = lines[i].trim().split("|").filter(Boolean).map((c) => c.trim());
        rows.push(cells);
        i++;
      }
      segments.push({ type: "table", content: "", table: { headers, rows } });
    } else {
      textBuf.push(line);
      i++;
    }
  }
  if (textBuf.length > 0) {
    segments.push({ type: "text", content: textBuf.join("\n") });
  }
  return { segments };
}

// --- DOCX table builder ---
function buildDocxTable(table: ParsedTable): Table {
  const border = { style: BorderStyle.SINGLE, size: 1, color: "000000" };
  const borders = { top: border, bottom: border, left: border, right: border };

  // Calculate column widths based on column count
  const numCols = table.headers.length;
  // Total width for A4 with 1" margins = ~9360 DXA
  const totalWidth = 9360;
  let columnWidths: number[];

  if (numCols === 3) {
    // Sl.No | Particulars | Details pattern
    columnWidths = [900, 3200, 5260];
  } else if (numCols === 2) {
    columnWidths = [3000, 6360];
  } else {
    const each = Math.floor(totalWidth / numCols);
    columnWidths = Array(numCols).fill(each);
  }

  const makeCell = (text: string, width: number, bold = false): TableCell => {
    // Handle multi-line content inside cells (numbered paragraphs etc.)
    const cellParagraphs: Paragraph[] = [];
    const cellLines = text.split(/\\n|<br>|\n/).map(l => l.trim()).filter(Boolean);

    if (cellLines.length === 0) {
      cellParagraphs.push(new Paragraph({
        children: [new TextRun({ text: "", font: "Times New Roman", size: 22 })],
      }));
    } else {
      for (const cl of cellLines) {
        cellParagraphs.push(new Paragraph({
          children: createRuns(cl),
          spacing: { before: 40, after: 40 },
        }));
      }
    }

    return new TableCell({
      borders,
      width: { size: width, type: WidthType.DXA },
      verticalAlign: VerticalAlign.TOP,
      margins: { top: 60, bottom: 60, left: 80, right: 80 },
      children: cellParagraphs,
    });
  };

  // Header row
  const headerRow = new TableRow({
    children: table.headers.map((h, idx) =>
      makeCell(h, columnWidths[idx] || columnWidths[columnWidths.length - 1], true)
    ),
  });

  // Data rows
  const dataRows = table.rows.map((row) =>
    new TableRow({
      children: row.map((cell, idx) =>
        makeCell(cell, columnWidths[idx] || columnWidths[columnWidths.length - 1])
      ),
    })
  );

  return new Table({
    width: { size: totalWidth, type: WidthType.DXA },
    columnWidths,
    rows: [headerRow, ...dataRows],
  });
}

function createRuns(text: string): TextRun[] {
  const runs: TextRun[] = [];
  // Handle **bold** and *italic*
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);

  for (const part of parts) {
    if (part.startsWith("**") && part.endsWith("**")) {
      runs.push(new TextRun({ text: part.slice(2, -2), bold: true, font: "Times New Roman", size: 22 }));
    } else if (part.startsWith("*") && part.endsWith("*")) {
      runs.push(new TextRun({ text: part.slice(1, -1), italics: true, font: "Times New Roman", size: 22 }));
    } else if (part) {
      runs.push(new TextRun({ text: part, font: "Times New Roman", size: 22 }));
    }
  }

  return runs.length > 0 ? runs : [new TextRun({ text, font: "Times New Roman", size: 22 })];
}

function buildDocxFromContent(content: string, structure: FormatStructure | null): (Paragraph | Table)[] {
  const { segments } = parseMarkdownTables(content);
  const elements: (Paragraph | Table)[] = [];

  for (const seg of segments) {
    if (seg.type === "table" && seg.table) {
      elements.push(buildDocxTable(seg.table));
      elements.push(new Paragraph({ text: "" })); // spacing after table
    } else {
      const lines = seg.content.split("\n");
      let lineIndex = 0;
      const headerCount = structure ? structure.headerLines.length : 5;

      for (const line of lines) {
        const trimmed = line.trim();

        if (!trimmed) {
          elements.push(new Paragraph({ text: "" }));
          lineIndex++;
          continue;
        }

        const cleanText = trimmed.replace(/^#+\s/, "").replace(/\*\*/g, "").replace(/\*/g, "");

        // Header lines (first few lines — court name, case number)
        if (structure && lineIndex < headerCount && lineIndex < 8) {
          const isCourt = /court|hon'ble|bench|jurisdiction/i.test(cleanText);
          elements.push(new Paragraph({
            children: [new TextRun({
              text: cleanText,
              bold: isCourt || lineIndex < 3,
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
          elements.push(new Paragraph({
            children: [
              new TextRun({ text: `${num}. `, bold: true, font: "Times New Roman", size: 22 }),
              ...createRuns(text),
            ],
            spacing: { before: 120, after: 80 },
            alignment: AlignmentType.JUSTIFIED,
            indent: { left: 360 },
          }));
        }
        // Bullet points
        else if (/^[-•*]\s/.test(trimmed)) {
          elements.push(new Paragraph({
            children: createRuns(trimmed.replace(/^[-•*]\s/, "")),
            bullet: { level: 0 },
            spacing: { before: 60, after: 60 },
          }));
        }
        // ALL CAPS headings (DECLARATION, PRAYER, etc.)
        else if (cleanText === cleanText.toUpperCase() && cleanText.length > 3 && cleanText.length < 60) {
          elements.push(new Paragraph({
            children: [new TextRun({
              text: cleanText,
              bold: true,
              font: "Times New Roman",
              size: 24,
              underline: {},
            })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 120 },
          }));
        }
        // Signature / verification block
        else if (/advocate|counsel|petitioner|respondent|deponent|place|date|sd\/-|signature|sworn|verified/i.test(cleanText) && lineIndex > lines.length - 15) {
          elements.push(new Paragraph({
            children: [new TextRun({
              text: cleanText,
              font: "Times New Roman",
              size: 22,
            })],
            alignment: /sd\/-|signature|advocate|counsel/i.test(cleanText) ? AlignmentType.RIGHT : AlignmentType.LEFT,
            spacing: { before: 80, after: 40 },
          }));
        }
        // Regular paragraph
        else {
          elements.push(new Paragraph({
            children: createRuns(cleanText),
            spacing: { before: 80, after: 80 },
            alignment: AlignmentType.JUSTIFIED,
          }));
        }

        lineIndex++;
      }
    }
  }

  return elements;
}

function buildPdfFromContent(content: string, structure: FormatStructure | null): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - 2 * margin;
  let y = 25;

  const { segments } = parseMarkdownTables(content);

  for (const seg of segments) {
    if (seg.type === "table" && seg.table) {
      // Use jspdf-autotable for tables
      autoTable(doc, {
        startY: y,
        head: [seg.table.headers],
        body: seg.table.rows,
        margin: { left: margin, right: margin },
        styles: { font: "times", fontSize: 10, cellPadding: 3, lineWidth: 0.3 },
        headStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0], fontStyle: "bold" },
        columnStyles: seg.table.headers.length === 3
          ? { 0: { cellWidth: 15 }, 1: { cellWidth: 55 } }
          : {},
        theme: "grid",
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    } else {
      const lines = seg.content.split("\n");
      let lineIndex = 0;
      const headerCount = structure ? structure.headerLines.length : 5;

      for (const line of lines) {
        const trimmed = line.trim().replace(/\*\*/g, "").replace(/\*/g, "").replace(/^#+\s/, "");

        if (!trimmed) { y += 5; lineIndex++; continue; }
        if (y > pageHeight - 25) { doc.addPage(); y = 25; }

        if (structure && lineIndex < headerCount && lineIndex < 8) {
          const isCourt = /court|hon'ble/i.test(trimmed);
          doc.setFont("times", "bold");
          doc.setFontSize(isCourt ? 14 : 12);
          doc.text(trimmed, pageWidth / 2, y, { align: "center" });
          y += isCourt ? 8 : 6;
        } else if (trimmed === trimmed.toUpperCase() && trimmed.length > 3 && trimmed.length < 60) {
          doc.setFont("times", "bold");
          doc.setFontSize(13);
          doc.text(trimmed, pageWidth / 2, y, { align: "center" });
          y += 8;
        } else if (/^\d+[\.\)]\s/.test(trimmed)) {
          doc.setFont("times", "normal");
          doc.setFontSize(11);
          const wrapped = doc.splitTextToSize(trimmed, maxWidth - 10);
          for (const wl of wrapped) {
            if (y > pageHeight - 25) { doc.addPage(); y = 25; }
            doc.text(wl, margin + 5, y);
            y += 5.5;
          }
          y += 2;
        } else {
          doc.setFont("times", "normal");
          doc.setFontSize(11);
          const wrapped = doc.splitTextToSize(trimmed, maxWidth);
          for (const wl of wrapped) {
            if (y > pageHeight - 25) { doc.addPage(); y = 25; }
            doc.text(wl, margin, y);
            y += 5.5;
          }
          y += 2;
        }

        lineIndex++;
      }
    }
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
        select: { textContent: true },
      });
      if (sample) {
        structure = analyzeFormat(sample.textContent);
      }
    } catch (err) {
      console.error("Failed to fetch format sample:", err);
    }
  }

  if (exportFormat === "docx") {
    const children = buildDocxFromContent(content, structure);

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
    const doc = buildPdfFromContent(content, structure);
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
