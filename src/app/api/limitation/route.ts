import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, getOrgId } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const { error, session } = await withAuth("cases:read");
  if (error) return error;

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status") || "ACTIVE";
  const caseId = searchParams.get("caseId");

  const where: any = { organizationId: getOrgId(session!) };
  if (status !== "all") where.status = status;
  if (caseId) where.caseId = caseId;

  const trackers = await prisma.limitationTracker.findMany({
    where,
    orderBy: { deadlineDate: "asc" },
    include: {
      case: { select: { id: true, caseNumber: true, title: true } },
      client: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(trackers);
}

export async function POST(request: NextRequest) {
  const { error, session } = await withAuth("cases:write");
  if (error) return error;

  const orgId = getOrgId(session!);
  const body = await request.json();
  const {
    caseId, clientId, title, description, category,
    accrualDate, limitationDays, extensionDays, extensionReason,
    alertDays, notes,
  } = body;

  if (!title || !accrualDate || !limitationDays) {
    return NextResponse.json(
      { error: "Title, accrual date, and limitation period are required" },
      { status: 400 }
    );
  }

  const accrual = new Date(accrualDate);
  const deadline = new Date(accrual);
  deadline.setDate(deadline.getDate() + Number(limitationDays) + Number(extensionDays || 0));

  const tracker = await prisma.limitationTracker.create({
    data: {
      organizationId: orgId,
      caseId: caseId || null,
      clientId: clientId || null,
      title,
      description,
      category: category || "GENERAL",
      accrualDate: accrual,
      limitationDays: Number(limitationDays),
      deadlineDate: deadline,
      extensionDays: Number(extensionDays || 0),
      extensionReason,
      alertDays: Number(alertDays || 30),
      notes,
      createdBy: session!.user.id,
    },
  });

  await prisma.scheduleEvent.create({
    data: {
      organizationId: orgId,
      title: `DEADLINE: ${title}`,
      description: `Limitation deadline\n${description || ""}`,
      date: deadline,
      eventType: "DEADLINE",
      caseId: caseId || null,
      reminder: true,
    },
  });

  const alertDate = new Date(deadline);
  alertDate.setDate(alertDate.getDate() - Number(alertDays || 30));
  if (alertDate > new Date()) {
    await prisma.scheduleEvent.create({
      data: {
        organizationId: orgId,
        title: `ALERT: ${title} - ${alertDays || 30} days remaining`,
        description: `Limitation deadline approaching for: ${title}`,
        date: alertDate,
        eventType: "REMINDER",
        caseId: caseId || null,
        reminder: true,
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      organizationId: orgId,
      userId: session!.user.id,
      action: "CREATE",
      entity: "LimitationTracker",
      entityId: tracker.id,
      details: `Created limitation tracker: ${title}, deadline: ${deadline.toISOString().split("T")[0]}`,
    },
  });

  return NextResponse.json(tracker, { status: 201 });
}
