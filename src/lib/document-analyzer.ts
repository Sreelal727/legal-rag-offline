import { chatCompletion } from "./llm";

// Known bank/institution names that are typically clients (plaintiffs)
const KNOWN_INSTITUTIONS = [
  "canara bank",
  "state bank of india",
  "state bank of travancore",
  "south indian bank",
  "bank of baroda",
  "bank of india",
  "bank of maharashtra",
  "punjab national bank",
  "oriental bank of commerce",
  "indian bank",
  "indian overseas bank",
  "union bank of india",
  "central bank of india",
  "syndicate bank",
  "corporation bank",
  "vijaya bank",
  "dena bank",
  "allahabad bank",
  "andhra bank",
  "united bank of india",
  "uco bank",
  "karur vysya bank",
  "city union bank",
  "tamilnad mercantile bank",
  "dhanalakshmi bank",
  "federal bank",
  "catholic syrian bank",
  "lakshmi vilas bank",
  "icici bank",
  "hdfc bank",
  "axis bank",
  "kotak mahindra bank",
  "yes bank",
  "idbi bank",
  "bandhan bank",
  "rbl bank",
  "indusind bank",
  "manappuram finance",
  "manappuram chits",
  "muthoot finance",
  "esaf small finance bank",
  "equitas small finance bank",
  "kerala gramin bank",
  "pny sabha",
  "pny sabha finance",
  "p.n.y. sabha finance",
  "peringottukara namboodiri yogakshema sabha",
  "kinfra",
  "ksfe",
  "kerala state financial enterprises",
  "nabard",
  "npa",
  "lic housing finance",
  "sbi home finance",
  "hudco",
  "nhb",
];

// Advocate names that indicate the "client side"
const FIRM_ADVOCATES = [
  "g. ananthakrishnan",
  "g.ananthakrishnan",
  "ananthakrishnan",
  "k.b. priya",
  "k.b.priya",
  "gourisankar associates",
];

export interface AnalyzedParty {
  name: string;
  type: "INDIVIDUAL" | "COMPANY" | "BANK" | "GOVERNMENT" | "NBFC" | "OTHER";
  fatherHusbandName?: string;
  designation?: string; // S/o, D/o, W/o
  age?: number;
  address?: string;
  phone?: string;
  email?: string;
  aadharNumber?: string;
  loanAccountNumber?: string;
  partyRole: "BORROWER" | "GUARANTOR" | "CO_OBLIGANT" | "LEGAL_HEIR" | "OTHER";
}

export interface DocumentAnalysis {
  documentType: string; // PLAINT, NOTICE, EP, SARFAESI, NI_ACT_138, AFFIDAVIT, etc.
  caseType: string; // O.S.No., C.S.No., E.P.No., C.M.P.No., etc.
  caseNumber?: string;
  courtName?: string;
  plaintiff: {
    name: string;
    type: "INDIVIDUAL" | "COMPANY" | "BANK" | "GOVERNMENT" | "NBFC" | "OTHER";
    branchName?: string;
    address?: string;
    representedBy?: string;
    isClient: boolean; // true if this is the advocate's client
  };
  defendants: AnalyzedParty[];
  suitValue?: number;
  loanAmount?: number;
  reliefSought?: string;
  summary?: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
}

/**
 * Quick pattern-based check if a name is a known institution
 */
function isKnownInstitution(name: string): boolean {
  const lower = name.toLowerCase();
  return KNOWN_INSTITUTIONS.some((inst) => lower.includes(inst));
}

/**
 * Check if the firm's advocate is mentioned as counsel for a party
 */
function isFirmAdvocate(text: string): boolean {
  const lower = text.toLowerCase();
  return FIRM_ADVOCATES.some((adv) => lower.includes(adv));
}

/**
 * Detect the type of an entity from its name/description
 */
