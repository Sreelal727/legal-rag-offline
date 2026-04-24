import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-utils";
import { extractDocText } from "@/lib/document-analyzer";
import { chatCompletion } from "@/lib/llm";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";

export const maxDuration = 300; // OCR on scanned PDFs can take a few minutes

/**
 * POST /api/bank-opinions/extract-document
 *
 * Accepts a title document (title deed, encumbrance certificate, sale deed,
 * patta, tax receipt, loan agreement, sanction letter, etc.) uploaded for a
 * bank legal opinion.  Extracts text — including OCR for scanned/Malayalam
 * documents — then uses an LLM to pull out the key fields needed to draft
 * a bank opinion letter.
 */
export async function POST(request: NextRequest) {
  const { error } = await withAuth("documents:upload");
  if (error) return error;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const ext = file.name.toLowerCase().split(".").pop();
  const allowed = ["pdf", "doc", "docx", "txt", "rtf"];
  if (!ext || !allowed.includes(ext)) {
    return NextResponse.json(
      { error: `Unsupported file type. Allowed: ${allowed.join(", ")}` },
      { status: 400 }
    );
  }

  // Save to temp file so extractDocText can read it
  const tempDir = path.join(process.cwd(), "uploads", "temp");
  await mkdir(tempDir, { recursive: true });
  const tempPath = path.join(tempDir, `${Date.now()}-${file.name}`);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(tempPath, buffer);

  let documentText = "";
  try {
    documentText = await extractDocText(tempPath);
  } catch (err: any) {
    return NextResponse.json(
      { error: `Could not read document: ${err.message}` },
      { status: 400 }
    );
  } finally {
    try { await unlink(tempPath); } catch { /* ignore */ }
  }

  if (!documentText || documentText.replace(/\s/g, "").length < 30) {
    return NextResponse.json(
      { error: "Document appears to be empty or could not be read. Please try a clearer scan or a text-based PDF." },
      { status: 400 }
    );
  }

  // ── LLM extraction ────────────────────────────────────────────────────────
  const systemPrompt = `You are a legal document analyzer for Gourisankar Associates, a law firm in Palakkad, Kerala, India. You specialise in banking and property law documents.

LANGUAGE: The document may be written in English, Malayalam (മലയാളം), or a mix of both — this is completely normal in Kerala land records, bank documents, and title deeds. You MUST fully read and understand Malayalam text. When filling JSON fields, transliterate Malayalam names, addresses, and place names to standard English romanisation (e.g., "ശ്രീ കൃഷ്ണദാസ്" → "Sri Krishnadas", "പാലക്കാട്" → "Palakkad", "ആലത്തൂർ" → "Alathur"). Keep survey numbers, amounts, and dates as-is.

DOCUMENT TYPES: The document may be any of the following related to a bank loan or property title:
- Title deed / Sale deed / Gift deed / Partition deed
- Encumbrance Certificate (EC)
- Patta / Chitta / Adangal (land records)
- Possession Certificate
- Property tax receipt
- Loan agreement / Sanction letter / Offer letter
- Mortgage deed / Hypothecation agreement
- Valuation report
- Survey sketch

YOUR TASK: Extract the following fields from the document and return ONLY a valid JSON object. Use null for any field not found.

{
  "ownerName": "Full name of the property owner / borrower / loan applicant (romanised)",
  "fatherHusbandName": "Father's or husband's name if present (romanised)",
  "ownerAddress": "Residential address of the owner if present (romanised)",
  "bankName": "Name of the bank or financial institution mentioned (e.g., 'State Bank of India')",
  "branchName": "Branch name if mentioned (e.g., 'Palakkad Main Branch')",
  "loanAmount": "Loan amount as a number (digits only, no currency symbols) or null",
  "propertyAddress": "Full address/location of the property (romanised)",
  "surveyNumber": "Survey number(s) of the property if present",
  "village": "Revenue village name (romanised)",
  "taluk": "Taluk name (romanised)",
  "district": "District name (romanised, e.g., 'Palakkad')",
  "totalExtent": "Total area/extent of the property (e.g., '10 cents', '0.25 acres', '1000 sq ft')",
  "documentDate": "Date of the document in DD/MM/YYYY format if present",
  "documentType": "Type of document detected (e.g., 'Sale Deed', 'Encumbrance Certificate', 'Loan Agreement', 'Title Deed', etc.)",
  "ecPeriodFrom": "EC period start year if this is an EC (e.g., '2000')",
  "ecPeriodTo": "EC period end year if this is an EC (e.g., '2024')",
  "priorOwners": "Chain of title / prior owners if mentioned (brief summary)",
  "encumbrances": "Any encumbrances/liabilities noted, or 'Nil' if none",
  "notes": "Any other important details not captured above"
}

IMPORTANT RULES:
- Always transliterate Malayalam to English in the output fields
- For loanAmount, return ONLY the number (e.g., 650000 not "Rs. 6,50,000")
- If the document mentions multiple survey numbers, list them all in surveyNumber
- If no bank is mentioned, set bankName to null
- Return ONLY the JSON object — no markdown, no explanation, no prefix text`;

  let extracted: Record<string, any> = {};
  try {
    const llmResponse = await chatCompletion([
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Extract the fields from this document:\n\n${documentText.substring(0, 12000)}`,
      },
    ]) as string;

    // Strip markdown fences if present
    let jsonStr = llmResponse.trim();
    jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    extracted = JSON.parse(jsonStr);
  } catch (err: any) {
    // LLM failed or returned non-JSON — return raw text so user can fill manually
    return NextResponse.json({
      success: true,
      extracted: {},
      rawText: documentText.substring(0, 2000),
      warning: "AI could not parse the document structure. Please fill in the details manually.",
    });
  }

  return NextResponse.json({
    success: true,
    extracted,
    documentType: extracted.documentType || "Unknown",
    rawTextLength: documentText.length,
    rawTextPreview: documentText.substring(0, 300),
  });
}
