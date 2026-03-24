import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, getOrgId } from "@/lib/api-utils";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await withAuth("chat:use");
  if (error) return error;

  const { id } = await params;
  const chatSession = await prisma.chatSession.findFirst({
    where: { id, organizationId: getOrgId(session!) },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!chatSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json(chatSession);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await withAuth("chat:use");
  if (error) return error;

  const { id } = await params;

  const chatSession = await prisma.chatSession.findFirst({
    where: { id, organizationId: getOrgId(session!) },
    select: { userId: true },
  });

  if (!chatSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (chatSession.userId !== session!.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  await prisma.chatMessage.deleteMany({ where: { sessionId: id } });
  await prisma.chatSession.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