function detectEntityType(name: string, description?: string): AnalyzedParty["type"] {
  const text = `${name} ${description || ""}`.toLowerCase();

  if (/\bbank\b/.test(text) || /\bbanking company\b/.test(text)) return "BANK";
  if (/\bfinance\s*(ltd|limited|company|corporation)\b/.test(text)) return "NBFC";
  if (/\bchit\b|\bkuri\b|\bnidhi\b/.test(text)) return "NBFC";
  if (/\b(ltd|limited|pvt|private|company|corporation|enterprises|industries)\b/.test(text)) return "COMPANY";
  if (/\bgovernment\b|\bstate\b.*\bof\b.*\bkerala\b|\bmunicipality\b|\bpanchayat\b|\bpublic sector\b/.test(text)) return "GOVERNMENT";
  if (isKnownInstitution(name)) return "BANK";

  return "INDIVIDUAL";
}

/**
 * Analyze a legal document using LLM to extract party information
 */
export async function analyzeDocument(documentText: string): Promise<DocumentAnalysis> {
  // Truncate very long documents to first 6000 chars (cause title + initial paragraphs)
  const textForAnalysis = documentText.length > 6000
    ? documentText.substring(0, 6000) + "\n...[truncated]..."
    : documentText;

  const systemPrompt = `You are a legal document analyzer specializing in Indian civil litigation documents (plaints, petitions, notices, execution petitions, SARFAESI petitions, NI Act 138 complaints).

Your task is to extract structured party information from legal documents. The advocate filing these documents is typically G. Ananthakrishnan / K.B. Priya from Gourisankar Associates, Palakkad, Kerala.

LANGUAGE: Documents may be in English, Malayalam (മലയാളം), or a mix of both — this is common in Kerala legal practice. You must read and understand Malayalam text fully. When extracting structured fields (names, addresses, amounts), transliterate Malayalam names/places to their standard English romanisation (e.g., "ശ്രീ കൃഷ്ണദാസ്" → "Sri Krishnadas"). Preserve the meaning accurately.

IMPORTANT CONTEXT:
- The advocate primarily represents banks and financial institutions (plaintiffs/petitioners) in recovery suits against individual borrowers (defendants/respondents).
- In most cases: Plaintiff = Bank/NBFC (the advocate's CLIENT), Defendants = Individual borrowers (the OPPOSITION).
- Sometimes the advocate represents individual clients too — identify correctly based on document structure.

DOCUMENT STRUCTURE CLUES:
- The cause title lists "Plaintiff" (above "Vs.") and "Defendant" (below "Vs.")
- Or "Petitioner" vs "Respondent" in petition-type cases
- Each party has: Name, age, S/o/D/o/W/o (father/husband), address
- Defendant names may include loan account numbers in parentheses like "(A/c.62700600003645)"
- "Paragraph A" typically describes the plaintiff institution in detail
- The advocate's name appears as counsel for the plaintiff/petitioner side

Extract and return a JSON object with this EXACT structure:
{
  "documentType": "PLAINT" | "NOTICE" | "EP" | "SARFAESI" | "NI_ACT_138" | "AFFIDAVIT" | "PETITION" | "ORDER" | "OTHER",
  "caseType": "O.S.No." | "C.S.No." | "E.P.No." | "C.M.P.No." | "C.C.No." | "OTHER",
  "caseNumber": "O.S.No.___/2024" or null,
  "courtName": "Munsiff of Palakkad" or similar,
  "plaintiff": {
    "name": "The South Indian Bank Ltd.",
    "type": "BANK" | "NBFC" | "COMPANY" | "INDIVIDUAL" | "GOVERNMENT" | "OTHER",
    "branchName": "Kottayi Branch" or null,
    "address": "full address" or null,
    "representedBy": "Sri G. Ananthakrishnan" or null,
    "isClient": true
  },
  "defendants": [
    {
      "name": "Sri Balan K.",
      "type": "INDIVIDUAL",
      "fatherHusbandName": "Krishnan",
      "designation": "S/o",
      "age": 55,
      "address": "full address",
      "phone": "mobile number" or null,
      "aadharNumber": "aadhaar number" or null,
      "loanAccountNumber": "account number" or null,
      "partyRole": "BORROWER" | "GUARANTOR" | "CO_OBLIGANT" | "LEGAL_HEIR" | "OTHER"
    }
  ],
  "suitValue": 556244.13 or null,
  "loanAmount": 500000 or null,
  "reliefSought": "Recovery of loan amount with interest" or null,
  "summary": "Recovery suit by SIB Kottayi Branch against borrower Balan and guarantor for defaulted overdraft of Rs.3,00,000",
  "confidence": "HIGH" | "MEDIUM" | "LOW"
}

Rules:
- Extract ALL defendants, not just the first one
- Detect party roles: "BORROWER" for main borrower, "GUARANTOR" for guarantors/sureties, "CO_OBLIGANT" for co-borrowers, "LEGAL_HEIR" for legal heirs
- If defendant name contains "(A/c..." extract the account number separately
- Clean names: remove account numbers from name field, remove "Sri/Smt" prefix for data storage
- For plaintiff.isClient: set true if G. Ananthakrishnan is the counsel, or if the plaintiff is the institution
- Return ONLY valid JSON, no markdown, no explanation`;

  const userPrompt = `Analyze this legal document and extract party information:\n\n${textForAnalysis}`;

  try {
    const response = await chatCompletion([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    // Parse LLM response - strip markdown code fences if present
    let jsonStr = typeof response === "string" ? response : "";
    jsonStr = jsonStr.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    const analysis: DocumentAnalysis = JSON.parse(jsonStr);

    // Post-process: validate and enhance with pattern-based checks
    if (!analysis.plaintiff.isClient && isFirmAdvocate(documentText)) {
      analysis.plaintiff.isClient = true;
    }

    // Detect institution type if not set correctly
    if (analysis.plaintiff.type === "INDIVIDUAL" || analysis.plaintiff.type === "OTHER") {
      const detectedType = detectEntityType(analysis.plaintiff.name);
      if (detectedType !== "INDIVIDUAL") {
        analysis.plaintiff.type = detectedType;
      }
    }

    // Clean defendant names (remove account numbers from name)
    for (const def of analysis.defendants) {
      const acMatch = def.name.match(/\(A\/c[.\s]*(?:No\.?\s*)?([^)]+)\)/i);
      if (acMatch) {
        def.loanAccountNumber = acMatch[1].trim();
        def.name = def.name.replace(/\s*\(A\/c[^)]+\)\s*/i, "").trim();
      }
      if (!def.type) {
        def.type = detectEntityType(def.name);
      }
    }

    return analysis;
  } catch (err) {
    // If LLM fails, attempt basic pattern-based extraction
    return fallbackPatternAnalysis(documentText);
  }
}

