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

  // showAll=true allows viewing inactive (opposition) clients for reference
  const showAll = searchParams.get("showAll") === "true";
  // clientType filter e.g. ?clientType=COMPANY to get only banks/institutions
  const clientType = searchParams.get("clientType") || "";

  const base: any = {
    organizationId,
    ...(showAll ? {} : { isActive: true }),
    ...(clientType ? { clientType } : {}),
  };

  const where = search
    ? {
        ...base,
        OR: [
          { name: { contains: search } },
          { email: { contains: search } },
          { phone: { contains: search } },
        ],
      }
    : base;

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where,
      orderBy: [
        { caseClients: { _count: "desc" } },
        { name: "asc" },
      ],
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
  const {
    name, fatherHusbandName, designation, email, phone, alternatePhone,
    address, city, district, state, pincode, clientType, occupation, dob, age,
    panNumber, aadharNumber, gstNumber, companyName, cinNumber, notes
  } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const client = await prisma.client.create({
    data: {
      name, fatherHusbandName, designation, email, phone, alternatePhone,
      address, city, district, state, pincode, clientType, occupation,
      dob, age: age ? parseInt(age) : null,
      panNumber, aadharNumber, gstNumber, companyName, cinNumber, notes,
      organizationId,
    },
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
