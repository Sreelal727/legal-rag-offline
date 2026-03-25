import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, getOrgId } from "@/lib/api-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await withAuth("scrutiny:read");
  if (error) return error;

  const organizationId = getOrgId(session!);
  const { id } = await params;

  const report = await prisma.scrutinyReport.findFirst({
    where: { id, organizationId },
    select: { processingStatus: true, status: true },
  });

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const status = report.processingStatus ? JSON.parse(report.processingStatus) : {
    currentStep: report.status === "PROCESSING" ? "starting" : "idle",
    steps: [],
    overallProgress: 0,
  };

  return NextResponse.json(status);
}