/**
 * Fallback: pattern-based extraction when LLM is unavailable
 */
function fallbackPatternAnalysis(text: string): DocumentAnalysis {
  const analysis: DocumentAnalysis = {
    documentType: "OTHER",
    caseType: "OTHER",
    plaintiff: {
      name: "Unknown",
      type: "OTHER",
      isClient: true,
    },
    defendants: [],
    confidence: "LOW",
  };

  // Detect case type
  const caseTypeMatch = text.match(/(O\.S\.No\.|C\.S\.No\.|E\.P\.No\.|C\.M\.P\.No\.|C\.C\.No\.)/i);
  if (caseTypeMatch) {
    analysis.caseType = caseTypeMatch[1];
    if (caseTypeMatch[1].includes("O.S.")) analysis.documentType = "PLAINT";
    else if (caseTypeMatch[1].includes("E.P.")) analysis.documentType = "EP";
    else if (caseTypeMatch[1].includes("C.M.P.")) analysis.documentType = "PETITION";
  }

  // Detect court name
  const courtMatch = text.match(/(?:In the Court of|Before)\s+(?:the\s+)?(.+?)(?:\n|\.)/i);
  if (courtMatch) analysis.courtName = courtMatch[1].trim();

  // Detect case number
  const caseNumMatch = text.match(/((?:O\.S|C\.S|E\.P|C\.M\.P|C\.C)\.No\.\s*\d+\s*\/\s*\d{4})/i);
  if (caseNumMatch) analysis.caseNumber = caseNumMatch[1];

  // Look for known bank names in the first 2000 chars (likely plaintiff section)
  const header = text.substring(0, 2000);
  for (const inst of KNOWN_INSTITUTIONS) {
    if (header.toLowerCase().includes(inst)) {
      analysis.plaintiff.name = inst.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      analysis.plaintiff.type = detectEntityType(inst);
      analysis.plaintiff.isClient = true;
      break;
    }
  }

  // Check for advocate
  if (isFirmAdvocate(text)) {
    analysis.plaintiff.isClient = true;
  }

  // Try to extract suit value
  const suitValueMatch = text.match(/suit\s+valua?t?ion\s*(?:is\s*)?(?:Rs\.?\s*)?([0-9,]+(?:\.\d+)?)/i);
  if (suitValueMatch) {
    analysis.suitValue = parseFloat(suitValueMatch[1].replace(/,/g, ""));
  }

  return analysis;
}

