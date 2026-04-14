import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, getOrgId } from "@/lib/api-utils";
import { calculateInterest } from "@/lib/interest-calculator";

export async function GET(request: NextRequest) {
  const { error, session } = await withAuth("cases:read");
  if (error) return error;

  const organizationId = getOrgId(session!);
  const caseId = request.nextUrl.searchParams.get("caseId") || undefined;

  const where: any = { organizationId };
  if (caseId) where.caseId = caseId;

  const statements = await prisma.accountStatement.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      case: { select: { id: true, caseNumber: true, title: true } },
    },
  });

  return NextResponse.json(statements);
}

export async function POST(request: NextRequest) {
  const { error, session } = await withAuth("cases:write");
  if (error) return error;

  const organizationId = getOrgId(session!);
  const body = await request.json();
  const {
    caseId,
    title,
    asOnDate,
    principalAmount,
    interestRate,
    penalRate,
    rests,
    fromDate,
    toDate,
    transactions,
    notes,
  } = body;

  if (!caseId || !principalAmount || !interestRate || !fromDate || !toDate) {
    return NextResponse.json(
      { error: "caseId, principalAmount, interestRate, fromDate, toDate are required" },
      { status: 400 }
    );
  }

  // Verify case belongs to org
  const c = await prisma.case.findFirst({ where: { id: caseId, organizationId } });
  if (!c) return NextResponse.json({ error: "Case not found" }, { status: 404 });

  const result = calculateInterest({
    principalAmount: parseFloat(principalAmount),
    interestRate: parseFloat(interestRate),
    penalRate: penalRate ? parseFloat(penalRate) : 0,
    rests: rests || "QUARTERLY",
    fromDate,
    toDate,
    transactions: transactions || [],
  });

  const statement = await prisma.accountStatement.create({
    data: {
      caseId,
      title: title || "Statement of Accounts",
      asOnDate: new Date(asOnDate || toDate),
      principalAmount: parseFloat(principalAmount),
      interestRate: parseFloat(interestRate),
      penalRate: penalRate ? parseFloat(penalRate) : null,
      rests: rests || "QUARTERLY",
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
      totalInterest: result.totalInterest,
      totalPenalInterest: result.totalPenalInterest,
      totalDue: result.totalDue,
      transactions: transactions ? JSON.stringify(transactions) : null,
      schedule: JSON.stringify(result.periods),
      notes: notes || null,
      organizationId,
      createdBy: session!.user.id,
    },
  });

  return NextResponse.json({ statement, calculation: result }, { status: 201 });
}
