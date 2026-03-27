import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, getOrgId } from "@/lib/api-utils";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; replyId: string }> }
) {
  const { error, session } = await withAuth("notices:draft");
  if (error) return error;

  const { id, replyId } = await params;
  const organizationId = getOrgId(session!);

  const notice = await prisma.notice.findFirst({
    where: { id, organizationId },
  });
  if (!notice) {
    return NextResponse.json({ error: "Notice not found" }, { status: 404 });
  }

  const existing = await prisma.noticeReply.findFirst({
    where: { id: replyId, noticeId: id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Reply not found" }, { status: 404 });
  }

  const body = await request.json();
  const { recipientId, replyDate, replyContent, notes } = body;

  try {
    const updated = await prisma.noticeReply.update({
      where: { id: replyId },
      data: {
        ...(recipientId !== undefined && { recipientId: recipientId || null }),
        ...(replyDate !== undefined && { replyDate: new Date(replyDate) }),
        ...(replyContent !== undefined && { replyContent }),
        ...(notes !== undefined && { notes }),
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Error updating reply:", err);
    return NextResponse.json({ error: "Failed to update reply" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; replyId: string }> }
) {
  const { error, session } = await withAuth("notices:draft");
  if (error) return error;

  const { id, replyId } = await params;
  const organizationId = getOrgId(session!);

  const notice = await prisma.notice.findFirst({
    where: { id, organizationId },
  });
  if (!notice) {
    return NextResponse.json({ error: "Notice not found" }, { status: 404 });
  }

  const existing = await prisma.noticeReply.findFirst({
    where: { id: replyId, noticeId: id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Reply not found" }, { status: 404 });
  }

  try {
    await prisma.noticeReply.delete({
      where: { id: replyId },
    });

    await prisma.auditLog.create({
      data: {
        organizationId,
        userId: session!.user.id,
        action: "DELETE",
        entity: "NoticeReply",
        entityId: replyId,
        details: `Deleted reply from notice: ${notice.title}`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error deleting reply:", err);
    return NextResponse.json({ error: "Failed to delete reply" }, { status: 500 });
  }
}
