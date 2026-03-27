import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, getOrgId } from "@/lib/api-utils";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await withAuth("cases:read");
  if (error) return error;

  const { id } = await params;
  const opinion = await prisma.bankOpinion.findFirst({
    where: { id, organizationId: getOrgId(session!) },
    include: {
      case: { select: { id: true, caseNumber: true, courtName: true } },
      client: { select: { id: true, name: true } },
      creator: { select: { name: true } },
    },
  });

  if (!opinion) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(opinion);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await withAuth("cases:write");
  if (error) return error;

  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.bankOpinion.findFirst({
    where: { id, organizationId: getOrgId(session!) },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const opinion = await prisma.bankOpinion.update({
    where: { id },
    data: {
      bankName: body.bankName || undefined,
      branchName: body.branchName !== undefined ? body.branchName : undefined,
      borrowerName: body.borrowerName || undefined,
      propertyAddress: body.propertyAddress !== undefined ? body.propertyAddress : undefined,
      loanAmount: body.loanAmount !== undefined ? parseFloat(body.loanAmount) : undefined,
      content: body.content !== undefined ? body.content : undefined,
      status: body.status || undefined,
    },
  });

  return NextResponse.json(opinion);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await withAuth("cases:write");
  if (error) return error;

  const { id } = await params;
  const existing = await prisma.bankOpinion.findFirst({
    where: { id, organizationId: getOrgId(session!) },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.bankOpinion.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
