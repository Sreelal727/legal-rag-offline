import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-utils";
import { extractDocText } from "@/lib/document-analyzer";
import { chatCompletion } from "@/lib/llm";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";

export const maxDuration = 300;

/**
 * POST /api/bank-opinions/extract-all
 *
 * Accepts ONE OR MORE documents (title deed, EC, patta, loan agreement, etc.)
 * and extracts ALL fields needed for a bank opinion plus the full ownership
 * chain — in a single round-trip regardless of how many files are uploaded.
 *
 * Strategy:
 *  1. OCR / text-extract every file in parallel (fully local, no network).
 *  2. Combine all texts (with per-file headers) into one corpus.
 *  3. Fire TWO LLM calls in parallel:
 *       a) Field extraction  — produces the structured JSON fields.
 *       b) Chain extraction  — produces the structured ownership-transfer array.
 *  4. Return both results merged.
 */

const FIELD_SYSTEM_PROMPT = `You are a legal document analyzer for Gourisankar Associates, a law firm in Palakkad, Kerala, India. You specialise in banking and property law documents used when preparing bank legal opinions (title opinions).

LANGUAGE: Documents may be in English, Malayalam (മലയാളം), or a mix. Transliterate ALL Malayalam text to English romanisation (e.g. "ശ്രീ കൃഷ്ണദാസ്" → "Sri Krishnadas", "പാലക്കാട്" → "Palakkad"). Preserve survey numbers, amounts, and dates as-is.

IMPORTANT: You will receive text from MULTIPLE documents concatenated together, each marked with "=== DOCUMENT N: filename ===". Extract information by synthesising across ALL documents — a field found in document 3 is just as valid as one found in document 1. For fields like documentsExamined, merge lists from all files. For the ownership chain, trace it across all documents together.

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
  "documentTypes": "Comma-separated list of document types found across all uploaded files (e.g., 'Sale Deed, Encumbrance Certificate, Patta')",
  "documentsExamined": "Numbered list of ALL documents mentioned or furnished across ALL files. Format as: '1. Sale Deed dated 12/03/2010 by Sri Rajan to Sri Mohan\\n2. Encumbrance Certificate for 2000-2024\\n3. Patta No. 1234'. List every document mentioned in any file.",
  "chainOfTitle": "Chronological chain of ownership from earliest to current owner, synthesised across all documents. Format: 'Originally owned by [Name]. Transferred to [Name] by Sale Deed dated [date]. Currently owned by [Name].' Mention every transfer.",
  "ecPeriodFrom": "Start year of the Encumbrance Certificate period (4-digit year, e.g., '2000'). null if no EC in any file.",
  "ecPeriodTo": "End year of the Encumbrance Certificate period (4-digit year, e.g., '2024'). null if no EC in any file.",
  "encumbrances": "Any encumbrances, mortgages, charges, or liabilities noted in any EC or deed across all files. Write 'Nil' if none found.",
  "legalHeirs": "Names and relationship of legal heirs if mentioned in any file. Write 'Not applicable' if no succession issue.",
  "governmentDues": "Status of property tax, water tax, electricity dues, or other government dues found in any file. Write 'Not mentioned' if absent.",
  "litigation": "Any litigation, court cases, or disputes mentioned in any file relating to the property. Write 'No litigation noted' if none.",
  "marketability": "Any observations on marketability or title defects across all documents. Write 'Title appears clear and marketable' if nothing adverse found.",
  "valuationAmount": "Estimated market value or guideline value of the property if mentioned. null if not found.",
  "registrationDetails": "Document registration number(s), SRO(s), and registration date(s) found across all files.",
  "notes": "Any other important details not captured above — unusual clauses, conditions, caveats, co-owners, etc."
}

RULES:
- Synthesise across ALL documents — don't stop at the first file
- Transliterate ALL Malayalam text to English romanisation
- loanAmount must be a plain number (no Rs., no commas, no /-)
- documentsExamined: be thorough — list every document referenced across all files
- chainOfTitle: reconstruct the complete ownership history across all documents
- Return ONLY the JSON object — no markdown code fences, no explanation`;

const CHAIN_SYSTEM_PROMPT = `You are a legal document analyzer for a law firm in Kerala, India. Extract ALL property ownership transfers from the documents provided.

You will receive text from MULTIPLE documents concatenated together, each marked with "=== DOCUMENT N: filename ===". Extract ALL transfers from ALL documents. The chain may be split across documents — piece it together from all of them.

Documents that contain transfers:
- Sale deed / Gift deed / Settlement deed / Partition deed — the main transfer plus any prior transfers in recitals
- Encumbrance Certificate (EC) — every transaction entry is a transfer
- Any deed that references an earlier deed — include the referenced transfer too
- Patta / Adangal — revenue ownership history

Return a JSON array sorted OLDEST transfer first. Each item:
[
  {
    "grantor": "Full name of transferor (transliterate Malayalam → English, include Sri/Smt/Late)",
    "grantee": "Full name of transferee (transliterate Malayalam → English, include Sri/Smt)",
    "docType": "Sale Deed | Gift Deed | Settlement Deed | Partition Deed | Will | Inheritance | Court Decree | Government Grant | Mortgage | Release | Other",
    "docNumber": "Registration document number if stated, else null",
    "year": 2020,
    "date": "DD/MM/YYYY or null",
    "sro": "Sub-Registrar Office name (romanised) or null",
    "consideration": "Amount as string e.g. '5,00,000', or null for gifts / inheritance"
  }
]

RULES:
- Transliterate ALL Malayalam names and places to English romanisation
- List oldest → newest
- Include EVERY transfer mentioned anywhere across ALL documents, including in recitals and EC entries
- Return [] if no ownership transfers are found
- Return ONLY the JSON array — no markdown fences, no explanation`;

