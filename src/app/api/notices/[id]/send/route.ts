import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, getOrgId } from "@/lib/api-utils";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await withAuth("notices:send");
  if (error) return error;

  const { id } = await params;
  const organizationId = getOrgId(session!);

  const notice = await prisma.notice.findFirst({
    where: { id, organizationId },
    include: { recipients: true },
  });
  if (!notice) {
    return NextResponse.json({ error: "Notice not found" }, { status: 404 });
  }

  if (notice.recipients.length === 0) {
    return NextResponse.json({ error: "Notice has no recipients" }, { status: 400 });
  }

  const body = await request.json();
  const { recipientIds } = body;

  try {
    const targetRecipientIds = recipientIds && Array.isArray(recipientIds) && recipientIds.length > 0
      ? recipientIds
      : notice.recipients.map((r) => r.id);

    // Validate all provided recipientIds belong to this notice
    if (recipientIds && Array.isArray(recipientIds)) {
      const validIds = new Set(notice.recipients.map((r) => r.id));
      for (const rid of recipientIds) {
        if (!validIds.has(rid)) {
          return NextResponse.json(
            { error: `Recipient ${rid} does not belong to this notice` },
            { status: 400 }
          );
        }
      }
    }

    const now = new Date();

    // Update each recipient's delivery status
    await prisma.noticeRecipient.updateMany({
      where: {
        id: { in: targetRecipientIds },
        noticeId: id,
      },
      data: {
        deliveryStatus: "SENT",
        sentDate: now,
      },
    });

    // Update notice status to SENT
    await prisma.notice.update({
      where: { id },
      data: {
        status: "SENT",
        sentAt: now,
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId,
        userId: session!.user.id,
        action: "NOTICE_SENT",
        entity: "Notice",
        entityId: id,
        details: `Sent notice to ${targetRecipientIds.length} recipient(s)`,
      },
    });

    return NextResponse.json({
      success: true,
      sentAt: now,
      recipientCount: targetRecipientIds.length,
    });
  } catch (err) {
    console.error("Error sending notice:", err);
    return NextResponse.json({ error: "Failed to send notice" }, { status: 500 });
  }
}
