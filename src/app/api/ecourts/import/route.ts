import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-utils";
import { lookupByCNR } from "@/lib/ecourts/service";

// Import a new case from eCourts by CNR number
export async function POST(request: NextRequest) {
  const { error, session } = await withAuth("cases:write");
  if (error) return error;

  const { cnrNumber } = await request.json();

  if (!cnrNumber) {
    return NextResponse.json({ error: "CNR number is required" }, { status: 400 });
  }

  // Check if case already exists
  const existing = await prisma.case.findUnique({ where: { cnrNumber: cnrNumber.toUpperCase() } });
  if (existing) {
    return NextResponse.json({ error: "Case with this CNR already exists", caseId: existing.id }, { status: 409 });
  }

  const ecourtData = await lookupByCNR(cnrNumber);
  if (!ecourtData) {
    return NextResponse.json({ error: "Case not found on eCourts" }, { status: 404 });
  }

  // Parse dates
  let filingDate: Date | null = null;
  if (ecourtData.filingDate) {
    const parts = ecourtData.filingDate.split("-");
    if (parts.length === 3) filingDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
  }

  let nextHearingDate: Date | null = null;
  if (ecourtData.nextHearingDate) {
    const parts = ecourtData.nextHearingDate.split("-");
    if (parts.length === 3) nextHearingDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
  }

  // Determine case type
  let caseType = "CIVIL";
  const typeStr = (ecourtData.caseType || "").toUpperCase();
  if (typeStr.includes("CRIM") || typeStr.includes("CC") || typeStr.includes("SC")) caseType = "CRIMINAL";
  else if (typeStr.includes("WP") || typeStr.includes("WRIT")) caseType = "WRIT";
  else if (typeStr.includes("APPEAL") || typeStr.includes("AS") || typeStr.includes("FA")) caseType = "APPEAL";

  // Create the case
  const title = `${ecourtData.petitioner || "Unknown"} vs ${ecourtData.respondent || "Unknown"}`;
  const newCase = await prisma.case.create({
    data: {
      caseNumber: ecourtData.caseNumber || cnrNumber,
      cnrNumber: cnrNumber.toUpperCase(),
      title,
      caseType,
      courtName: ecourtData.courtName,
      courtType: ecourtData.courtName?.toLowerCase().includes("high") ? "HIGH_COURT" : "DISTRICT_COURT",
      judge: ecourtData.judge,
      filingDate,
      nextHearingDate,
      status: ecourtData.status?.toUpperCase().includes("DISPOS") ? "DISPOSED" : "ACTIVE",
      ecourtStatus: ecourtData.status,
      lastSyncedAt: new Date(),
      stateCode: "32",
      districtCode: "7",
    },
  });

  // Import hearing history as case events
  for (const hearing of ecourtData.hearingHistory) {
    const parts = hearing.date.split("-");
    if (parts.length !== 3) continue;
    await prisma.caseEvent.create({
      data: {
        caseId: newCase.id,
        eventType: "HEARING",
        date: new Date(`${parts[2]}-${parts[1]}-${parts[0]}`),
        description: hearing.businessOnDate || hearing.purpose,
        outcome: hearing.purpose,
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      userId: session!.user.id,
      action: "ECOURTS_IMPORT",
      entity: "Case",
      entityId: newCase.id,
      details: `Imported from eCourts: ${cnrNumber}`,
    },
  });

  return NextResponse.json({ success: true, case: newCase, ecourtData }, { status: 201 });
}
