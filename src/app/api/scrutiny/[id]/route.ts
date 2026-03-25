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
    include: {
      creator: { select: { id: true, name: true, role: true } },
      case: { select: { id: true, caseNumber: true, title: true } },
      client: { select: { id: true, name: true } },
      propertyDocuments: {
        orderBy: { sortOrder: "asc" },
      },
      deedChainNodes: {
        orderBy: { chainDepth: "asc" },
      },
    },
  });

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  return NextResponse.json(report);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await withAuth("scrutiny:write");
  if (error) return error;

  const organizationId = getOrgId(session!);
  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.scrutinyReport.findFirst({
    where: { id, organizationId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const {
    title, referenceNumber, bankName, branchName, borrowerName,
    propertyAddress, surveyNumbers, status, caseId, clientId,
    formatSampleId, reportContent, reportNotes,
  } = body;

  const report = await prisma.scrutinyReport.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(referenceNumber !== undefined && { referenceNumber }),
      ...(bankName !== undefined && { bankName }),
      ...(branchName !== undefined && { branchName }),
      ...(borrowerName !== undefined && { borrowerName }),
      ...(propertyAddress !== undefined && { propertyAddress }),
      ...(surveyNumbers !== undefined && { surveyNumbers: JSON.stringify(surveyNumbers) }),
      ...(status !== undefined && { status }),
      ...(caseId !== undefined && { caseId: caseId || null }),
      ...(clientId !== undefined && { clientId: clientId || null }),
      ...(formatSampleId !== undefined && { formatSampleId: formatSampleId || null }),
      ...(reportContent !== undefined && { reportContent }),
      ...(reportNotes !== undefined && { reportNotes }),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session!.user.id,
      action: "UPDATE",
      entity: "ScrutinyReport",
      entityId: id,
      details: `Updated scrutiny report: ${report.title}`,
      organizationId,
    },
  });

  return NextResponse.json(report);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await withAuth("scrutiny:write");
  if (error) return error;

  const organizationId = getOrgId(session!);
  const { id } = await params;

  const existing = await prisma.scrutinyReport.findFirst({
    where: { id, organizationId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  await prisma.scrutinyReport.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      userId: session!.user.id,
      action: "DELETE",
      entity: "ScrutinyReport",
      entityId: id,
      details: `Deleted scrutiny report: ${existing.title}`,
      organizationId,
    },
  });

  return NextResponse.json({ success: true });
}
