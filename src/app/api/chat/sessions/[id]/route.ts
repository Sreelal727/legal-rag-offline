import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-utils";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await withAuth("chat:use");
  if (error) return error;

  const { id } = await params;
  const session = await prisma.chatSession.findUnique({
    where: { id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json(session);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await withAuth("chat:use");
  if (error) return error;

  const { id } = await params;

  // Verify the session belongs to this user
  const chatSession = await prisma.chatSession.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!chatSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (chatSession.userId !== session!.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Delete messages first (cascade should handle this, but be explicit)
  await prisma.chatMessage.deleteMany({ where: { sessionId: id } });
  await prisma.chatSession.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
