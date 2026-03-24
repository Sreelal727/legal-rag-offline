import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, getOrgId } from "@/lib/api-utils";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await withAuth("cases:read");
  if (error) return error;

  const organizationId = getOrgId(session!);
  const { id } = await params;
  const caseData = await prisma.case.findFirst({
    where: { id, organizationId },
    include: {
      caseClients: { include: { client: true } },
      caseAssignments: { include: { user: { select: { id: true, name: true, role: true, email: true } } } },
      caseEvents: { orderBy: { date: "desc" } },
      documents: { orderBy: { createdAt: "desc" } },
      diaryEntries: { orderBy: { date: "desc" } },
      notices: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });

  if (!caseData) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  return NextResponse.json(caseData);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await withAuth("cases:write");
  if (error) return error;

  const organizationId = getOrgId(session!);
  const { id } = await params;
  const body = await request.json();

  if (body.filingDate) body.filingDate = new Date(body.filingDate);
  if (body.nextHearingDate) body.nextHearingDate = new Date(body.nextHearingDate);

  const existing = await prisma.case.findFirst({ where: { id, organizationId } });
  if (!existing) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  const caseData = await prisma.case.update({
    where: { id },
    data: body,
  });

  await prisma.auditLog.create({
    data: {
      userId: session!.user.id,
      action: "UPDATE",
      entity: "Case",
      entityId: id,
      details: `Updated case: ${caseData.caseNumber}`,
      organizationId,
    },
  });

  return NextResponse.json(caseData);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await withAuth("cases:delete");
  if (error) return error;

  const organizationId = getOrgId(session!);
  const { id } = await params;

  const existing = await prisma.case.findFirst({ where: { id, organizationId } });
  if (!existing) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  await prisma.case.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      userId: session!.user.id,
      action: "DELETE",
      entity: "Case",
      entityId: id,
      organizationId,
    },
  });

  return NextResponse.json({ success: true });
}
