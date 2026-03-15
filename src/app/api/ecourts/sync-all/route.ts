import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-utils";
import { lookupByCNR } from "@/lib/ecourts/service";

function parseDateDDMMYYYY(dateStr: string): Date | null {
  const parts = dateStr.split("-");
  if (parts.length !== 3) return null;
  const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
  return isNaN(d.getTime()) ? null : d;
}

// Sync all cases that have CNR numbers linked
export async function POST(request: NextRequest) {
  const { error, session } = await withAuth("cases:write");
  if (error) return error;

  const cases = await prisma.case.findMany({
    where: {
      cnrNumber: { not: null },
      status: { not: "CLOSED" },
    },
  });

  if (cases.length === 0) {
    return NextResponse.json({ message: "No CNR-linked cases to sync", synced: 0 });
  }

  let synced = 0;
  let failed = 0;
  const results: { caseNumber: string; cnr: string; status: string; nextHearing: string | null }[] = [];

  for (const localCase of cases) {
    if (!localCase.cnrNumber) continue;

    try {
      const ecourtData = await lookupByCNR(localCase.cnrNumber);
      if (!ecourtData) {
        failed++;
        results.push({
          caseNumber: localCase.caseNumber,
          cnr: localCase.cnrNumber,
          status: "FAILED",
          nextHearing: null,
        });
        continue;
      }

      const nextHearingDate = ecourtData.nextHearingDate
        ? parseDateDDMMYYYY(ecourtData.nextHearingDate)
        : null;

      // Update case
      await prisma.case.update({
        where: { id: localCase.id },
        data: {
          judge: ecourtData.judge || localCase.judge,
          nextHearingDate: nextHearingDate || localCase.nextHearingDate,
          ecourtStatus: ecourtData.status || localCase.ecourtStatus,
          lastSyncedAt: new Date(),
        },
      });

      // Create diary entry for next hearing if it doesn't exist
      if (nextHearingDate && nextHearingDate > new Date()) {
        const existingDiary = await prisma.diaryEntry.findFirst({
          where: { caseId: localCase.id, date: nextHearingDate },
        });

        if (!existingDiary) {
          await prisma.diaryEntry.create({
            data: {
              caseId: localCase.id,
              date: nextHearingDate,
              courtName: ecourtData.courtName || localCase.courtName,
              caseNumber: localCase.caseNumber,
              description: `Hearing (synced from eCourts)`,
              stage: ecourtData.status,
            },
          });
        }

        // Also create a schedule event for the hearing
        const existingSchedule = await prisma.scheduleEvent.findFirst({
          where: {
            caseId: localCase.id,
            date: nextHearingDate,
            eventType: "HEARING",
          },
        });

        if (!existingSchedule) {
          await prisma.scheduleEvent.create({
            data: {
              title: `Hearing: ${localCase.caseNumber}`,
              description: `${localCase.title}\nCourt: ${ecourtData.courtName || localCase.courtName}\nJudge: ${ecourtData.judge || "N/A"}`,
              date: nextHearingDate,
              eventType: "HEARING",
              caseId: localCase.id,
              reminder: true,
            },
          });
        }
      }

      // Import recent hearing history as case events
      for (const hearing of ecourtData.hearingHistory.slice(0, 3)) {
        const hearingDate = parseDateDDMMYYYY(hearing.date);
        if (!hearingDate) continue;

        const existing = await prisma.caseEvent.findFirst({
          where: { caseId: localCase.id, date: hearingDate, eventType: "HEARING" },
        });

        if (!existing) {
          await prisma.caseEvent.create({
            data: {
              caseId: localCase.id,
              eventType: "HEARING",
              date: hearingDate,
              description: hearing.businessOnDate || hearing.purpose,
              outcome: hearing.purpose,
            },
          });
        }
      }

      synced++;
      results.push({
        caseNumber: localCase.caseNumber,
        cnr: localCase.cnrNumber,
        status: "SYNCED",
        nextHearing: ecourtData.nextHearingDate,
      });

      // Small delay to avoid hammering eCourts
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch {
      failed++;
      results.push({
        caseNumber: localCase.caseNumber,
        cnr: localCase.cnrNumber!,
        status: "ERROR",
        nextHearing: null,
      });
    }
  }

  await prisma.auditLog.create({
    data: {
      userId: session!.user.id,
      action: "ECOURTS_BULK_SYNC",
      entity: "Case",
      details: `Bulk sync: ${synced} synced, ${failed} failed out of ${cases.length} cases`,
    },
  });

  return NextResponse.json({
    total: cases.length,
    synced,
    failed,
    results,
  });
}
