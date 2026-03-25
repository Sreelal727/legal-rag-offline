import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, getOrgId } from "@/lib/api-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const { error, session } = await withAuth("scrutiny:read");
  if (error) return error;

  const organizationId = getOrgId(session!);
  const { id, docId } = await params;

  const report = await prisma.scrutinyReport.findFirst({
    where: { id, organizationId },
    select: { id: true },
  });

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const doc = await prisma.propertyDocument.findFirst({
    where: { id: docId, scrutinyReportId: id },
  });

  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  return NextResponse.json(doc);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const { error, session } = await withAuth("scrutiny:write");
  if (error) return error;

  const organizationId = getOrgId(session!);
  const { id, docId } = await params;
  const body = await request.json();

  const report = await prisma.scrutinyReport.findFirst({
    where: { id, organizationId },
    select: { id: true },
  });

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const doc = await prisma.propertyDocument.update({
    where: { id: docId },
    data: {
      ...(body.documentType !== undefined && { documentType: body.documentType }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.verificationStatus !== undefined && { verificationStatus: body.verificationStatus }),
      ...(body.verificationNotes !== undefined && { verificationNotes: body.verificationNotes }),
    },
  });

  return NextResponse.json(doc);
}
