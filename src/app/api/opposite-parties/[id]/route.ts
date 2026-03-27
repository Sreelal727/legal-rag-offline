import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, getOrgId } from "@/lib/api-utils";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await withAuth("cases:write");
  if (error) return error;

  const organizationId = getOrgId(session!);
  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.oppositeParty.findFirst({
    where: { id },
    include: { case: { select: { organizationId: true } } },
  });

  if (!existing || existing.case.organizationId !== organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const party = await prisma.oppositeParty.update({
    where: { id },
    data: body,
  });

  return NextResponse.json(party);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await withAuth("cases:write");
  if (error) return error;

  const organizationId = getOrgId(session!);
  const { id } = await params;

  const existing = await prisma.oppositeParty.findFirst({
    where: { id },
    include: { case: { select: { organizationId: true, caseNumber: true } } },
  });

  if (!existing || existing.case.organizationId !== organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.oppositeParty.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      userId: session!.user.id,
      action: "DELETE",
      entity: "OppositeParty",
      entityId: id,
      details: `Removed opposite party: ${existing.name} from case: ${existing.case.caseNumber}`,
      organizationId,
    },
  });

  return NextResponse.json({ success: true });
}
