import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-utils";
import { calculateInterest } from "@/lib/interest-calculator";

/**
 * Stateless endpoint to compute interest without persisting.
 * Useful for live preview in the SOA UI.
 */
export async function POST(request: NextRequest) {
  const { error } = await withAuth("cases:read");
  if (error) return error;

  const body = await request.json();
  const {
    principalAmount,
    interestRate,
    penalRate,
    rests,
    fromDate,
    toDate,
    transactions,
    penalStartDate,
  } = body;

  if (!principalAmount || !interestRate || !fromDate || !toDate) {
    return NextResponse.json(
      { error: "principalAmount, interestRate, fromDate, toDate are required" },
      { status: 400 }
    );
  }

  try {
    const result = calculateInterest({
      principalAmount: parseFloat(principalAmount),
      interestRate: parseFloat(interestRate),
      penalRate: penalRate ? parseFloat(penalRate) : 0,
      rests: rests || "QUARTERLY",
      fromDate,
      toDate,
      transactions: transactions || [],
      penalStartDate,
    });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Calculation failed" }, { status: 500 });
  }
}
