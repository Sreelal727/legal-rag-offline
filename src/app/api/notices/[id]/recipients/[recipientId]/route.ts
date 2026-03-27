import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, getOrgId } from "@/lib/api-utils";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; recipientId: string }> }
) {
  const { error, session } = await withAuth("notices:draft");
  if (error) return error;

  const { id, recipientId } = await params;
  const organizationId = getOrgId(session!);

  const notice = await prisma.notice.findFirst({
    where: { id, organizationId },
  });
  if (!notice) {
    return NextResponse.json({ error: "Notice not found" }, { status: 404 });
  }

  const existing = await prisma.noticeRecipient.findFirst({
    where: { id: recipientId, noticeId: id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
  }

  const body = await request.json();
  const {
    deliveryMethod, trackingNumber, sentDate, deliveredDate,
    deliveryStatus, returnReason, notes,
  } = body;

  try {
    const updated = await prisma.noticeRecipient.update({
      where: { id: recipientId },
      data: {
        ...(deliveryMethod !== undefined && { deliveryMethod }),
        ...(trackingNumber !== undefined && { trackingNumber }),
        ...(sentDate !== undefined && { sentDate: sentDate ? new Date(sentDate) : null }),
        ...(deliveredDate !== undefined && { deliveredDate: deliveredDate ? new Date(deliveredDate) : null }),
        ...(deliveryStatus !== undefined && { deliveryStatus }),
        ...(returnReason !== undefined && { returnReason }),
        ...(notes !== undefined && { notes }),
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Error updating recipient:", err);
    return NextResponse.json({ error: "Failed to update recipient" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; recipientId: string }> }
) {
  const { error, session } = await withAuth("notices:draft");
  if (error) return error;

  const { id, recipientId } = await params;
  const organizationId = getOrgId(session!);

  const notice = await prisma.notice.findFirst({
    where: { id, organizationId },
  });
  if (!notice) {
    return NextResponse.json({ error: "Notice not found" }, { status: 404 });
  }

  const existing = await prisma.noticeRecipient.findFirst({
    where: { id: recipientId, noticeId: id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
  }

  try {
    await prisma.noticeRecipient.delete({
      where: { id: recipientId },
    });

    await prisma.auditLog.create({
      data: {
        organizationId,
        userId: session!.user.id,
        action: "DELETE",
        entity: "NoticeRecipient",
        entityId: recipientId,
        details: `Removed recipient: ${existing.recipientName} from notice: ${notice.title}`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error deleting recipient:", err);
    return NextResponse.json({ error: "Failed to delete recipient" }, { status: 500 });
  }
}
