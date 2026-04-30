import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-utils";
import { extractDocText } from "@/lib/document-analyzer";
import { chatCompletion } from "@/lib/llm";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";

export const maxDuration = 300;

const SYSTEM_PROMPT = `You are a legal document analyzer for a law firm in Kerala, India. Extract ALL property ownership transfers from the document(s) provided.

═══ LANGUAGE RULES — READ CAREFULLY ═══
Documents may be ENTIRELY in Malayalam (മലയാളം) — Unicode text or Tesseract OCR output. This is common for Kerala government records (ECs, pattas, possession certificates).
You MUST fully read and understand Malayalam script. Do NOT skip Malayalam content.
ALL values in your response MUST be in English — no Malayalam script (U+0D00–U+0D7F) in the output.
  • Transliterate names:  ശ്രീ രാജൻ → Sri Rajan  |  ശ്രീമതി ഗൗരി → Smt. Gowri  |  Late കൃഷ്ണൻ → Late Krishnan
  • Transliterate places: പാലക്കാട് → Palakkad  |  ആലത്തൂർ → Alathur  |  ഷൊർണ്ണൂർ → Shoranur
  • Map Malayalam deed types to English:
      ആധാരം / ക്രയം = Sale Deed  |  ദാനം = Gift Deed  |  ഒത്തുതീർപ്പ് = Settlement Deed
      ഭാഗക്കരാർ / ഭാഗം = Partition Deed  |  വിൽ = Will  |  കോടതി ഉത്തരവ് = Court Decree
      സർക്കാർ ഭൂമി = Government Grant  |  ഈടുവക്കൽ = Mortgage  |  ഒഴിഞ്ഞുകൊടുക്കൽ = Release

A single uploaded file may contain MULTIPLE documents (sale deeds, EC, patta, etc. combined into one PDF). Extract transfers from ALL of them.

Documents that contain transfers:
- Sale deed / Gift deed / Settlement deed / Partition deed — main transfer PLUS any prior transfers in recitals / "whereas" clauses
- Encumbrance Certificate (EC / ഭാരബാദ്ധ്യതാ സർട്ടിഫിക്കറ്റ്) — every transaction entry is a separate transfer
- Patta / Adangal / Thandaper — revenue ownership history
- Any deed that references an earlier deed — include the referenced transfer too

Return a JSON array sorted OLDEST transfer first. Each item represents one ownership transfer:
[
  {
    "grantor": "Full name of transferor in English (transliterated from Malayalam if needed), include Sri/Smt/Late",
    "grantee": "Full name of transferee in English (transliterated from Malayalam if needed), include Sri/Smt",
    "docType": "Sale Deed | Gift Deed | Settlement Deed | Partition Deed | Will | Inheritance | Court Decree | Government Grant | Mortgage | Release | Other",
    "docNumber": "Registration document number if stated, else null",
    "year": 2020,
    "date": "DD/MM/YYYY or null",
    "sro": "Sub-Registrar Office name in English (romanised) or null",
    "consideration": "Amount as string e.g. '5,00,000', or null for gifts / inheritance / court orders"
  }
]

RULES:
- ALL names, places, SRO names MUST be in English romanisation — no Malayalam script in the output
- List oldest → newest
- Include every transfer mentioned anywhere in the document(s), including in recitals and EC entries
- If the document shows the CURRENT owner without a prior transfer, create one entry with grantor = previous known owner
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

  const allEntries: any[] = [];
  const fileErrors: string[] = [];

  for (const file of files) {
    const ext = file.name.toLowerCase().split(".").pop();
    if (!ext || !["pdf", "doc", "docx", "txt", "rtf"].includes(ext)) {
      fileErrors.push(`${file.name}: unsupported file type`);
      continue;
    }

    const tempPath = path.join(tempDir, `${Date.now()}-${file.name}`);
    try {
      await writeFile(tempPath, Buffer.from(await file.arrayBuffer()));
      const text = await extractDocText(tempPath);

      if (!text || text.replace(/\s/g, "").length < 30) {
        fileErrors.push(`${file.name}: no readable text found`);
        continue;
      }

      const llmResp = (await chatCompletion([
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Extract all ownership transfers from this property document:\n\n${text.substring(0, 20000)}`,
        },
      ])) as string;

      let parsed: any[] = [];
      try {
        let jsonStr = llmResp.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
        parsed = JSON.parse(jsonStr);
        if (!Array.isArray(parsed)) parsed = [];
      } catch {
        fileErrors.push(`${file.name}: could not parse AI response`);
        continue;
      }

      for (const e of parsed) {
        if (e.grantor || e.grantee) {
          allEntries.push({
            fileName: file.name,
            grantor: String(e.grantor || "Unknown"),
            grantee: String(e.grantee || "Unknown"),
            docType: String(e.docType || "Deed"),
            docNumber: e.docNumber ? String(e.docNumber) : null,
            year: typeof e.year === "number" ? e.year : null,
            date: e.date ? String(e.date) : null,
            sro: e.sro ? String(e.sro) : null,
            consideration: e.consideration ? String(e.consideration) : null,
          });
        }
      }
    } catch (err: any) {
      fileErrors.push(`${file.name}: ${err.message}`);
    } finally {
      try {
        await unlink(tempPath);
      } catch { /* ignore */ }
    }
  }

  // Sort oldest first; unknown years go last
  allEntries.sort((a, b) => {
    if (a.year === null && b.year === null) return 0;
    if (a.year === null) return 1;
    if (b.year === null) return -1;
    return a.year - b.year;
  });

  // Deduplicate by grantor + grantee + year
  const seen = new Set<string>();
  const entries = allEntries.filter((e) => {
    const key = `${e.grantor.toLowerCase()}|${e.grantee.toLowerCase()}|${e.year ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return NextResponse.json({
    success: true,
    entries,
    errors: fileErrors.length > 0 ? fileErrors : undefined,
  });
}
