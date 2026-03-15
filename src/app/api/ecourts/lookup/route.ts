import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-utils";
import { lookupByCNR } from "@/lib/ecourts/service";

export async function POST(request: NextRequest) {
  const { error } = await withAuth("cases:read");
  if (error) return error;

  const { cnrNumber } = await request.json();

  if (!cnrNumber) {
    return NextResponse.json({ error: "CNR number is required" }, { status: 400 });
  }

  const result = await lookupByCNR(cnrNumber);

  if (!result) {
    return NextResponse.json(
      { error: "Case not found or eCourts service unavailable" },
      { status: 404 }
    );
  }

  return NextResponse.json(result);
}
