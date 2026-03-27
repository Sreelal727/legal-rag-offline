import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, getOrgId } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const { error, session } = await withAuth("cases:read");
  if (error) return error;

  const organizationId = getOrgId(session!);
  const { searchParams } = new URL(request.url);
  const caseId = searchParams.get("caseId");
  const documentType = searchParams.get("documentType");
  const status = searchParams.get("status");

  const where: any = { organizationId };
  if (caseId) where.caseId = caseId;
  if (documentType) where.documentType = documentType;
  if (status) where.status = status;

  const documents = await prisma.caseDocument.findMany({
    where,
    include: {
      case: { select: { id: true, caseNumber: true, title: true, courtName: true } },
      template: { select: { id: true, name: true, documentType: true } },
      creator: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ documents });
}

export async function POST(request: NextRequest) {
  const { error, session } = await withAuth("cases:write");
  if (error) return error;

  const organizationId = getOrgId(session!);
  const body = await request.json();

  if (!body.caseId || !body.documentType || !body.title || !body.content) {
    return NextResponse.json(
      { error: "caseId, documentType, title, and content are required" },
      { status: 400 }
    );
  }

  // Verify case belongs to org
  const caseData = await prisma.case.findFirst({
    where: { id: body.caseId, organizationId },
  });
  if (!caseData) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  const document = await prisma.caseDocument.create({
    data: {
      caseId: body.caseId,
      documentType: body.documentType,
      title: body.title,
      content: body.content,
      templateId: body.templateId || null,
      courtName: body.courtName || null,
      notes: body.notes || null,
      generatedBy: session!.user.id,
      organizationId,
    },
    include: {
      case: { select: { id: true, caseNumber: true, title: true } },
      template: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true } },
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session!.user.id,
      action: "CREATE",
      entity: "CaseDocument",
      entityId: document.id,
      details: `Created case document: ${document.title}`,
      organizationId,
    },
  });

  return NextResponse.json(document, { status: 201 });
}
