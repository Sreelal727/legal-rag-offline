import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, getOrgId } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const { error, session } = await withAuth("billing:read");
  if (error) return error;

  const searchParams = request.nextUrl.searchParams;
  const clientId = searchParams.get("clientId");
  const caseId = searchParams.get("caseId");

  const where: any = { organizationId: getOrgId(session!) };
  if (clientId) where.clientId = clientId;
  if (caseId) where.caseId = caseId;

  const agreements = await prisma.feeAgreement.findMany({
    where,
    orderBy: { agreementDate: "desc" },
    include: {
      client: { select: { id: true, name: true } },
      case: { select: { id: true, caseNumber: true } },
      creator: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(agreements);
}

export async function POST(request: NextRequest) {
  const { error, session } = await withAuth("billing:write");
  if (error) return error;

  const body = await request.json();
  const { clientId, caseId, agreementDate, totalFee, retainerFee, appearanceFee, successFee, paymentTerms, notes } = body;

  if (!clientId || !agreementDate || !totalFee) {
    return NextResponse.json({ error: "clientId, agreementDate, totalFee required" }, { status: 400 });
  }

  const agreement = await prisma.feeAgreement.create({
    data: {
      organizationId: getOrgId(session!),
      clientId,
      caseId: caseId || null,
      agreementDate: new Date(agreementDate),
      totalFee: parseFloat(totalFee),
      retainerFee: retainerFee ? parseFloat(retainerFee) : 0,
      appearanceFee: appearanceFee ? parseFloat(appearanceFee) : 0,
      successFee: successFee ? parseFloat(successFee) : 0,
      paymentTerms: paymentTerms || null,
      notes: notes || null,
      createdBy: session!.user.id,
    },
    include: {
      client: { select: { name: true } },
      case: { select: { caseNumber: true } },
    },
  });

  return NextResponse.json(agreement, { status: 201 });
}
