import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, getOrgId } from "@/lib/api-utils";
import { chatCompletion } from "@/lib/llm";

/**
 * POST /api/defence
 * AI-powered defence drafting: analyze plaint and generate Written Statement / Counter Statement
 */
export async function POST(request: NextRequest) {
  const { error, session } = await withAuth("cases:write");
  if (error) return error;

  const body = await request.json();
  const {
    caseId,
    task, // "analyze" | "draft_ws" | "draft_counter" | "suggest_grounds"
    plaintContent,
    additionalFacts,
    existingDefencePoints,
    documentType, // "WRITTEN_STATEMENT" | "COUNTER_STATEMENT" | "COUNTER_CLAIM" | "OBJECTION"
  } = body;

  if (!task) {
    return NextResponse.json({ error: "task is required" }, { status: 400 });
  }

  // Load case context if caseId provided
  let caseContext = "";
  if (caseId) {
    const caseData = await prisma.case.findFirst({
      where: { id: caseId, organizationId: getOrgId(session!) },
      include: {
        caseClients: { include: { client: { select: { name: true, address: true, city: true, state: true } } } },
        oppositeParties: { select: { name: true, partyType: true, address: true, city: true, state: true } },
      },
    });
    if (caseData) {
      caseContext = `
CASE DETAILS:
- Case Number: ${caseData.caseNumber}
- Title: ${caseData.title}
- Court: ${caseData.courtName || "Not specified"}
- Case Type: ${caseData.caseType}
- Sub Type: ${caseData.caseSubType || "Not specified"}
- Stage: ${caseData.stage || "Not specified"}
- Our Clients: ${caseData.caseClients.map((cc) => `${cc.client.name} (${cc.role})`).join(", ")}
- Opposite Parties: ${caseData.oppositeParties.map((op) => `${op.name} (${op.partyType})`).join(", ")}
${caseData.description ? `- Description: ${caseData.description}` : ""}
${caseData.notes ? `- Notes: ${caseData.notes}` : ""}
`;
    }
  }

  let systemPrompt = "";
  let userPrompt = "";

  if (task === "analyze") {
    systemPrompt = `You are a senior Indian advocate with expertise in civil and criminal litigation. Your task is to analyze a plaint/complaint and identify:
1. Key legal claims and causes of action
2. Weak points in the plaintiff's/complainant's case
3. Potential defence grounds and strategies
4. Statutory provisions that may help the defendant
5. Relevant case laws that could support the defence
6. Any procedural defects or technical objections

Use Indian legal terminology. Be specific and actionable.`;

    userPrompt = `Analyze the following plaint/complaint and identify defence strategies:

${caseContext}

PLAINT/COMPLAINT CONTENT:
${plaintContent || "[No plaint content provided - provide general defence strategy analysis]"}

${additionalFacts ? `ADDITIONAL FACTS FROM CLIENT:\n${additionalFacts}` : ""}

Please provide:
1. Summary of plaintiff's claims
2. Key weaknesses in the plaint
3. Suggested defence grounds (numbered list)
4. Relevant statutory provisions for defence
5. Key case laws to research
6. Recommended legal strategy`;

  } else if (task === "draft_ws") {
    systemPrompt = `You are a senior Indian advocate. Draft a Written Statement in response to a civil suit plaint. Follow the standard Indian court format for Written Statements under Order VIII of the Code of Civil Procedure, 1908.

FORMAT REQUIREMENTS:
- Preliminary Objections section
- Para-wise reply to each paragraph of the plaint
- Additional pleas / Positive defences section
- Prayer section
- Verification clause
Use proper legal language suitable for Indian district courts / high courts.`;

    userPrompt = `Draft a Written Statement for the defendant based on the following:

${caseContext}

PLAINT CONTENT TO REPLY TO:
${plaintContent || "[Provide plaint content]"}

${additionalFacts ? `DEFENDANT'S VERSION OF FACTS:\n${additionalFacts}` : ""}

${existingDefencePoints ? `SPECIFIC DEFENCE POINTS TO INCORPORATE:\n${existingDefencePoints}` : ""}

Draft a complete Written Statement following the standard Indian court format.`;

  } else if (task === "draft_counter") {
    systemPrompt = `You are a senior Indian advocate. Draft a Counter Statement / Counter in response to a petition or complaint. Follow the standard Indian court format appropriate for the case type.

FORMAT REQUIREMENTS:
- Preliminary Objections (if any)
- Para-wise denial/admission of each paragraph
- Affirmative defences and facts
- Prayer section
- Verification clause`;

    userPrompt = `Draft a Counter Statement / Reply for the respondent:

${caseContext}

PETITION/COMPLAINT CONTENT:
${plaintContent || "[Provide petition content]"}

${additionalFacts ? `RESPONDENT'S VERSION:\n${additionalFacts}` : ""}

${existingDefencePoints ? `SPECIFIC POINTS TO INCORPORATE:\n${existingDefencePoints}` : ""}

Draft a complete Counter Statement.`;

  } else if (task === "suggest_grounds") {
    systemPrompt = `You are a senior Indian advocate expert in defence strategy. Suggest specific legal grounds and arguments for the defence based on the case facts. Reference applicable sections of relevant Indian statutes (IPC, CPC, Evidence Act, Transfer of Property Act, etc.) and landmark case laws.`;

    userPrompt = `Suggest defence grounds for this case:

${caseContext}

CASE/PLAINT SUMMARY:
${plaintContent || ""}

${additionalFacts ? `CLIENT'S FACTS:\n${additionalFacts}` : ""}

Provide:
1. Legal grounds for defence (cite specific sections)
2. Factual defences available
3. Technical/procedural objections
4. Key case laws supporting defence
5. Evidence to be gathered`;

  } else {
    return NextResponse.json({ error: "Invalid task" }, { status: 400 });
  }

  try {
    const messages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: userPrompt },
    ];

    const response = await chatCompletion(messages, { maxTokens: 12288 });

    // If caseId, save the generated document
    let savedDocId: string | undefined;
    if (caseId && (task === "draft_ws" || task === "draft_counter")) {
      const docType = task === "draft_ws" ? "WRITTEN_STATEMENT" : "COUNTER_STATEMENT";
      const doc = await prisma.caseDocument.create({
        data: {
          organizationId: getOrgId(session!),
          caseId,
          documentType: docType,
          title: task === "draft_ws" ? "Written Statement (AI Draft)" : "Counter Statement (AI Draft)",
          content: response as string,
          status: "DRAFT",
          generatedBy: session!.user.id,
        },
      });
      savedDocId = doc.id;
    }

    return NextResponse.json({
      content: response,
      task,
      savedDocId,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "AI generation failed" }, { status: 500 });
  }
}
