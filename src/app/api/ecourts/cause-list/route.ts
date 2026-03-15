import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-utils";
import { getCauseList } from "@/lib/ecourts/service";
import type { CourtKey } from "@/lib/ecourts/config";

export async function POST(request: NextRequest) {
  const { error } = await withAuth("diary:read");
  if (error) return error;

  const { court, date } = await request.json();

  if (!court || !date) {
    return NextResponse.json({ error: "Court and date are required" }, { status: 400 });
  }

  const results = await getCauseList(court as CourtKey, date);
  return NextResponse.json(results);
}
