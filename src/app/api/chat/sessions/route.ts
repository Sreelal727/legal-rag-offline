import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-utils";

export async function GET() {
  const { error, session } = await withAuth("chat:use");
  if (error) return error;

  const sessions = await prisma.chatSession.findMany({
    where: { userId: session!.user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { messages: true } },
    },
  });

  return NextResponse.json(sessions);
}
