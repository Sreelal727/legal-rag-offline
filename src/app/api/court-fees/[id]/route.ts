import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, getOrgId } from "@/lib/api-utils";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await withAuth("billing:write");
  if (error) return error;

  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.courtFeeEntry.findFirst({
    where: { id, organizationId: getOrgId(session!) },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const entry = await prisma.courtFeeEntry.update({
    where: { id },
    data: {
      amount: body.amount !== undefined ? parseFloat(body.amount) : undefined,
      feeType: body.feeType || undefined,
      description: body.description !== undefined ? body.description : undefined,
      paidDate: body.paidDate ? new Date(body.paidDate) : undefined,
      receiptNumber: body.receiptNumber !== undefined ? body.receiptNumber : undefined,
      isPaid: body.isPaid !== undefined ? body.isPaid : undefined,
    },
  });

  return NextResponse.json(entry);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await withAuth("billing:write");
  if (error) return error;

  const { id } = await params;
  const existing = await prisma.courtFeeEntry.findFirst({
    where: { id, organizationId: getOrgId(session!) },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.courtFeeEntry.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
