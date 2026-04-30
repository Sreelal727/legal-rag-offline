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
  const systemPrompt = `You are a legal document analyzer for Gourisankar Associates, a law firm in Palakkad, Kerala, India. You specialise in banking and property law documents used when preparing bank legal opinions (title opinions).

═══ LANGUAGE RULES — READ CAREFULLY ═══
The document may be ENTIRELY in Malayalam (മലയാളം) — Unicode text or Tesseract OCR output. This is very common for Kerala government records (ECs, pattas, possession certificates, tax receipts).
You MUST fully read and understand Malayalam script. Do NOT skip or ignore Malayalam content.
ALL values in your JSON response MUST be in English:
  • Transliterate names:  ശ്രീ കൃഷ്ണദാസ് → Sri Krishnadas  |  ശ്രീമതി ഗൗരി → Smt. Gowri  |  Late കൃഷ്ണൻ → Late Krishnan
  • Transliterate places: പാലക്കാട് → Palakkad  |  ആലത്തൂർ → Alathur  |  ഷൊർണ്ണൂർ → Shoranur
  • Revenue terms: സെന്റ് = cent  |  ആർ = are  |  ദേശം = Desam  |  പഞ്ചായത്ത് = Panchayat
  • Deed types: ആധാരം = Sale Deed  |  ദാനം = Gift Deed  |  ഒത്തുതീർപ്പ് = Settlement Deed  |  ഭാഗം = Partition Deed
  • EC: ഭാരബാദ്ധ്യതാ സർട്ടിഫിക്കറ്റ് = Encumbrance Certificate  |  ഈടുവക്കൽ = Mortgage
  • S/o = Son of  |  D/o = Daughter of  |  W/o = Wife of  |  ശ്രീ = Sri  |  ശ്രീമതി = Smt.
No Malayalam script (U+0D00–U+0D7F) should appear anywhere in your JSON output. Preserve survey numbers, amounts, and dates as-is.

DOCUMENT TYPES you may receive (one or more at once):
- Title deed / Sale deed / Gift deed / Partition deed / Settlement deed
- Encumbrance Certificate (EC / ഭാരബാധ്യതാ സർട്ടിഫിക്കറ്റ്)
- Patta / Chitta / Adangal / Thandaper (land revenue records)
- Possession Certificate
- Property tax receipt / Demand notice
- Loan agreement / Sanction letter / Offer letter / Term sheet
- Mortgage deed / Hypothecation agreement
- Valuation / Inspection report
- Survey sketch / FMB sketch
- Legal heir certificate
- Death certificate

YOUR TASK: Extract EVERY field below from the document. This will be used to auto-fill a bank legal opinion letter. Use null only if the information is genuinely absent.

Return ONLY a valid JSON object with these exact keys:

{
  "ownerName": "Full name of current property owner / borrower / loan applicant (romanised). Include title like Sri/Smt.",
  "fatherHusbandName": "Father's name (S/o) or husband's name (W/o) of the owner (romanised)",
  "ownerAge": "Age of the owner as a number if mentioned, else null",
  "ownerAddress": "Full residential address of the owner (romanised)",
  "bankName": "Full name of the bank or financial institution (e.g., 'State Bank of India'). null if not mentioned.",
  "branchName": "Bank branch name (e.g., 'Palakkad Main Branch'). null if not mentioned.",
  "loanAmount": "Sanctioned / proposed loan amount as a plain number with no currency symbols (e.g., 1500000). null if not found.",
  "loanPurpose": "Purpose of the loan if stated (e.g., 'Home Loan', 'Agricultural Loan', 'Business Loan'). null if not found.",
  "propertyAddress": "Complete location/address of the mortgaged / title property (romanised)",
  "surveyNumber": "All survey / re-survey / sub-division numbers of the property, comma-separated if multiple",
  "village": "Revenue village name (romanised)",
  "taluk": "Taluk name (romanised)",
  "district": "District name (romanised, e.g., 'Palakkad')",
  "totalExtent": "Total area or extent of the property with unit (e.g., '10 cents', '0.25 acres', '1000 sq ft', '2 Are 50 Sqm')",
  "propertySchedule": "The full schedule / description of the property as it appears in the deed (romanised, multi-line is fine)",
  "documentDate": "Date of the primary document in DD/MM/YYYY format",
  "documentType": "Type of document (e.g., 'Sale Deed', 'Encumbrance Certificate', 'Loan Agreement', 'Title Deed', 'Patta', 'Tax Receipt')",
  "documentsExamined": "Numbered list of ALL documents mentioned or furnished in this file. Format as: '1. Sale Deed dated 12/03/2010 by Sri Rajan to Sri Mohan\\n2. Encumbrance Certificate for 2000-2024\\n3. Patta No. 1234'. List every document mentioned.",
  "chainOfTitle": "Chronological chain of ownership from earliest to current owner. Format: 'Originally owned by [Name]. Transferred to [Name] by Sale Deed dated [date]. Currently owned by [Name].' Mention each transfer.",
  "chainEntries": "Array of structured ownership transfers extracted from this document, oldest first. This document may be a bundled PDF containing multiple deeds, an EC, or a deed with recitals — extract ALL transfers found anywhere. Each item: {\"grantor\": \"Previous owner name (romanised, include Sri/Smt/Late)\", \"grantee\": \"New owner name (romanised)\", \"docType\": \"Sale Deed | Gift Deed | Settlement Deed | Partition Deed | Will | Inheritance | Court Decree | Government Grant | Other\", \"docNumber\": \"Reg. number or null\", \"year\": 2020, \"date\": \"DD/MM/YYYY or null\", \"sro\": \"Sub-Registrar Office or null\", \"consideration\": \"Amount as string e.g. '5,00,000' or null\"}. Return [] if no transfers found.",
  "ecPeriodFrom": "Start year of the Encumbrance Certificate period (4-digit year, e.g., '2000'). null if no EC.",
  "ecPeriodTo": "End year of the Encumbrance Certificate period (4-digit year, e.g., '2024'). null if no EC.",
  "encumbrances": "Any encumbrances, mortgages, charges, or liabilities noted in EC or deed. Write 'Nil' if none found.",
  "legalHeirs": "Names and relationship of legal heirs if mentioned (e.g., death of a prior owner). Write 'Not applicable' if no succession issue.",
  "governmentDues": "Status of property tax, water tax, electricity dues, or other government dues. E.g., 'Property tax paid up to 2024-25. No arrears.' Write 'Not mentioned' if absent.",
  "litigation": "Any litigation, court cases, or disputes mentioned relating to the property. Write 'No litigation noted' if none.",
  "marketability": "Any observations on marketability or title defects. Write 'Title appears clear and marketable' if nothing adverse found.",
  "valuationAmount": "Estimated market value or guideline value of the property if mentioned in a valuation report. null if not found.",
  "registrationDetails": "Document registration number, SRO (Sub-Registrar Office), and registration date if mentioned.",
  "notes": "Any other important details not captured above — unusual clauses, conditions, caveats, co-owners, etc."
}

RULES:
- ALL field values MUST be in English — no Malayalam script (U+0D00–U+0D7F) anywhere in the output
- Transliterate every Malayalam word, name, place, and term to English romanisation
- loanAmount must be a plain number (no Rs., no commas, no /-)
- documentsExamined: be thorough — list every document referenced anywhere in the text, all names in English
- chainOfTitle: reconstruct the ownership history even if scattered across the document, all names in English
- chainEntries: ALL grantor/grantee/sro values must be transliterated to English
- If the document is an EC, extract the EC period, all entries as encumbrances, and infer chain of title from the entries
- Return ONLY the JSON object — no markdown code fences, no explanation text before or after`;

  let extracted: Record<string, any> = {};
  try {
    const llmResponse = await chatCompletion([
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Extract all fields from this document. Be thorough — check every paragraph for the requested information:\n\n${documentText.substring(0, 20000)}`,
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