/**
 * OCR a scanned PDF using pdfjs-dist (page renderer) + Tesseract.js (eng+mal).
 *
 * pdfjs-dist v5 in Node.js automatically uses its built-in NodeCanvasFactory
 * which relies on @napi-rs/canvas (pre-built Rust binaries, no system deps).
 * Each page is rendered at 2× scale for better OCR accuracy, converted to PNG,
 * then fed to Tesseract with the "eng+mal" language pack.
 *
 * Limited to the first MAX_OCR_PAGES pages to keep processing time reasonable.
 */
const MAX_OCR_PAGES = 40;

export async function ocrScannedPdf(pdfBuffer: Buffer): Promise<string> {
  // All imports are dynamic so that bundlers don't include them in client chunks
  // and so that the heavy modules are only loaded when actually needed.
  const pdfjsModule = (await import("pdfjs-dist/legacy/build/pdf.mjs")) as any;
  const pdfjs = pdfjsModule.default ?? pdfjsModule;

  // Disable the background worker — in Node.js we render in the main thread.
  // Setting workerSrc to "" activates pdfjs-dist's built-in "fake" worker.
  pdfjs.GlobalWorkerOptions.workerSrc = "";

  const { createCanvas } = (await import("@napi-rs/canvas")) as any;

  const TesseractModule = (await import("tesseract.js")) as any;
  const Tesseract = TesseractModule.default ?? TesseractModule;

  const pdfDoc = await pdfjs.getDocument({
    data: new Uint8Array(pdfBuffer),
    // Safe options for server-side rendering without a browser environment:
    // - useSystemFonts: use whatever fonts are available on the OS
    // - disableFontFace: skip @font-face CSS (no DOM, not needed for OCR)
    useSystemFonts: true,
    disableFontFace: true,
  }).promise;

  const totalPages: number = pdfDoc.numPages;
  const pagesToProcess = Math.min(totalPages, MAX_OCR_PAGES);
  console.log(
    `[ocrScannedPdf] Processing ${pagesToProcess}/${totalPages} pages with Tesseract eng+mal…`
  );

  const pageTexts: string[] = [];

  for (let pageNum = 1; pageNum <= pagesToProcess; pageNum++) {
    try {
      const page = await pdfDoc.getPage(pageNum);
      // 2× scale gives ~144 dpi which Tesseract handles well
      const viewport = page.getViewport({ scale: 2.0 });
      const width = Math.round(viewport.width);
      const height = Math.round(viewport.height);

      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");

      await page.render({ canvasContext: ctx, viewport }).promise;

      // Export the rendered page as PNG for Tesseract
      // @napi-rs/canvas uses .encode() (async) instead of the DOM .toDataURL() API
      const imgBuffer: Buffer = await canvas.encode("png");

      const ocrResult = await Tesseract.recognize(imgBuffer, "eng+mal", {
        logger: () => {}, // suppress per-progress callbacks
      });

      const pageText: string = ocrResult.data.text?.trim() ?? "";
      if (pageText.length > 10) {
        pageTexts.push(pageText);
      }
    } catch (pageErr) {
      console.error(`[ocrScannedPdf] Error on page ${pageNum}:`, pageErr);
    }
  }

  if (pageTexts.length === 0) {
    throw new Error(
      "OCR produced no text — the PDF may be too degraded or all pages failed."
    );
  }

  return pageTexts.join("\n\n");
}

