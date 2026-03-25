import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, getOrgId } from "@/lib/api-utils";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await withAuth("scrutiny:read");
  if (error) return error;

  const organizationId = getOrgId(session!);
  const { id } = await params;
  const body = await request.json();
  const exportFormat = body.format || "docx";

  const report = await prisma.scrutinyReport.findFirst({
    where: { id, organizationId },
  });

  if (!report || !report.reportContent) {
    return NextResponse.json({ error: "No report content to export" }, { status: 400 });
  }

  // Use the existing chat export infrastructure
  // Build a simple export by forwarding to the chat export logic
  const { Document, Packer, Paragraph, TextRun, AlignmentType } = await import("docx");

  if (exportFormat === "docx") {
    const paragraphs = report.reportContent.split("\n").map((line) => {
      const isBold = line.startsWith("**") && line.endsWith("**");
      const isHeading = line.startsWith("# ") || line.startsWith("## ") || line.startsWith("### ");
      const cleanLine = line.replace(/^#+\s*/, "").replace(/\*\*/g, "");

      return new Paragraph({
        children: [
          new TextRun({
            text: cleanLine,
            bold: isBold || isHeading,
            size: isHeading ? 28 : 24,
            font: "Times New Roman",
          }),
        ],
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 120 },
      });
    });

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children: paragraphs,
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    const uint8 = new Uint8Array(buffer);

    return new NextResponse(uint8, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="scrutiny-report-${id}.docx"`,
      },
    });
  }

  if (exportFormat === "pdf") {
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF();
    const lines = pdf.splitTextToSize(report.reportContent, 170);
    let y = 20;

    for (const line of lines) {
      if (y > 270) {
        pdf.addPage();
        y = 20;
      }
      pdf.setFontSize(11);
      pdf.text(line, 20, y);
      y += 6;
    }

    const pdfArrayBuffer = pdf.output("arraybuffer");

    return new NextResponse(pdfArrayBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="scrutiny-report-${id}.pdf"`,
      },
    });
  }

  return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
}
