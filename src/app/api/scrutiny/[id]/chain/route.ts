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
    select: { id: true },
  });

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const nodes = await prisma.deedChainNode.findMany({
    where: { scrutinyReportId: id },
    orderBy: { chainDepth: "asc" },
  });

  return NextResponse.json({ nodes });
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

  const report = await prisma.scrutinyReport.findFirst({
    where: { id, organizationId },
    select: { id: true },
  });

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const { nodeId, ...updateData } = body;

  if (!nodeId) {
    return NextResponse.json({ error: "nodeId required" }, { status: 400 });
  }

  const node = await prisma.deedChainNode.update({
    where: { id: nodeId },
    data: {
      ...(updateData.documentNumber !== undefined && { documentNumber: updateData.documentNumber }),
      ...(updateData.deedType !== undefined && { deedType: updateData.deedType }),
      ...(updateData.notes !== undefined && { notes: updateData.notes }),
    },
  });

  return NextResponse.json(node);
}
