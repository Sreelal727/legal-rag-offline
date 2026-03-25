import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, getOrgId } from "@/lib/api-utils";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await withAuth("scrutiny:approve");
  if (error) return error;

  const organizationId = getOrgId(session!);
  const { id } = await params;

  const report = await prisma.scrutinyReport.findFirst({
    where: { id, organizationId },
  });

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  if (report.status !== "REVIEW") {
    return NextResponse.json(
      { error: "Report must be in REVIEW status to approve" },
      { status: 400 }
    );
  }

  await prisma.scrutinyReport.update({
    where: { id },
    data: { status: "APPROVED" },
  });

  await prisma.auditLog.create({
    data: {
      userId: session!.user.id,
      action: "APPROVE",
      entity: "ScrutinyReport",
      entityId: id,
      details: `Approved scrutiny report: ${report.title}`,
      organizationId,
    },
  });

  return NextResponse.json({ success: true, status: "APPROVED" });
}
