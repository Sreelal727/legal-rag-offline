import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, getOrgId } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const { error, session } = await withAuth("cases:read");
  if (error) return error;

  const organizationId = getOrgId(session!);
  const status = request.nextUrl.searchParams.get("status") || "";

  const where: any = { organizationId };
  if (status) where.status = status;

  const matters = await prisma.bankingMatter.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      case: { select: { id: true, caseNumber: true, title: true, courtName: true } },
      matterDocuments: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, documentType: true, title: true, status: true, createdAt: true },
      },
    },
  });

  return NextResponse.json(matters);
}

export async function POST(request: NextRequest) {
  const { error, session } = await withAuth("cases:write");
  if (error) return error;

  const organizationId = getOrgId(session!);
  const body = await request.json();
  const { title, suitType, courtName, courtType, bankClientId, notes } = body;

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const matter = await prisma.bankingMatter.create({
    data: {
      title,
      suitType: suitType || "OS",
      courtName: courtName || null,
      courtType: courtType || null,
      bankClientId: bankClientId || null,
      notes: notes || null,
      organizationId,
      createdBy: session!.user.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session!.user.id,
      action: "CREATE",
      entity: "BankingMatter",
      entityId: matter.id,
      details: `Created banking matter: ${title}`,
      organizationId,
    },
  });

  return NextResponse.json(matter, { status: 201 });
}
