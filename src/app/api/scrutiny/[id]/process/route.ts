import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, getOrgId } from "@/lib/api-utils";
import { processScrutinyBundle } from "@/lib/scrutiny/pipeline";

export const maxDuration = 300; // 5 minutes for large bundles

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await withAuth("scrutiny:write");
  if (error) return error;

  const organizationId = getOrgId(session!);
  const { id } = await params;

  const report = await prisma.scrutinyReport.findFirst({
    where: { id, organizationId },
    include: { _count: { select: { propertyDocuments: true } } },
  });

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  if (report._count.propertyDocuments === 0) {
    return NextResponse.json({ error: "No documents to process" }, { status: 400 });
  }

  if (report.status === "PROCESSING") {
    return NextResponse.json({ error: "Already processing" }, { status: 400 });
  }

  // Start processing in background (non-blocking)
  processScrutinyBundle(id).catch((err) => {
    console.error(`Scrutiny processing failed for ${id}:`, err);
    prisma.scrutinyReport.update({
      where: { id },
      data: {
        status: "DRAFT",
        processingStatus: JSON.stringify({
          currentStep: "failed",
          error: err.message,
          steps: [],
          overallProgress: 0,
        }),
      },
    }).catch(console.error);
  });

  // Update status immediately
  await prisma.scrutinyReport.update({
    where: { id },
    data: { status: "PROCESSING" },
  });

  await prisma.auditLog.create({
    data: {
      userId: session!.user.id,
      action: "PROCESS",
      entity: "ScrutinyReport",
      entityId: id,
      details: `Started processing scrutiny bundle (${report._count.propertyDocuments} documents)`,
      organizationId,
    },
  });

  return NextResponse.json({ message: "Processing started" });
}
