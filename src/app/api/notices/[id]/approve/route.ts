import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, getOrgId } from "@/lib/api-utils";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await withAuth("notices:approve");
  if (error) return error;

  const { id } = await params;
  const { action, comments } = await request.json();

  if (!["APPROVED", "REJECTED", "REVISION_REQUESTED"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const existing = await prisma.notice.findFirst({ where: { id, organizationId: getOrgId(session!) } });
  if (!existing) return NextResponse.json({ error: "Notice not found" }, { status: 404 });

  await prisma.noticeApproval.create({
    data: {
      noticeId: id,
      userId: session!.user.id,
      action,
      comments,
    },
  });

  const newStatus = action === "APPROVED" ? "APPROVED" : action === "REJECTED" ? "REJECTED" : "DRAFT";

  await prisma.notice.update({
    where: { id },
    data: {
      status: newStatus,
      approvedBy: action === "APPROVED" ? session!.user.id : undefined,
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: getOrgId(session!),
      userId: session!.user.id,
      action: `NOTICE_${action}`,
      entity: "Notice",
      entityId: id,
      details: comments,
    },
  });

  return NextResponse.json({ success: true });
}
