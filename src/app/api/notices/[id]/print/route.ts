import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, getOrgId } from "@/lib/api-utils";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await withAuth("notices:read");
  if (error) return error;

  const { id } = await params;
  const organizationId = getOrgId(session!);

  const notice = await prisma.notice.findFirst({
    where: { id, organizationId },
    include: {
      recipients: {
        include: { oppositeParty: true },
      },
      client: true,
      case: true,
      drafter: { select: { id: true, name: true } },
    },
  });
  if (!notice) {
    return NextResponse.json({ error: "Notice not found" }, { status: 404 });
  }

  const body = await request.json();
  const { type, recipientIds } = body;

  if (!type || !["notice", "envelope", "ad_card", "batta"].includes(type)) {
    return NextResponse.json(
      { error: "type must be 'notice', 'envelope', 'ad_card', or 'batta'" },
      { status: 400 }
    );
  }

  try {
    let targetRecipients = notice.recipients;
    if (recipientIds && Array.isArray(recipientIds) && recipientIds.length > 0) {
      const idSet = new Set(recipientIds);
      targetRecipients = notice.recipients.filter((r) => idSet.has(r.id));
    }

    if (targetRecipients.length === 0) {
      return NextResponse.json({ error: "No matching recipients found" }, { status: 400 });
    }

    const senderInfo = {
      name: notice.drafter?.name || "",
      organizationId: notice.organizationId,
    };

    const printData = targetRecipients.map((recipient) => {
      const addressBlock = [
        recipient.recipientName,
        recipient.recipientAddress,
        [recipient.recipientCity, recipient.recipientState].filter(Boolean).join(", "),
        recipient.recipientPincode,
      ].filter(Boolean).join("\n");

      switch (type) {
        case "notice":
          return {
            recipientId: recipient.id,
            recipientName: recipient.recipientName,
            addressBlock,
            title: notice.title,
            content: notice.content,
            date: notice.createdAt,
            caseNumber: notice.case?.caseNumber || null,
            clientName: notice.client?.name || null,
            senderName: senderInfo.name,
          };

        case "envelope":
          return {
            recipientId: recipient.id,
            to: {
              name: recipient.recipientName,
              address: recipient.recipientAddress,
              city: recipient.recipientCity,
              state: recipient.recipientState,
              pincode: recipient.recipientPincode,
            },
            from: {
              name: senderInfo.name,
              organizationId: senderInfo.organizationId,
            },
            deliveryMethod: recipient.deliveryMethod,
          };

        case "ad_card":
          return {
            recipientId: recipient.id,
            recipientName: recipient.recipientName,
            recipientAddress: addressBlock,
            senderName: senderInfo.name,
            noticeTitle: notice.title,
            noticeDate: notice.createdAt,
            trackingNumber: recipient.trackingNumber,
          };

        case "batta":
          return {
            recipientId: recipient.id,
            recipientName: recipient.recipientName,
            recipientAddress: addressBlock,
            noticeTitle: notice.title,
            caseNumber: notice.case?.caseNumber || null,
            clientName: notice.client?.name || null,
            date: notice.createdAt,
          };

        default:
          return null;
      }
    }).filter(Boolean);

    return NextResponse.json({
      type,
      noticeId: id,
      noticeTitle: notice.title,
      recipientCount: printData.length,
      data: printData,
    });
  } catch (err) {
    console.error("Error generating print data:", err);
    return NextResponse.json({ error: "Failed to generate print data" }, { status: 500 });
  }
}
