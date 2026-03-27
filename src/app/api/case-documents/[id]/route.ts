import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, getOrgId } from "@/lib/api-utils";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await withAuth("cases:read");
  if (error) return error;

  const organizationId = getOrgId(session!);
  const { id } = await params;

  const document = await prisma.caseDocument.findFirst({
    where: { id, organizationId },
    include: {
      case: {
        select: {
          id: true,
          caseNumber: true,
          title: true,
          courtName: true,
          caseType: true,
          caseSubType: true,
          suitValue: true,
          courtFee: true,
        },
      },
      template: true,
      creator: { select: { id: true, name: true } },
    },
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  return NextResponse.json(document);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await withAuth("cases:write");
  if (error) return error;

  const organizationId = getOrgId(session!);
  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.caseDocument.findFirst({ where: { id, organizationId } });
  if (!existing) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const data: any = {};
  if (body.content !== undefined) data.content = body.content;
  if (body.title !== undefined) data.title = body.title;
  if (body.status !== undefined) data.status = body.status;
  if (body.notes !== undefined) data.notes = body.notes;
  if (body.courtName !== undefined) data.courtName = body.courtName;
  if (body.filingNumber !== undefined) data.filingNumber = body.filingNumber;
  if (body.filedDate !== undefined) data.filedDate = body.filedDate ? new Date(body.filedDate) : null;

  const document = await prisma.caseDocument.update({
    where: { id },
    data,
    include: {
      case: { select: { id: true, caseNumber: true, title: true } },
      template: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true } },
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session!.user.id,
      action: "UPDATE",
      entity: "CaseDocument",
      entityId: id,
      details: `Updated case document: ${document.title}`,
      organizationId,
    },
  });

  return NextResponse.json(document);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await withAuth("cases:write");
  if (error) return error;

  const organizationId = getOrgId(session!);
  const { id } = await params;

  const existing = await prisma.caseDocument.findFirst({ where: { id, organizationId } });
  if (!existing) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  await prisma.caseDocument.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      userId: session!.user.id,
      action: "DELETE",
      entity: "CaseDocument",
      entityId: id,
      organizationId,
    },
  });

  return NextResponse.json({ success: true });
}
