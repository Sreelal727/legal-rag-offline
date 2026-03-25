import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, getOrgId } from "@/lib/api-utils";
import { runVerifications } from "@/lib/scrutiny/verifier";

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
    select: { verificationData: true },
  });

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const data = report.verificationData ? JSON.parse(report.verificationData) : [];
  return NextResponse.json({ verifications: data });
}

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

  const nodes = await prisma.deedChainNode.findMany({
    where: { scrutinyReportId: id },
  });

  const docs = await prisma.propertyDocument.findMany({
    where: { scrutinyReportId: id },
  });

  const verifications = runVerifications(nodes, docs);

  await prisma.scrutinyReport.update({
    where: { id },
    data: { verificationData: JSON.stringify(verifications) },
  });

  return NextResponse.json({ verifications });
}
