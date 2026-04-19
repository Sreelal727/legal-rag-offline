import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-utils";
import { extractDocText } from "@/lib/document-analyzer";
import { chatCompletion } from "@/lib/llm";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";

export const maxDuration = 300; // 5 min — large merged PDFs take time to extract

/**
 * Multi-document AI extraction for banking matters.
 * Accepts multiple files, extracts text from all, then uses AI to
 * produce a consolidated data card.
 */
export async function POST(request: NextRequest) {
  const { error } = await withAuth("documents:upload");
  if (error) return error;

  const formData = await request.formData();
  const files = formData.getAll("files") as File[];

  if (!files.length) {
    return NextResponse.json({ error: "At least one file is required" }, { status: 400 });
  }

  const allowed = ["doc", "docx", "pdf", "txt", "rtf"];
  const tempDir = path.join(process.cwd(), "uploads", "temp");
  await mkdir(tempDir, { recursive: true });

  // Extract text from all files
  const allTexts: { fileName: string; text: string }[] = [];

  for (const file of files) {
    const ext = file.name.toLowerCase().split(".").pop();
    if (!ext || !allowed.includes(ext)) continue;

    const tempPath = path.join(tempDir, `${Date.now()}-${file.name}`);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(tempPath, buffer);

    try {
      const text = await extractDocText(tempPath);
      allTexts.push({ fileName: file.name, text });
    } catch (e: any) {
      allTexts.push({ fileName: file.name, text: `[Could not extract: ${e.message}]` });
    }

    try { await unlink(tempPath); } catch { /* ignore */ }
  }

  if (!allTexts.length) {
    return NextResponse.json({ error: "No readable documents found" }, { status: 400 });
  }

  // Combine all texts (truncated to fit LLM context window)
  // A merged 150MB PDF may contain all documents — allow more chars per file
  const combinedText = allTexts
    .map((t) => `--- FILE: ${t.fileName} ---\n${t.text.substring(0, 15000)}`)
    .join("\n\n")
    .substring(0, 40000);

  // AI extraction
  const systemPrompt = `You are a legal document analyzer for an Indian banking recovery law practice (Gourisankar Associates, Palakkad, Kerala).

You are given text extracted from multiple documents sent by a bank client for filing a money recovery suit. These documents may include: loan agreement, sanction letter, demand promissory note, hypothecation deed, guarantee deed, mortgage deed, acknowledgment of debt, bank ledger/statement of accounts, demand notice, etc.

LANGUAGE: Documents may be in English, Malayalam (മലയാളം), or a mix of both — this is standard in Kerala banking practice. You must fully read and understand Malayalam text. When filling JSON fields, transliterate Malayalam names, addresses and place names to standard English romanisation (e.g., "ശ്രീ കൃഷ്ണദാസ്" → "Sri Krishnadas", "പാലക്കാട്" → "Palakkad"). Extract all amounts, dates, and account numbers correctly even when the surrounding text is in Malayalam.

Your task: Extract a CONSOLIDATED DATA CARD from all documents combined.

Return a JSON object with this EXACT structure:
{
  "bankName": "Bank of Baroda",
  "branchName": "Chandranagar Branch, Palakkad",
  "bankAddress": "full branch address",
  "bankCorpDescription": "a body corporate constituted under the Banking Companies (Acquisition and Transfer of Undertakings) Act, 1970, having its Head Office at ...",
  "bankPAN": "PAN number if found",
  "bankEmail": "branch email if found",
  "bankPhone": "branch phone if found",
  "authorizedOfficerName": "Manager's name if found",
  "authorizedOfficerDesignation": "Manager / Senior Manager / Chief Manager",
  "borrowers": [
    {
      "name": "Sri Sherief K",
      "fatherHusbandName": "Khalid T.Y.",
      "designation": "S/o",
      "age": 49,
      "address": "full address",
      "phone": "mobile if found",
      "aadharNumber": "if found",
      "occupation": "Proprietor, Eye Care Opticals",
      "role": "BORROWER"
    }
  ],
  "guarantors": [
    {
      "name": "...",
      "fatherHusbandName": "...",
      "designation": "S/o",
      "age": null,
      "address": "...",
      "role": "GUARANTOR"
    }
  ],
  "loanFacilities": [
    {
      "type": "CC",
      "description": "Cash Credit facility",
      "amount": 650000,
      "accountNumber": "62700500000503",
      "sanctionDate": "2017-03-22",
      "interestRate": 11.5,
      "rests": "MONTHLY",
      "repaymentTerms": "Repayable on demand, subject to annual renewal"
    }
  ],
  "documentsExecuted": [
    "Demand Promissory Note dated 27.12.2019 for Rs.6,50,000/-",
    "Loan-Cum-Hypothecation Agreement dated 27.12.2019",
    "Letter of Continuing Security dated 27.12.2019"
  ],
  "acknowledgements": [
    {
      "date": "2023-06-16",
      "amount": 652088,
      "description": "Letter of acknowledgement of debt confirming amount due"
    }
  ],
  "security": {
    "type": "HYPOTHECATION",
    "description": "Stock in trade hypothecated",
    "mortgageDetails": null,
    "available": false
  },
  "outstandingAmount": 943861.76,
  "outstandingDate": "2024-09-14",
  "lastPaymentDate": "2019-04-16",
  "demandNoticeDate": "2024-10-04",
  "demandNoticeMode": "Registered Post",
  "interestRate": 11.5,
  "penalRate": 2,
  "interestRests": "MONTHLY",
  "causeOfActionDates": "22.3.2017, 27.12.2019 when facilities were granted; 16.4.2019 when part payments were made; 16.6.2023 when acknowledgements were executed; 4.10.2024 when final demand was made",
  "causeOfActionPlace": "Palakkad",
  "policeStation": "Palakkad Town North",
  "suggestedSuitType": "OS",
  "suggestedCourt": "Munsiff of Palakkad",
  "confidence": "HIGH"
}

Rules:
- Extract ALL borrowers and guarantors as separate entries
- For each loan facility, capture: type (CC/TL/HL/VL/PL/GL/OD/AGRI/KCC/MSME), amount, account number, interest rate, rests
- If multiple loan facilities exist (e.g., CC + Term Loan + Covid Loan), list ALL
- Extract ALL documents executed (promissory notes, agreements, guarantees)
- Extract ALL acknowledgements of debt with dates and amounts
- suggestedSuitType: "OS" for suits < 10 lakhs, "CS" for >= 10 lakhs (but let user decide)
- suggestedCourt: based on suit value — Munsiff (< 10L), Sub Court (10L-25L), District Court (> 25L)
- Return ONLY valid JSON, no markdown, no explanation`;

  try {
    const response = await chatCompletion([
      { role: "system", content: systemPrompt },
      { role: "user", content: `Extract the consolidated data card from these ${allTexts.length} documents:\n\n${combinedText}` },
    ]);

    // Parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "AI did not return valid JSON", raw: response }, { status: 500 });
    }

    const extracted = JSON.parse(jsonMatch[0]);
    return NextResponse.json({
      extractedData: extracted,
      filesProcessed: allTexts.map((t) => t.fileName),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Extraction failed" }, { status: 500 });
  }
}
