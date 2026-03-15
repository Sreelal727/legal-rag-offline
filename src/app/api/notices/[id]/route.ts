import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-utils";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await withAuth("notices:read");
  if (error) return error;

  const { id } = await params;
  const notice = await prisma.notice.findUnique({
    where: { id },
    include: {
      template: true,
      case: { include: { caseClients: { include: { client: true } } } },
      client: true,
      drafter: { select: { id: true, name: true, role: true } },
      approver: { select: { id: true, name: true } },
      approvals: {
        include: { user: { select: { name: true, role: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!notice) {
    return NextResponse.json({ error: "Notice not found" }, { status: 404 });
  }

  return NextResponse.json(notice);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await withAuth("notices:draft");
  if (error) return error;

  const { id } = await params;
  const body = await request.json();

  const notice = await prisma.notice.update({
    where: { id },
    data: body,
  });

  return NextResponse.json(notice);
}