export async function POST(request: NextRequest) {
  const { error } = await withAuth("documents:upload");
  if (error) return error;

  const formData = await request.formData();
  const files = formData.getAll("files") as File[];

  if (files.length === 0) {
    return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
  }

  const tempDir = path.join(process.cwd(), "uploads", "temp");
  await mkdir(tempDir, { recursive: true });

  // ── Step 1: OCR / text-extract all files in parallel ──────────────────────
  const textResults = await Promise.allSettled(
    files.map(async (file) => {
      const ext = file.name.toLowerCase().split(".").pop();
      if (!ext || !["pdf", "doc", "docx", "txt", "rtf"].includes(ext)) {
        return { fileName: file.name, text: null, error: "unsupported file type" };
      }
      const tempPath = path.join(tempDir, `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`);
      try {
        await writeFile(tempPath, Buffer.from(await file.arrayBuffer()));
        const text = await extractDocText(tempPath);
        return {
          fileName: file.name,
          text: text && text.replace(/\s/g, "").length >= 30 ? text : null,
          error: text?.replace(/\s/g, "").length < 30 ? "no readable text" : null,
        };
      } catch (err: any) {
        return { fileName: file.name, text: null, error: err.message };
      } finally {
        try { await unlink(tempPath); } catch { /* ignore */ }
      }
    })
  );

  const fileTexts: Array<{ fileName: string; text: string }> = [];
  const fileErrors: string[] = [];

  for (const result of textResults) {
    if (result.status === "fulfilled") {
      if (result.value.text) {
        fileTexts.push({ fileName: result.value.fileName, text: result.value.text });
      } else {
        fileErrors.push(`${result.value.fileName}: ${result.value.error}`);
      }
    } else {
      fileErrors.push(`unknown file: ${result.reason}`);
    }
  }

  if (fileTexts.length === 0) {
    return NextResponse.json(
      { error: "None of the uploaded files could be read. Please try clearer scans or text-based PDFs." },
      { status: 400 }
    );
  }

  // ── Step 2: Combine all texts with clear document markers ─────────────────
  // Budget: 24 000 chars total, split equally among files (min 4 000 each)
  const charBudget = Math.max(4000, Math.floor(24000 / fileTexts.length));
  const combinedText = fileTexts
    .map((f, i) => `=== DOCUMENT ${i + 1}: ${f.fileName} ===\n${f.text.substring(0, charBudget)}`)
    .join("\n\n");

  // ── Step 3: Two LLM calls in parallel ─────────────────────────────────────
  const [fieldResult, chainResult] = await Promise.allSettled([
    chatCompletion(
      [
        { role: "system", content: FIELD_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Extract all fields from these ${fileTexts.length} document(s). Synthesise information across all of them:\n\n${combinedText}`,
        },
      ],
      { maxTokens: 2048 }
    ) as Promise<string>,

    chatCompletion(
      [
        { role: "system", content: CHAIN_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Extract all ownership transfers from these ${fileTexts.length} document(s). Piece together the complete chain across all files:\n\n${combinedText}`,
        },
      ],
      { maxTokens: 2048 }
    ) as Promise<string>,
  ]);

  // ── Step 4: Parse field extraction result ─────────────────────────────────
  let extracted: Record<string, any> = {};
  if (fieldResult.status === "fulfilled") {
    try {
      let json = fieldResult.value.trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "");
      extracted = JSON.parse(json);
    } catch {
      // Partial failure — return raw preview so user can fill manually
    }
  }

  // ── Step 5: Parse chain extraction result ─────────────────────────────────
  let chainEntries: any[] = [];
  if (chainResult.status === "fulfilled") {
    try {
      let json = chainResult.value.trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "");
      const parsed = JSON.parse(json);
      if (Array.isArray(parsed)) {
        chainEntries = parsed
          .filter((e: any) => e?.grantor || e?.grantee)
          .map((e: any) => ({
            grantor:      String(e.grantor      || "Unknown"),
            grantee:      String(e.grantee      || "Unknown"),
            docType:      String(e.docType      || "Deed"),
            docNumber:    e.docNumber  ? String(e.docNumber)  : null,
            year:         typeof e.year === "number" ? e.year : null,
            date:         e.date       ? String(e.date)       : null,
            sro:          e.sro        ? String(e.sro)        : null,
            consideration: e.consideration ? String(e.consideration) : null,
          }));
        // Sort oldest first; unknown years go last
        chainEntries.sort((a, b) => {
          if (a.year === null && b.year === null) return 0;
          if (a.year === null) return 1;
          if (b.year === null) return -1;
          return a.year - b.year;
        });
      }
    } catch {
      // chain parsing failed — return empty
    }
  }

  return NextResponse.json({
    success: true,
    extracted,
    chainEntries,
    fileCount: fileTexts.length,
    documentTypes: extracted.documentTypes || null,
    errors: fileErrors.length > 0 ? fileErrors : undefined,
  });
}
