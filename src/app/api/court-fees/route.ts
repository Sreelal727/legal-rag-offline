import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, getOrgId } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const { error, session } = await withAuth("billing:read");
  if (error) return error;

  const searchParams = request.nextUrl.searchParams;
  const caseId = searchParams.get("caseId");

  const where: any = { organizationId: getOrgId(session!) };
  if (caseId) where.caseId = caseId;

  const entries = await prisma.courtFeeEntry.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      case: { select: { id: true, caseNumber: true, title: true } },
      creator: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(entries);
}

export async function POST(request: NextRequest) {
  const { error, session } = await withAuth("billing:write");
  if (error) return error;

  const body = await request.json();
  const { caseId, amount, feeType, description, paidDate, receiptNumber, isPaid } = body;

  if (!caseId || !amount) {
    return NextResponse.json({ error: "caseId and amount are required" }, { status: 400 });
  }

  const entry = await prisma.courtFeeEntry.create({
    data: {
      organizationId: getOrgId(session!),
      caseId,
      amount: parseFloat(amount),
      feeType: feeType || "COURT_FEE",
      description: description || null,
      paidDate: paidDate ? new Date(paidDate) : null,
      receiptNumber: receiptNumber || null,
      isPaid: isPaid || false,
      createdBy: session!.user.id,
    },
  });

  return NextResponse.json(entry, { status: 201 });
}
