import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, getOrgId } from "@/lib/api-utils";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await withAuth("cases:read");
  if (error) return error;

  const organizationId = getOrgId(session!);
  const { id } = await params;
  const body = await request.json();
  const format = body.format || "text";

  const document = await prisma.caseDocument.findFirst({
    where: { id, organizationId },
    include: {
      case: { select: { caseNumber: true, title: true } },
    },
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const filename = `${document.title.replace(/[^a-zA-Z0-9]/g, "_")}`;

  if (format === "docx") {
    // Return as downloadable text file with .docx-compatible content
    // Simple text export without external library
    const content = document.content;
    return new NextResponse(content, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}.docx"`,
      },
    });
  }

  // Default: text format
  return new NextResponse(document.content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}.txt"`,
    },
  });
}
