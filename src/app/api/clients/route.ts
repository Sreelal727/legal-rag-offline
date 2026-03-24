import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, getOrgId } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const { error, session } = await withAuth("clients:read");
  if (error) return error;

  const organizationId = getOrgId(session!);
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const where = search
    ? {
        organizationId,
        OR: [
          { name: { contains: search } },
          { email: { contains: search } },
          { phone: { contains: search } },
        ],
      }
    : { organizationId };

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: { select: { caseClients: true } },
      },
    }),
    prisma.client.count({ where }),
  ]);

  return NextResponse.json({ clients, total, page, limit });
}

export async function POST(request: NextRequest) {
  const { error, session } = await withAuth("clients:write");
  if (error) return error;

  const organizationId = getOrgId(session!);
  const body = await request.json();
  const { name, email, phone, address, clientType, panNumber, aadharNumber, gstNumber, notes } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const client = await prisma.client.create({
    data: { name, email, phone, address, clientType, panNumber, aadharNumber, gstNumber, notes, organizationId },
  });

  await prisma.auditLog.create({
    data: {
      userId: session!.user.id,
      action: "CREATE",
      entity: "Client",
      entityId: client.id,
      details: `Created client: ${name}`,
      organizationId,
    },
  });

  return NextResponse.json(client, { status: 201 });
}
