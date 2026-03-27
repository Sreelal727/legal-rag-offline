import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, getOrgId } from "@/lib/api-utils";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await withAuth("cases:write");
  if (error) return error;

  const organizationId = getOrgId(session!);
  const { id } = await params;

  const existing = await prisma.caseDocument.findFirst({
    where: { id, organizationId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  if (existing.status === "FINALIZED") {
    return NextResponse.json({ error: "Document is already finalized" }, { status: 400 });
  }

  const document = await prisma.caseDocument.update({
    where: { id },
    data: { status: "FINALIZED" },
    include: {
      case: { select: { id: true, caseNumber: true, title: true } },
      template: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true } },
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session!.user.id,
      action: "FINALIZE",
      entity: "CaseDocument",
      entityId: id,
      details: `Finalized case document: ${document.title}`,
      organizationId,
    },
  });

  return NextResponse.json(document);
}
