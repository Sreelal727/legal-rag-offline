import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, getOrgId } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const { error, session } = await withAuth("scrutiny:read");
  if (error) return error;

  const organizationId = getOrgId(session!);
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const where: any = { organizationId };
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { bankName: { contains: search } },
      { borrowerName: { contains: search } },
      { propertyAddress: { contains: search } },
      { referenceNumber: { contains: search } },
    ];
  }
  if (status) where.status = status;

  const [reports, total] = await Promise.all([
    prisma.scrutinyReport.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        creator: { select: { id: true, name: true, role: true } },
        case: { select: { id: true, caseNumber: true, title: true } },
        client: { select: { id: true, name: true } },
        _count: { select: { propertyDocuments: true, deedChainNodes: true } },
      },
    }),
    prisma.scrutinyReport.count({ where }),
  ]);

  return NextResponse.json({ reports, total, page, limit });
}

export async function POST(request: NextRequest) {
  const { error, session } = await withAuth("scrutiny:write");
  if (error) return error;

  const organizationId = getOrgId(session!);
  const body = await request.json();
  const {
    title, referenceNumber, bankName, branchName, borrowerName,
    propertyAddress, surveyNumbers, caseId, clientId, formatSampleId,
  } = body;

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const report = await prisma.scrutinyReport.create({
    data: {
      title,
      referenceNumber,
      bankName,
      branchName,
      borrowerName,
      propertyAddress,
      surveyNumbers: surveyNumbers ? JSON.stringify(surveyNumbers) : null,
      caseId: caseId || null,
      clientId: clientId || null,
      formatSampleId: formatSampleId || null,
      createdBy: session!.user.id,
      organizationId,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session!.user.id,
      action: "CREATE",
      entity: "ScrutinyReport",
      entityId: report.id,
      details: `Created scrutiny report: ${title}`,
      organizationId,
    },
  });

  return NextResponse.json(report, { status: 201 });
}
