import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const { error } = await withAuth("schedule:read");
  if (error) return error;

  const searchParams = request.nextUrl.searchParams;
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: any = {};
  if (from) where.date = { ...(where.date || {}), gte: new Date(from) };
  if (to) where.date = { ...(where.date || {}), lte: new Date(to) };

  const events = await prisma.scheduleEvent.findMany({
    where,
    orderBy: { date: "asc" },
  });

  return NextResponse.json(events);
}

export async function POST(request: NextRequest) {
  const { error, session } = await withAuth("schedule:write");
  if (error) return error;

  const body = await request.json();
  const { title, description, date, endDate, eventType, caseId, isAllDay, reminder } = body;

  if (!title || !date) {
    return NextResponse.json({ error: "Title and date are required" }, { status: 400 });
  }

  const event = await prisma.scheduleEvent.create({
    data: {
      title,
      description,
      date: new Date(date),
      endDate: endDate ? new Date(endDate) : null,
      eventType: eventType || "MEETING",
      caseId,
      isAllDay: isAllDay || false,
      reminder: reminder || false,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session!.user.id,
      action: "CREATE",
      entity: "ScheduleEvent",
      entityId: event.id,
    },
  });

  return NextResponse.json(event, { status: 201 });
}
