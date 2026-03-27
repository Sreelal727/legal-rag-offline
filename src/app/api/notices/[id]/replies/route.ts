import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, getOrgId } from "@/lib/api-utils";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await withAuth("notices:read");
  if (error) return error;

  const { id } = await params;

  const notice = await prisma.notice.findFirst({
    where: { id, organizationId: getOrgId(session!) },
  });
  if (!notice) {
    return NextResponse.json({ error: "Notice not found" }, { status: 404 });
  }

  const replies = await prisma.noticeReply.findMany({
    where: { noticeId: id },
    include: {
      recipient: true,
    },
    orderBy: { replyDate: "desc" },
  });

  return NextResponse.json(replies);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await withAuth("notices:draft");
  if (error) return error;

  const { id } = await params;
  const organizationId = getOrgId(session!);

  const notice = await prisma.notice.findFirst({
    where: { id, organizationId },
  });
  if (!notice) {
    return NextResponse.json({ error: "Notice not found" }, { status: 404 });
  }

  const body = await request.json();
  const { recipientId, replyDate, replyContent, notes } = body;

  if (!replyDate) {
    return NextResponse.json({ error: "replyDate is required" }, { status: 400 });
  }

  if (recipientId) {
    const recipient = await prisma.noticeRecipient.findFirst({
      where: { id: recipientId, noticeId: id },
    });
    if (!recipient) {
      return NextResponse.json({ error: "Recipient not found for this notice" }, { status: 404 });
    }
  }

  try {
    const reply = await prisma.noticeReply.create({
      data: {
        noticeId: id,
        recipientId: recipientId || null,
        replyDate: new Date(replyDate),
        replyContent: replyContent || null,
        notes: notes || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId,
        userId: session!.user.id,
        action: "CREATE",
        entity: "NoticeReply",
        entityId: reply.id,
        details: `Added reply to notice: ${notice.title}`,
      },
    });

    return NextResponse.json(reply, { status: 201 });
  } catch (err) {
    console.error("Error creating reply:", err);
    return NextResponse.json({ error: "Failed to create reply" }, { status: 500 });
  }
}
