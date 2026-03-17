import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-utils";

// Receive scraped case data from the Chrome extension
export async function POST(request: NextRequest) {
  const { error, session } = await withAuth("cases:write");
  if (error) return error;

  const { type, cases } = await request.json();

  if (!cases || !Array.isArray(cases) || cases.length === 0) {
    return NextResponse.json({ error: "No case data provided" }, { status: 400 });
  }

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const caseData of cases) {
    try {
      if (type === "case_detail") {
        // Full case detail scraped from CNR lookup page
        const result = await importCaseDetail(caseData, session!.user.id);
        if (result === "imported") imported++;
        else if (result === "skipped") skipped++;
        else failed++;
      } else {
        // Search result — has less data but may have CNR
        const result = await importSearchResult(caseData, session!.user.id);
        if (result === "imported") imported++;
        else if (result === "skipped") skipped++;
        else failed++;
      }
    } catch (err) {
      console.error("Extension import error:", err);
      failed++;
    }
  }

  await prisma.auditLog.create({
    data: {
      userId: session!.user.id,
      action: "EXTENSION_IMPORT",
      entity: "Case",
      entityId: session!.user.id,
      details: `Chrome extension import: ${imported} imported, ${skipped} skipped, ${failed} failed`,
    },
  });

  return corsResponse({ success: true, imported, skipped, failed, total: cases.length });
}

function corsResponse(data: any, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": "true",
    },
  });
}

// Parse DD-MM-YYYY date string to Date object
function parseDMY(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split("-");
  if (parts.length !== 3) return null;
  const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
  return isNaN(d.getTime()) ? null : d;
}

// Determine case type from string
function detectCaseType(typeStr: string): string {
  const t = (typeStr || "").toUpperCase();
  if (t.includes("CRIM") || t.includes("CC") || t.includes("SC")) return "CRIMINAL";
  if (t.includes("WP") || t.includes("WRIT")) return "WRIT";
  if (t.includes("APPEAL") || t.includes("AS") || t.includes("FA")) return "APPEAL";
  if (t.includes("MC") || t.includes("FAMILY")) return "FAMILY";
  return "CIVIL";
}

// Import a full case detail (from CNR lookup page scrape)
async function importCaseDetail(data: any, userId: string): Promise<string> {
  const cnr = data.cnrNumber?.toUpperCase();

  // Check for duplicate
  if (cnr) {
    const existing = await prisma.case.findUnique({ where: { cnrNumber: cnr } });
    if (existing) return "skipped";
  }

  const filingDate = parseDMY(data.filingDate);
  const nextHearingDate = parseDMY(data.nextHearingDate);
  const title = `${data.petitioner || "Unknown"} vs ${data.respondent || "Unknown"}`;

  const newCase = await prisma.case.create({
    data: {
      caseNumber: data.caseNumber || cnr || "SCRAPED-" + Date.now(),
      cnrNumber: cnr || undefined,
      title,
      caseType: detectCaseType(data.caseType),
      courtName: data.courtName,
      courtType: data.courtName?.toLowerCase().includes("high") ? "HIGH_COURT" : "DISTRICT_COURT",
      judge: data.judge,
      filingDate,
      nextHearingDate,
      status: data.status?.toUpperCase().includes("DISPOS") ? "DISPOSED" : "ACTIVE",
      ecourtStatus: data.status,
      lastSyncedAt: new Date(),
      stateCode: "32",
      districtCode: "7",
    },
  });

  // Import hearing history
  if (Array.isArray(data.hearingHistory)) {
    for (const hearing of data.hearingHistory) {
      const hearingDate = parseDMY(hearing.date);
      if (!hearingDate) continue;
      await prisma.caseEvent.create({
        data: {
          caseId: newCase.id,
          eventType: "HEARING",
          date: hearingDate,
          description: hearing.businessOnDate || hearing.purpose,
          outcome: hearing.purpose,
        },
      });
    }
  }

  // Auto-create diary entry for next hearing
  if (nextHearingDate && nextHearingDate > new Date()) {
    await prisma.diaryEntry.create({
      data: {
        caseId: newCase.id,
        date: nextHearingDate,
        courtName: data.courtName || "",
        caseNumber: newCase.caseNumber,
        description: "Hearing (scraped from eCourts)",
        stage: data.status,
      },
    });
  }

  // Find/create client from petitioner
  if (data.petitioner) {
    let client = await prisma.client.findFirst({
      where: { name: { contains: data.petitioner.split(" ")[0] } },
    });
    if (!client) {
      client = await prisma.client.create({
        data: { name: data.petitioner, clientType: "INDIVIDUAL" },
      });
    }
    await prisma.caseClient.create({
      data: { caseId: newCase.id, clientId: client.id, role: "PETITIONER" },
    });
  }

  // Assign advocate
  await prisma.caseAssignment.create({
    data: { caseId: newCase.id, userId, role: "PRIMARY" },
  });

  return "imported";
}

// Import a search result (less data, may not have full details)
async function importSearchResult(data: any, userId: string): Promise<string> {
  const cnr = data.cnrNumber?.toUpperCase();

  // Check for duplicate by CNR or case number
  if (cnr) {
    const existing = await prisma.case.findUnique({ where: { cnrNumber: cnr } });
    if (existing) return "skipped";
  }

  const title = data.petitioner && data.respondent
    ? `${data.petitioner} vs ${data.respondent}`
    : data.caseNumber || "Imported from eCourts";

  const newCase = await prisma.case.create({
    data: {
      caseNumber: data.caseNumber || cnr || "SCRAPED-" + Date.now(),
      cnrNumber: cnr || undefined,
      title,
      caseType: detectCaseType(data.caseType),
      courtName: data.court,
      courtType: data.court?.toLowerCase().includes("high") ? "HIGH_COURT" : "DISTRICT_COURT",
      status: data.status?.toUpperCase().includes("DISPOS") ? "DISPOSED" : "ACTIVE",
      ecourtStatus: data.status,
      lastSyncedAt: new Date(),
      stateCode: "32",
      districtCode: "7",
    },
  });

  // Find/create client from petitioner
  if (data.petitioner) {
    let client = await prisma.client.findFirst({
      where: { name: { contains: data.petitioner.split(" ")[0] } },
    });
    if (!client) {
      client = await prisma.client.create({
        data: { name: data.petitioner, clientType: "INDIVIDUAL" },
      });
    }
    await prisma.caseClient.create({
      data: { caseId: newCase.id, clientId: client.id, role: "PETITIONER" },
    });
  }

  // Assign advocate
  await prisma.caseAssignment.create({
    data: { caseId: newCase.id, userId, role: "PRIMARY" },
  });

  return "imported";
}

// Allow CORS from eCourts pages
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Credentials": "true",
    },
  });
}