/**
 * Extract text from documents — supports English and Malayalam (Unicode & UTF-16LE).
 * Handles: .docx (mammoth), .pdf (pdf-parse + OCR fallback), .doc (word-extractor), .txt, .rtf
 *
 * For PDFs: first tries the text layer (fast, perfect Unicode for digital PDFs).
 * If the text layer is too sparse (< 100 non-whitespace chars) the file is likely a
 * scanned/image PDF — we fall back to pdfjs-dist page rendering + Tesseract OCR
 * with the "eng+mal" language pack (English + Malayalam).
 */
export async function extractDocText(filePath: string): Promise<string> {
  const ext = filePath.toLowerCase().split(".").pop();

  if (ext === "docx") {
    const mammoth = await import("mammoth");
    const fs = await import("fs/promises");
    const buffer = await fs.readFile(filePath);
    // mammoth preserves Unicode (Malayalam, etc.) from .docx files correctly
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (ext === "pdf") {
    const fs = await import("fs/promises");
    const buffer = await fs.readFile(filePath);

    // --- Step 1: Try the text layer ---
    let textLayerText = "";
    try {
      const pdfParse = await import("pdf-parse");
      const pdf = (pdfParse as any).default || pdfParse;
      const data = await pdf(buffer);
      textLayerText = data.text?.trim() ?? "";
    } catch {
      // pdf-parse failed — likely a scanned/corrupt PDF with no text layer
    }

    // If the text layer has meaningful content, use it (digital PDF)
    if (textLayerText.replace(/\s/g, "").length >= 100) {
      return textLayerText;
    }

    // --- Step 2: Text layer is sparse → OCR the scanned pages ---
    console.log(
      `[extractDocText] PDF text layer too sparse (${textLayerText.replace(/\s/g, "").length} non-ws chars). Running OCR with eng+mal…`
    );
    return await ocrScannedPdf(buffer);
  }

  if (ext === "txt" || ext === "rtf") {
    const fs = await import("fs/promises");
    // Read as UTF-8 — handles Malayalam Unicode in plain text files
    const text = await fs.readFile(filePath, "utf-8");
    return text;
  }

  if (ext === "doc") {
    // word-extractor properly decodes OLE compound .doc format including
    // UTF-16LE encoded text — this correctly handles Malayalam characters
    // (U+0D00–U+0D7F) that the old binary scanner missed.
    try {
      const WordExtractor = (await import("word-extractor")).default;
      const extractor = new WordExtractor();
      const doc = await extractor.extract(filePath);
      return doc.getBody();
    } catch {
      // Last-resort fallback: binary scan (ASCII only — no Malayalam)
      const fs = await import("fs/promises");
      const buffer = await fs.readFile(filePath);
      return extractTextFromDoc(buffer);
    }
  }

  throw new Error(`Unsupported file type: .${ext}`);
}

/**
 * Basic .doc text extraction (OLE compound document format)
 * Extracts readable text from binary .doc files
 */
function extractTextFromDoc(buffer: Buffer): string {
  // .doc files store text in the WordDocument stream
  // This is a simplified extractor that reads ASCII/Unicode text from the binary
  const text: string[] = [];
  let current = "";

  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer[i];
    // Check for printable ASCII characters and common whitespace
    if ((byte >= 32 && byte <= 126) || byte === 10 || byte === 13 || byte === 9) {
      current += String.fromCharCode(byte);
    } else if (byte === 0 && i + 1 < buffer.length && buffer[i + 1] >= 32 && buffer[i + 1] <= 126) {
      // Skip null bytes in Unicode (UTF-16LE) encoding
      continue;
    } else {
      if (current.trim().length > 2) {
        text.push(current.trim());
      }
      current = "";
    }
  }
  if (current.trim().length > 2) {
    text.push(current.trim());
  }

  // Join and clean up the text
  let result = text.join("\n");

  // Remove common binary artifacts
  result = result.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");

  // Try to find the actual document content (after Word metadata)
  // Look for common legal document markers
  const markers = ["In the Court of", "Before the", "PLAINT", "Plaintiff", "Petitioner", "NOTICE"];
  for (const marker of markers) {
    const idx = result.indexOf(marker);
    if (idx > 0 && idx < result.length / 2) {
      // Found a marker, take content from a bit before it
      const start = Math.max(0, idx - 200);
      result = result.substring(start);
      break;
    }
  }

  return result;
}
