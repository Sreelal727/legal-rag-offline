import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, getOrgId } from "@/lib/api-utils";
import { generateScrutinyReport } from "@/lib/scrutiny/report-generator";

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
  });

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  try {
    const reportContent = await generateScrutinyReport(id);

    await prisma.scrutinyReport.update({
      where: { id },
      data: { reportContent },
    });

    await prisma.auditLog.create({
      data: {
        userId: session!.user.id,
        action: "GENERATE",
        entity: "ScrutinyReport",
        entityId: id,
        details: "Generated scrutiny report content",
        organizationId,
      },
    });

    return NextResponse.json({ reportContent });
  } catch (err: any) {
    return NextResponse.json(
      { error: `Report generation failed: ${err.message}` },
      { status: 500 }
    );
  }
}
