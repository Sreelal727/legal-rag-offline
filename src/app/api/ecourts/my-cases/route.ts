import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, getOrgId } from "@/lib/api-utils";
import { searchByAdvocateName, lookupByCNR } from "@/lib/ecourts/service";
import type { CourtKey } from "@/lib/ecourts/config";

// Fetch all cases for an advocate from eCourts by name
export async function POST(request: NextRequest) {
  const { error, session } = await withAuth("cases:read");
  if (error) return error;

  const { court, advocateName, year, importCnrs } = await request.json();

  if (!advocateName?.trim()) {
    return NextResponse.json(
      { error: "Advocate name is required to search DCMS" },
      { status: 400 }
    );
  }

  const orgId = getOrgId(session!);
  const courtKey = (court || "PALAKKAD_DISTRICT") as CourtKey;

  try {
    // Search eCourts by advocate name
    const results = await searchByAdvocateName(courtKey, advocateName.trim(), year || undefined);

    // If importCnrs is provided, import only those selected cases
    if (Array.isArray(importCnrs) && importCnrs.length > 0) {
      let imported = 0;
      let skipped = 0;
      let failed = 0;

      for (const cnr of importCnrs) {
        if (!cnr) {
          skipped++;
          continue;
        }

        const cnrUpper = cnr.toUpperCase();

        // Skip if already exists
        const existing = await prisma.case.findFirst({ where: { cnrNumber: cnrUpper, organizationId: orgId } });
        if (existing) {
          skipped++;
          continue;
        }

        // Lookup full case details
        try {
          const ecourtData = await lookupByCNR(cnrUpper);
          if (!ecourtData) {
            failed++;
            continue;
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
          else if (typeStr.includes("MC") || typeStr.includes("FAMILY")) caseType = "FAMILY";

          const title = `${ecourtData.petitioner || "Unknown"} vs ${ecourtData.respondent || "Unknown"}`;

          const newCase = await prisma.case.create({
            data: {
              organizationId: orgId,
              caseNumber: ecourtData.caseNumber || cnrUpper,
              cnrNumber: cnrUpper,
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

          // Import hearing history
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

          // Auto-create diary entry for next hearing
          if (nextHearingDate && nextHearingDate > new Date()) {
            await prisma.diaryEntry.create({
              data: {
                organizationId: orgId,
                caseId: newCase.id,
                date: nextHearingDate,
                courtName: ecourtData.courtName || "",
                caseNumber: newCase.caseNumber,
                description: "Hearing (synced from DCMS)",
                stage: ecourtData.status,
              },
            });
          }

          // Find and link client (petitioner)
          if (ecourtData.petitioner) {
            let client = await prisma.client.findFirst({
              where: { organizationId: orgId, name: { contains: ecourtData.petitioner.split(" ")[0] } },
            });
            if (!client) {
              client = await prisma.client.create({
                data: { organizationId: orgId, name: ecourtData.petitioner, clientType: "INDIVIDUAL" },
              });
            }
            await prisma.caseClient.create({
              data: { caseId: newCase.id, clientId: client.id, role: "PETITIONER" },
            });
          }

          // Assign the current advocate to the case
          await prisma.caseAssignment.create({
            data: { caseId: newCase.id, userId: session!.user.id, role: "PRIMARY" },
          });

          imported++;

          // Delay between requests to not overwhelm eCourts
          await new Promise((resolve) => setTimeout(resolve, 800));
        } catch (err) {
          console.error(`Failed to import case ${cnrUpper}:`, err);
          failed++;
        }
      }

      await prisma.auditLog.create({
        data: {
          organizationId: orgId,
          userId: session!.user.id,
          action: "DCMS_BULK_IMPORT",
          entity: "Case",
          entityId: session!.user.id,
          details: `DCMS import: ${imported} imported, ${skipped} skipped, ${failed} failed`,
        },
      });

      return NextResponse.json({
        success: true,
        imported,
        skipped,
        failed,
        total: importCnrs.length,
      });
    }

    // Preview mode — return search results with import status
    const existingCnrs = await prisma.case.findMany({
      where: {
        organizationId: orgId,
        cnrNumber: { in: results.filter((r) => r.cnrNumber).map((r) => r.cnrNumber.toUpperCase()) },
      },
      select: { cnrNumber: true },
    });
    const existingSet = new Set(existingCnrs.map((c) => c.cnrNumber));

    const enriched = results.map((r) => ({
      ...r,
      alreadyImported: r.cnrNumber ? existingSet.has(r.cnrNumber.toUpperCase()) : false,
    }));

    return NextResponse.json({
      advocateName: advocateName.trim(),
      court: courtKey,
      results: enriched,
      total: enriched.length,
      alreadyImported: enriched.filter((r) => r.alreadyImported).length,
      newCases: enriched.filter((r) => !r.alreadyImported).length,
    });
  } catch (err: any) {
    console.error("DCMS my-cases search failed:", err);
    return NextResponse.json(
      { error: `Failed to fetch from eCourts: ${err.message}` },
      { status: 502 }
    );
  }
}
