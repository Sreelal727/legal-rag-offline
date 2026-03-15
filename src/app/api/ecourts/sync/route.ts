import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-utils";
import { lookupByCNR } from "@/lib/ecourts/service";

// Sync a single case by its CNR number
export async function POST(request: NextRequest) {
  const { error, session } = await withAuth("cases:write");
  if (error) return error;

  const { caseId } = await request.json();

  if (!caseId) {
    return NextResponse.json({ error: "Case ID is required" }, { status: 400 });
  }

  const localCase = await prisma.case.findUnique({ where: { id: caseId } });
  if (!localCase || !localCase.cnrNumber) {
    return NextResponse.json({ error: "Case not found or CNR not set" }, { status: 400 });
  }

  const ecourtData = await lookupByCNR(localCase.cnrNumber);
  if (!ecourtData) {
    return NextResponse.json(
      { error: "Could not fetch data from eCourts" },
      { status: 502 }
    );
  }

  // Parse next hearing date
  let nextHearingDate: Date | null = null;
  if (ecourtData.nextHearingDate) {
    const parts = ecourtData.nextHearingDate.split("-");
    if (parts.length === 3) {
      nextHearingDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    }
  }

  // Update local case with eCourts data
  const updated = await prisma.case.update({
    where: { id: caseId },
    data: {
      judge: ecourtData.judge || localCase.judge,
      nextHearingDate: nextHearingDate || localCase.nextHearingDate,
      ecourtStatus: ecourtData.status || localCase.ecourtStatus,
      lastSyncedAt: new Date(),
    },
  });

  // Create case event for hearing history entries we don't have
  if (ecourtData.hearingHistory.length > 0) {
    for (const hearing of ecourtData.hearingHistory.slice(0, 5)) {
      const parts = hearing.date.split("-");
      if (parts.length !== 3) continue;
      const hearingDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);

      // Check if event already exists for this date
      const existing = await prisma.caseEvent.findFirst({
        where: {
          caseId,
          date: hearingDate,
          eventType: "HEARING",
        },
      });

      if (!existing) {
        await prisma.caseEvent.create({
          data: {
            caseId,
            eventType: "HEARING",
            date: hearingDate,
            description: hearing.businessOnDate || hearing.purpose,
            outcome: hearing.purpose,
          },
        });
      }
    }
  }

  // Auto-create diary entry and schedule event for next hearing
  if (nextHearingDate && nextHearingDate > new Date()) {
    const existingDiary = await prisma.diaryEntry.findFirst({
      where: { caseId, date: nextHearingDate },
    });

    if (!existingDiary) {
      await prisma.diaryEntry.create({
        data: {
          caseId,
          date: nextHearingDate,
          courtName: ecourtData.courtName || localCase.courtName,
          caseNumber: localCase.caseNumber,
          description: `Hearing (synced from eCourts)`,
          stage: ecourtData.status,
        },
      });
    }

    // Also create schedule event
    const existingSchedule = await prisma.scheduleEvent.findFirst({
      where: { caseId, date: nextHearingDate, eventType: "HEARING" },
    });

    if (!existingSchedule) {
      await prisma.scheduleEvent.create({
        data: {
          title: `Hearing: ${localCase.caseNumber}`,
          description: `${localCase.title}\nCourt: ${ecourtData.courtName || localCase.courtName}\nJudge: ${ecourtData.judge || "N/A"}`,
          date: nextHearingDate,
          eventType: "HEARING",
          caseId,
          reminder: true,
        },
      });
    }
  }

  await prisma.auditLog.create({
    data: {
      userId: session!.user.id,
      action: "ECOURTS_SYNC",
      entity: "Case",
      entityId: caseId,
      details: `Synced with eCourts: ${localCase.cnrNumber}`,
    },
  });

  return NextResponse.json({
    success: true,
    case: updated,
    ecourtData,
  });
}
