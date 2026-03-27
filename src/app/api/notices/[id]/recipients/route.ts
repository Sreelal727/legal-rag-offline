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

  const recipients = await prisma.noticeRecipient.findMany({
    where: { noticeId: id },
    include: {
      oppositeParty: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(recipients);
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
  const { oppositePartyIds, manual } = body;

  if (!oppositePartyIds && !manual) {
    return NextResponse.json(
      { error: "Either oppositePartyIds or manual recipient data is required" },
      { status: 400 }
    );
  }

  try {
    const created = [];

    if (oppositePartyIds && Array.isArray(oppositePartyIds)) {
      for (const partyId of oppositePartyIds) {
        const party = await prisma.oppositeParty.findUnique({
          where: { id: partyId },
        });
        if (!party) {
          return NextResponse.json(
            { error: `Opposite party not found: ${partyId}` },
            { status: 404 }
          );
        }

        const recipient = await prisma.noticeRecipient.create({
          data: {
            noticeId: id,
            oppositePartyId: partyId,
            recipientName: party.name,
            recipientAddress: party.address || "",
            recipientCity: party.city,
            recipientState: party.state,
            recipientPincode: party.pincode,
          },
        });
        created.push(recipient);
      }
    }

    if (manual) {
      const { recipientName, recipientAddress, recipientCity, recipientState, recipientPincode } = manual;

      if (!recipientName || !recipientAddress) {
        return NextResponse.json(
          { error: "recipientName and recipientAddress are required for manual entry" },
          { status: 400 }
        );
      }

      const recipient = await prisma.noticeRecipient.create({
        data: {
          noticeId: id,
          recipientName,
          recipientAddress,
          recipientCity: recipientCity || null,
          recipientState: recipientState || null,
          recipientPincode: recipientPincode || null,
        },
      });
      created.push(recipient);
    }

    await prisma.auditLog.create({
      data: {
        organizationId,
        userId: session!.user.id,
        action: "CREATE",
        entity: "NoticeRecipient",
        entityId: id,
        details: `Added ${created.length} recipient(s) to notice: ${notice.title}`,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("Error adding recipients:", err);
    return NextResponse.json({ error: "Failed to add recipients" }, { status: 500 });
  }
}
