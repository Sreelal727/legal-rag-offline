import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, getOrgId } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const { error, session } = await withAuth("cases:read");
  if (error) return error;

  const opinions = await prisma.bankOpinion.findMany({
    where: { organizationId: getOrgId(session!) },
    orderBy: { createdAt: "desc" },
    include: {
      case: { select: { id: true, caseNumber: true } },
      client: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(opinions);
}

export async function POST(request: NextRequest) {
  const { error, session } = await withAuth("cases:write");
  if (error) return error;

  const body = await request.json();
  const { bankName, branchName, borrowerName, propertyAddress, loanAmount, caseId, clientId, content } = body;

  if (!bankName || !borrowerName) {
    return NextResponse.json({ error: "bankName and borrowerName are required" }, { status: 400 });
  }

  const opinion = await prisma.bankOpinion.create({
    data: {
      organizationId: getOrgId(session!),
      bankName,
      branchName: branchName || null,
      borrowerName,
      propertyAddress: propertyAddress || null,
      loanAmount: loanAmount ? parseFloat(loanAmount) : null,
      content: content || null,
      caseId: caseId || null,
      clientId: clientId || null,
      createdBy: session!.user.id,
    },
  });

  return NextResponse.json(opinion, { status: 201 });
}
