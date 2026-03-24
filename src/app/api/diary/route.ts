import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, getOrgId } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const { error, session } = await withAuth("diary:read");
  if (error) return error;

  const searchParams = request.nextUrl.searchParams;
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: any = {
    organizationId: getOrgId(session!),
  };
  if (from) where.date = { ...(where.date || {}), gte: new Date(from) };
  if (to) where.date = { ...(where.date || {}), lte: new Date(to) };

  const entries = await prisma.diaryEntry.findMany({
    where,
    orderBy: { date: "asc" },
    include: { case: { select: { id: true, caseNumber: true, title: true } } },
  });

  return NextResponse.json(entries);
}

export async function POST(request: NextRequest) {
  const { error, session } = await withAuth("diary:write");
  if (error) return error;

  const body = await request.json();
  const { caseId, date, courtName, caseNumber, description, stage, nextDate, notes } = body;

  if (!caseId || !date) {
    return NextResponse.json({ error: "Case and date are required" }, { status: 400 });
  }

  const entry = await prisma.diaryEntry.create({
    data: {
      caseId,
      date: new Date(date),
      courtName,
      caseNumber,
      description,
      stage,
      nextDate: nextDate ? new Date(nextDate) : null,
      notes,
      organizationId: getOrgId(session!),
    },
  });

  // Update next hearing date on case
  if (nextDate) {
    await prisma.case.update({
      where: { id: caseId },
      data: { nextHearingDate: new Date(nextDate) },
    });
  }

  await prisma.auditLog.create({
    data: {
      userId: session!.user.id,
      action: "CREATE",
      entity: "DiaryEntry",
      entityId: entry.id,
      organizationId: getOrgId(session!),
    },
  });

  return NextResponse.json(entry, { status: 201 });
}
