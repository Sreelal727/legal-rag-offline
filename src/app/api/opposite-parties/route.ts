import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, getOrgId } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const { error, session } = await withAuth("cases:read");
  if (error) return error;

  const organizationId = getOrgId(session!);
  const caseId = request.nextUrl.searchParams.get("caseId");

  if (!caseId) {
    return NextResponse.json({ error: "caseId is required" }, { status: 400 });
  }

  // Verify case belongs to organization
  const caseRecord = await prisma.case.findFirst({ where: { id: caseId, organizationId } });
  if (!caseRecord) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  const parties = await prisma.oppositeParty.findMany({
    where: { caseId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ parties });
}

export async function POST(request: NextRequest) {
  const { error, session } = await withAuth("cases:write");
  if (error) return error;

  const organizationId = getOrgId(session!);
  const body = await request.json();
  const {
    caseId, name, fatherHusbandName, designation, address, city, district,
    state, pincode, phone, email, partyType, advocateName, advocatePhone, notes,
  } = body;

  if (!caseId || !name) {
    return NextResponse.json({ error: "caseId and name are required" }, { status: 400 });
  }

  const caseRecord = await prisma.case.findFirst({ where: { id: caseId, organizationId } });
  if (!caseRecord) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  const party = await prisma.oppositeParty.create({
    data: {
      caseId, name, fatherHusbandName, designation, address, city, district,
      state, pincode, phone, email, partyType: partyType || "RESPONDENT",
      advocateName, advocatePhone, notes,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session!.user.id,
      action: "CREATE",
      entity: "OppositeParty",
      entityId: party.id,
      details: `Added opposite party: ${name} to case: ${caseRecord.caseNumber}`,
      organizationId,
    },
  });

  return NextResponse.json(party, { status: 201 });
}
