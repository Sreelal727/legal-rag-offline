import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, getOrgId } from "@/lib/api-utils";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await withAuth("clients:read");
  if (error) return error;

  const organizationId = getOrgId(session!);
  const { id } = await params;
  const client = await prisma.client.findFirst({
    where: { id, organizationId },
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

  const organizationId = getOrgId(session!);
  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.client.findFirst({ where: { id, organizationId } });
  if (!existing) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

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
      organizationId,
    },
  });

  return NextResponse.json(client);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await withAuth("clients:delete");
  if (error) return error;

  const organizationId = getOrgId(session!);
  const { id } = await params;

  const existing = await prisma.client.findFirst({ where: { id, organizationId } });
  if (!existing) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  await prisma.client.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      userId: session!.user.id,
      action: "DELETE",
      entity: "Client",
      entityId: id,
      organizationId,
    },
  });

  return NextResponse.json({ success: true });
}
