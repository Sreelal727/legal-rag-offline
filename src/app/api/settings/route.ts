import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, getOrgId } from "@/lib/api-utils";

export async function GET() {
  const { error, session } = await withAuth("settings:read");
  if (error) return error;

  const org = await prisma.organization.findUnique({
    where: { id: getOrgId(session!) },
  });

  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  // Map to legacy FirmSettings shape for frontend compatibility
  return NextResponse.json({
    id: org.id,
    firmName: org.name,
    address: org.address,
    phone: org.phone,
    email: org.email,
    gstin: org.gstin,
    registrationNumber: org.registrationNumber,
    letterheadUrl: org.letterheadUrl,
    plan: org.plan,
    maxUsers: org.maxUsers,
    maxCases: org.maxCases,
    maxDocuments: org.maxDocuments,
    maxAiQueries: org.maxAiQueries,
    aiQueriesUsed: org.aiQueriesUsed,
    createdAt: org.createdAt,
    updatedAt: org.updatedAt,
  });
}

export async function PUT(request: NextRequest) {
  const { error, session } = await withAuth("settings:write");
  if (error) return error;

  const orgId = getOrgId(session!);
  const body = await request.json();

  const org = await prisma.organization.update({
    where: { id: orgId },
    data: {
      name: body.firmName ?? undefined,
      address: body.address ?? undefined,
      phone: body.phone ?? undefined,
      email: body.email ?? undefined,
      gstin: body.gstin ?? undefined,
      registrationNumber: body.registrationNumber ?? undefined,
      letterheadUrl: body.letterheadUrl ?? undefined,
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: orgId,
      userId: session!.user.id,
      action: "UPDATE",
      entity: "Organization",
      entityId: orgId,
    },
  });

  return NextResponse.json({
    id: org.id,
    firmName: org.name,
    address: org.address,
    phone: org.phone,
    email: org.email,
    gstin: org.gstin,
    registrationNumber: org.registrationNumber,
    letterheadUrl: org.letterheadUrl,
  });
}
