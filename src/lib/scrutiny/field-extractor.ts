import { chatCompletion } from "@/lib/llm";
import type { ExtractedDeedFields, DeedType } from "./types";
import { DEED_TYPES, normalizeAreaToCents } from "./types";

const EXTRACTION_PROMPT = `You are a legal document analyst specializing in Indian property deeds, especially from Kerala.
Extract structured information from the following property deed document.

Return a JSON object with these fields:
{
  "documentNumber": "registration/document number (e.g., 1234)" or null,
  "registrationYear": year as number (e.g., 2020) or null,
  "sroName": "Sub Registrar Office name" or null,
  "executionDate": "YYYY-MM-DD" or null,
  "registrationDate": "YYYY-MM-DD" or null,
  "deedType": one of [${DEED_TYPES.join(", ")}],
  "grantor": ["name1", "name2"] (seller/donor/transferor),
  "grantee": ["name1", "name2"] (buyer/donee/transferee),
  "surveyNumbers": ["123/4", "567/8"] (survey/re-survey numbers),
  "area": {"value": number, "unit": "cents/acres/etc", "original": "original text"} or null,
  "consideration": sale amount as number or null,
  "stampDuty": stamp duty amount as number or null,
  "referencedDeeds": [{"docNo": "1234", "year": 2018, "sro": "Ernakulam"}] (prior deeds mentioned),
  "witnesses": ["name1", "name2"],
  "boundaries": {"north": "...", "south": "...", "east": "...", "west": "..."} or null,
  "scheduleDescription": "property schedule description verbatim" or null,
  "language": "en" or "ml" or "mixed"
}

IMPORTANT:
- If the document is in Malayalam, transliterate names to English
- Look for deed references in formats like: "Doc No. 1234/2020 of SRO Ernakulam", "Aadharam No. 1234", "Regd. Doc. No. 5678/2019"
- Survey numbers may appear as: "Survey No.", "Re-Survey No.", "Block No."
- Area may be in cents, ares, hectares, acres, square feet, square meters
- For partition deeds, list all parties in both grantor and grantee
- Return ONLY valid JSON, no markdown formatting`;

export async function extractDeedFields(
  documentId: string,
  text: string
): Promise<ExtractedDeedFields> {
  try {
    const response = await chatCompletion([
      { role: "system", content: EXTRACTION_PROMPT },
      {
        role: "user",
        content: `Extract fields from this deed document:\n\n${text}`,
      },
    ]);

    const parsed = parseJsonResponse(response as string);
    return validateAndNormalize(parsed);
  } catch (err) {
    console.error(`Field extraction failed for ${documentId}:`, err);
    return getEmptyFields();
  }
}

function validateAndNormalize(raw: any): ExtractedDeedFields {
  const deedType: DeedType = DEED_TYPES.includes(raw.deedType) ? raw.deedType : "OTHER";

  let area = null;
  if (raw.area && raw.area.value && raw.area.unit) {
    const normalizedValue = normalizeAreaToCents(raw.area.value, raw.area.unit);
    area = {
      value: normalizedValue,
      unit: raw.area.unit,
      original: raw.area.original || `${raw.area.value} ${raw.area.unit}`,
    };
  }

  return {
    documentNumber: raw.documentNumber || null,
    registrationYear: raw.registrationYear ? parseInt(raw.registrationYear) : null,
    sroName: raw.sroName || null,
    executionDate: raw.executionDate || null,
    registrationDate: raw.registrationDate || null,
    deedType,
    grantor: Array.isArray(raw.grantor) ? raw.grantor : raw.grantor ? [raw.grantor] : [],
    grantee: Array.isArray(raw.grantee) ? raw.grantee : raw.grantee ? [raw.grantee] : [],
    surveyNumbers: Array.isArray(raw.surveyNumbers) ? raw.surveyNumbers : [],
    area,
    consideration: raw.consideration ? parseFloat(raw.consideration) : null,
    stampDuty: raw.stampDuty ? parseFloat(raw.stampDuty) : null,
    referencedDeeds: Array.isArray(raw.referencedDeeds)
      ? raw.referencedDeeds.map((d: any) => ({
          docNo: String(d.docNo || ""),
          year: d.year ? parseInt(d.year) : null,
          sro: d.sro || null,
        }))
      : [],
    witnesses: Array.isArray(raw.witnesses) ? raw.witnesses : [],
    boundaries: raw.boundaries || null,
    scheduleDescription: raw.scheduleDescription || null,
    language: (["en", "ml", "mixed"].includes(raw.language) ? raw.language : "en") as "en" | "ml" | "mixed",
  };
}

function getEmptyFields(): ExtractedDeedFields {
  return {
    documentNumber: null,
    registrationYear: null,
    sroName: null,
    executionDate: null,
    registrationDate: null,
    deedType: "OTHER",
    grantor: [],
    grantee: [],
    surveyNumbers: [],
    area: null,
    consideration: null,
    stampDuty: null,
    referencedDeeds: [],
    witnesses: [],
    boundaries: null,
    scheduleDescription: null,
    language: "en",
  };
}

function parseJsonResponse(response: string): any {
  try {
    return JSON.parse(response);
  } catch {
    const match = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) return JSON.parse(match[1].trim());
    const objMatch = response.match(/\{[\s\S]*\}/);
    if (objMatch) return JSON.parse(objMatch[0]);
    throw new Error("Could not parse JSON from LLM response");
  }
}
