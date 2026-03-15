import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-utils";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await withAuth("cases:write");
  if (error) return error;

  const { id } = await params;
  const body = await request.json();

  // Recalculate deadline if dates change
  if (body.accrualDate || body.limitationDays !== undefined || body.extensionDays !== undefined) {
    const existing = await prisma.limitationTracker.findUnique({ where: { id } });
    if (existing) {
      const accrual = new Date(body.accrualDate || existing.accrualDate);
      const days = body.limitationDays ?? existing.limitationDays;
      const ext = body.extensionDays ?? existing.extensionDays;
      const deadline = new Date(accrual);
      deadline.setDate(deadline.getDate() + days + ext);
      body.deadlineDate = deadline;
      if (body.accrualDate) body.accrualDate = accrual;
    }
  }

  const tracker = await prisma.limitationTracker.update({
    where: { id },
    data: body,
  });

  return NextResponse.json(tracker);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await withAuth("cases:delete");
  if (error) return error;

  const { id } = await params;
  await prisma.limitationTracker.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
