import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-utils";
import {
  searchByCaseNumber,
  searchByPartyName,
  searchByAdvocateName,
  searchByFIRNumber,
} from "@/lib/ecourts/service";
import type { CourtKey } from "@/lib/ecourts/config";

export async function POST(request: NextRequest) {
  const { error } = await withAuth("cases:read");
  if (error) return error;

  const body = await request.json();
  const { searchType, court, ...params } = body;

  if (!searchType || !court) {
    return NextResponse.json({ error: "searchType and court are required" }, { status: 400 });
  }

  let results;

  switch (searchType) {
    case "caseNumber":
      results = await searchByCaseNumber(
        court as CourtKey,
        params.caseType || "",
        params.caseNumber || "",
        params.year || ""
      );
      break;
    case "partyName":
      results = await searchByPartyName(court as CourtKey, params.partyName || "", params.year);
      break;
    case "advocateName":
      results = await searchByAdvocateName(court as CourtKey, params.advocateName || "", params.year);
      break;
    case "firNumber":
      results = await searchByFIRNumber(
        court as CourtKey,
        params.policeStation || "",
        params.firNumber || "",
        params.year || ""
      );
      break;
    default:
      return NextResponse.json({ error: "Invalid search type" }, { status: 400 });
  }

  return NextResponse.json(results);
}
