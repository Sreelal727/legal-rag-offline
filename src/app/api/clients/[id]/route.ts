import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-utils";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await withAuth("clients:read");
  if (error) return error;

  const { id } = await params;
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      caseClients: {
        include: { case: true },
      },
      notices: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  return NextResponse.json(client);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await withAuth("clients:write");
  if (error) return error;

  const { id } = await params;
  const body = await request.json();

  const client = await prisma.client.update({
    where: { id },
    data: body,
  });

  await prisma.auditLog.create({
    data: {
      userId: session!.user.id,
      action: "UPDATE",
      entity: "Client",
      entityId: id,
      details: `Updated client: ${client.name}`,
    },
  });

  return NextResponse.json(client);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await withAuth("clients:delete");
  if (error) return error;

  const { id } = await params;
  await prisma.client.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      userId: session!.user.id,
      action: "DELETE",
      entity: "Client",
      entityId: id,
    },
  });

  return NextResponse.json({ success: true });
}
