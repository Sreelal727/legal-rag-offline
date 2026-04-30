import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-utils";
import { chatCompletion } from "@/lib/llm";

export const maxDuration = 120;

/**
 * POST /api/bank-opinions/draft
 *
 * Drafts a bank legal opinion using a recent past opinion (in the requested
 * bank's house style) as a structural reference, then fills it with the
 * extracted variables for the current case.
 */
export async function POST(request: NextRequest) {
  const { error } = await withAuth("cases:write");
  if (error) return error;

  const body = await request.json().catch(() => ({}));
  const {
    formatText,
    bankFolder,
    variables = {},
    chainNarrative = "",
  } = body as {
    formatText?: string;
    bankFolder?: string;
    variables?: Record<string, any>;
    chainNarrative?: string;
  };

  if (!formatText || !formatText.trim()) {
    return NextResponse.json({ error: "formatText is required" }, { status: 400 });
  }

  const variableLines = Object.entries(variables)
    .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== "")
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  const systemPrompt = `You are a senior advocate at Gourisankar Associates, Palakkad, drafting bank legal opinions in the firm's established house style.

You will be given:
1. A REFERENCE OPINION — a real past opinion the firm issued to ${bankFolder || "this bank"}. Treat its structure, headings, paragraph order, salutation, signature block, and tone as the authoritative format for this bank.
2. CURRENT CASE VARIABLES — facts about the new case (borrower, property, loan, etc.) auto-extracted from Malayalam/English documents.
3. CHAIN OF TITLE — chronological ownership history that must appear in the title chain section.

LANGUAGE — CRITICAL:
- The OUTPUT MUST BE ENTIRELY IN ENGLISH. This is a formal legal opinion letter written in English.
- The input variables were extracted from documents that may have been in Malayalam. Some variables may still contain Malayalam script (Unicode block U+0D00–U+0D7F). Before using any variable value, transliterate it to English romanisation:
    ശ്രീ കൃഷ്ണദാസ് → Sri Krishnadas  |  പാലക്കാട് → Palakkad  |  ആലത്തൂർ → Alathur
- Kerala revenue terms to use in English form: Sy.No. (Survey Number), cents (area), taluk, village, Patta No., EC period, SRO (Sub Registrar Office)

DRAFTING RULES:
- Reproduce the reference opinion's STRUCTURE exactly: same headings, same section order, same letterhead style, same salutation, same closing/signature pattern.
- Replace all case-specific details from the reference (borrower names, property details, dates, loan amounts, survey numbers, deed numbers) with the CURRENT CASE VARIABLES. Do NOT carry over the reference case's facts.
- If a variable is missing, use a clearly-marked placeholder like "[insert ___]" rather than inventing details.
- Use Indian legal terminology and Kerala revenue terminology appropriately (Sub Registrar, Taluk, Sy.No., cents, etc.).
- The CHAIN OF TITLE narrative must appear verbatim (or lightly adapted) in the title-chain / devolution section of the opinion.
- Output the COMPLETED OPINION ONLY — no preamble, no explanation, no markdown code fences. Plain text suitable for printing on the firm's letterhead.`;

  const userPrompt = `REFERENCE OPINION (firm's house style for ${bankFolder || "this bank"}):
\`\`\`
${formatText.substring(0, 18000)}
\`\`\`

CURRENT CASE VARIABLES:
${variableLines || "(none provided)"}

CHAIN OF TITLE:
${chainNarrative || "(not yet traced — leave the chain section as a placeholder)"}

Draft the complete legal opinion for the current case, mirroring the reference opinion's exact structure and tone but populated with the current case's data.`;

  let opinion = "";
  try {
    opinion = (await chatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { maxTokens: 4096 }
    )) as string;
  } catch (err: any) {
    return NextResponse.json(
      { error: `LLM draft failed: ${err.message || "unknown error"}` },
      { status: 502 }
    );
  }

  // Strip any accidental code fences
  opinion = opinion.trim().replace(/^```(?:\w+)?\s*/, "").replace(/\s*```$/, "");

  return NextResponse.json({ success: true, content: opinion });
}
