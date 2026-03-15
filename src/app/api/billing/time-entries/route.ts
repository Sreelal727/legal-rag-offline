import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const { error, session } = await withAuth("cases:read");
  if (error) return error;

  const searchParams = request.nextUrl.searchParams;
  const caseId = searchParams.get("caseId");
  const clientId = searchParams.get("clientId");
  const unbilledOnly = searchParams.get("unbilled") === "true";

  const where: any = {};
  if (caseId) where.caseId = caseId;
  if (clientId) where.clientId = clientId;
  if (unbilledOnly) where.isBilled = false;

  const entries = await prisma.timeEntry.findMany({
    where,
    orderBy: { date: "desc" },
    include: {
      user: { select: { id: true, name: true } },
      case: { select: { id: true, caseNumber: true, title: true } },
      client: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(entries);
}

export async function POST(request: NextRequest) {
  const { error, session } = await withAuth("cases:write");
  if (error) return error;

  const body = await request.json();
  const { caseId, clientId, description, date, hours, rate } = body;

  if (!description || !date || !hours) {
    return NextResponse.json({ error: "Description, date, and hours are required" }, { status: 400 });
  }

  const amount = Number(hours) * Number(rate || 0);

  const entry = await prisma.timeEntry.create({
    data: {
      userId: session!.user.id,
      caseId: caseId || null,
      clientId: clientId || null,
      description,
      date: new Date(date),
      hours: Number(hours),
      rate: Number(rate || 0),
      amount,
    },
  });

  return NextResponse.json(entry, { status: 201 });
}
