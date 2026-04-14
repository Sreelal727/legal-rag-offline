import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, getOrgId } from "@/lib/api-utils";

/**
 * Revival letters / part-payments / acknowledgments extend the limitation
 * period under section 18 / 19 of the Limitation Act, 1963.
 * Default limitation reset = 3 years from revival date.
 */

export async function GET(request: NextRequest) {
  const { error, session } = await withAuth("cases:read");
  if (error) return error;

  const caseId = request.nextUrl.searchParams.get("caseId") || undefined;
  const where: any = { organizationId: getOrgId(session!) };
  if (caseId) where.caseId = caseId;

  const letters = await prisma.revivalLetter.findMany({
    where,
    orderBy: { revivalDate: "desc" },
    include: { case: { select: { id: true, caseNumber: true, title: true } } },
  });
  return NextResponse.json(letters);
}

export async function POST(request: NextRequest) {
  const { error, session } = await withAuth("cases:write");
  if (error) return error;

  const organizationId = getOrgId(session!);
  const body = await request.json();
  const { caseId, revivalDate, revivalType, amount, reference, notes } = body;

  if (!caseId || !revivalDate) {
    return NextResponse.json(
      { error: "caseId and revivalDate are required" },
      { status: 400 }
    );
  }
  const c = await prisma.case.findFirst({ where: { id: caseId, organizationId } });
  if (!c) return NextResponse.json({ error: "Case not found" }, { status: 404 });

  // Auto-compute new limitation date: revivalDate + 3 years
  const newLimit = new Date(revivalDate);
  newLimit.setFullYear(newLimit.getFullYear() + 3);

  const letter = await prisma.revivalLetter.create({
    data: {
      caseId,
      revivalDate: new Date(revivalDate),
      revivalType: revivalType || "LETTER",
      amount: amount ? parseFloat(amount) : null,
      reference: reference || null,
      newLimitationDate: newLimit,
      notes: notes || null,
      organizationId,
      createdBy: session!.user.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session!.user.id,
      action: "CREATE",
      entity: "RevivalLetter",
      entityId: letter.id,
      details: `Recorded ${revivalType || "LETTER"} revival on case ${c.caseNumber}; new limitation: ${newLimit.toISOString().slice(0,10)}`,
      organizationId,
    },
  });

  return NextResponse.json(letter, { status: 201 });
}
