import { NextRequest, NextResponse } from "next/server";
import { withAuth, getOrgId } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

// Maps detected bank-name patterns to the subcategory stored in FormatSample.
const BANK_FOLDER_MAP: Array<[RegExp, string]> = [
  [/punjab\s*national|\bpnb\b/i, "PNB"],
  [/state\s*bank\s*of\s*india|\bsbi\b/i, "SBI"],
  [/bank\s*of\s*baroda|\bbob\b/i, "BOB"],
  [/bank\s*of\s*india|\bboi\b/i, "BOI"],
  [/canara\s*bank|\bcb\b/i, "CB"],
  [/dhanlaxmi|\bdlb\b/i, "DLB"],
  [/karur\s*vysya|\bkvb\b/i, "KVB"],
  [/south\s*indian\s*bank|\bsib\b/i, "SIB"],
  [/icici/i, "ICICI"],
  [/hdfc/i, "HDFC"],
  [/axis\s*bank/i, "Axis"],
  [/\bindian\s*bank\b/i, "Indian Bank"],
  [/kotak/i, "KOTAK"],
  [/indusind|indus\s*bank/i, "INDUS"],
  [/allahabad/i, "Allahabad"],
  [/esaf/i, "ESAF"],
  [/manapuram/i, "MANAPURAM"],
  [/hudco/i, "HUDCO"],
  [/city\s*union/i, "City Union Bnk"],
  [/\bing\s*bank|\bing\s*vysya/i, "ING"],
];

function detectBankFolder(bankName: string): string | null {
  if (!bankName) return null;
  for (const [pattern, folder] of BANK_FOLDER_MAP) {
    if (pattern.test(bankName)) return folder;
  }
  return null;
}

export async function GET(request: NextRequest) {
  const { error, session } = await withAuth("notices:read");
  if (error) return error;

  const bankName = request.nextUrl.searchParams.get("bankName") || "";
  if (!bankName.trim()) {
    return NextResponse.json({ found: false, reason: "No bank name provided" });
  }

  const folder = detectBankFolder(bankName);
  if (!folder) {
    return NextResponse.json({ found: false, reason: "Bank not in archive" });
  }

  const orgId = getOrgId(session!);

  const format = await prisma.formatSample.findFirst({
    where: {
      organizationId: orgId,
      category: "bank-opinion",
      subcategory: folder,
      isActive: true,
    },
    select: { id: true, fileName: true, textContent: true, subcategory: true },
  });

  if (!format) {
    return NextResponse.json({
      found: false,
      bankFolder: folder,
      reason: "No format in database for this bank — run import-bank-formats.ts",
    });
  }

  return NextResponse.json({
    found: true,
    bankFolder: format.subcategory,
    fileName: format.fileName,
    text: format.textContent.substring(0, 25000),
    textLength: format.textContent.length,
  });
}
