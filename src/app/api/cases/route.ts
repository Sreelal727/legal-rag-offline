import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const { error } = await withAuth("cases:read");
  if (error) return error;

  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const where: any = {};
  if (search) {
    where.OR = [
      { caseNumber: { contains: search } },
      { title: { contains: search } },
      { courtName: { contains: search } },
    ];
  }
  if (status) where.status = status;

  const [cases, total] = await Promise.all([
    prisma.case.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        caseClients: { include: { client: true } },
        caseAssignments: { include: { user: { select: { id: true, name: true, role: true } } } },
        _count: { select: { documents: true, caseEvents: true } },
      },
    }),
    prisma.case.count({ where }),
  ]);

  return NextResponse.json({ cases, total, page, limit });
}

export async function POST(request: NextRequest) {
  const { error, session } = await withAuth("cases:write");
  if (error) return error;

  const body = await request.json();
  const {
    caseNumber, title, description, caseType, courtName, courtType, judge, filingDate, status, priority,
    clientName, clientEmail, clientPhone, clientAddress, clientType, clientRole,
  } = body;

  if (!caseNumber || !title) {
    return NextResponse.json({ error: "Case number and title are required" }, { status: 400 });
  }

  if (!clientName) {
    return NextResponse.json({ error: "Client name is required" }, { status: 400 });
  }

  const existingCase = await prisma.case.findUnique({ where: { caseNumber } });
  if (existingCase) {
    return NextResponse.json({ error: "Case number already exists" }, { status: 400 });
  }

  // Find existing client by email or create new one
  let client = null;
  if (clientEmail) {
    client = await prisma.client.findFirst({ where: { email: clientEmail } });
  }
  if (!client) {
    client = await prisma.client.create({
      data: {
        name: clientName,
        email: clientEmail || null,
        phone: clientPhone || null,
        address: clientAddress || null,
        clientType: clientType || "INDIVIDUAL",
      },
    });
  }

  const newCase = await prisma.case.create({
    data: {
      caseNumber,
      title,
      description,
      caseType: caseType || "CIVIL",
      courtName,
      courtType: courtType || "DISTRICT_COURT",
      judge,
      filingDate: filingDate ? new Date(filingDate) : null,
      status: status || "ACTIVE",
      priority: priority || "MEDIUM",
    },
  });

  // Link client to case
  await prisma.caseClient.create({
    data: {
      caseId: newCase.id,
      clientId: client.id,
      role: clientRole || "PETITIONER",
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session!.user.id,
      action: "CREATE",
      entity: "Case",
      entityId: newCase.id,
      details: `Created case: ${caseNumber} with client: ${clientName}`,
    },
  });

  return NextResponse.json(newCase, { status: 201 });
}
