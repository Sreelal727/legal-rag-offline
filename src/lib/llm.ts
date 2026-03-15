const LLM_API_KEY = process.env.LLM_API_KEY || "";
const LLM_BASE_URL = process.env.LLM_BASE_URL || "https://openrouter.ai/api/v1";
const LLM_MODEL = process.env.LLM_MODEL || "mistralai/Mistral-7B-Instruct-v0.3";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function chatCompletion(messages: ChatMessage[], stream = false) {
  const response = await fetch(`${LLM_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LLM_API_KEY}`,
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages,
      stream,
      temperature: 0.6,
      max_tokens: 8192,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM API error: ${response.status} - ${errorText}`);
  }

  if (stream) {
    return response;
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export function buildRAGPrompt(query: string, documentContext: string[], databaseContext?: string): ChatMessage[] {
  const systemPrompt = `You are a legal AI assistant for an Indian law firm's practice management system. You have access to live data from the firm's database (cases, clients, hearings, diary, billing, notices, limitation periods) as well as uploaded legal documents.

IMPORTANT GUIDELINES:
- Answer questions using the live database context provided below. This is real, current data from the firm.
- When referencing uploaded documents, cite the source.
- Use Indian legal terminology appropriately (e.g., petitioner, respondent, Hon'ble Court, etc.)
- Reference specific sections, acts, and case laws where applicable.
- Format responses with clear structure — use headings, bullet points, and tables where helpful.
- If data is not available in the context, say so clearly.
- For dates, use DD MMM YYYY format.
- For amounts, use Rs. prefix with Indian number formatting.

${databaseContext ? `\n--- LIVE DATABASE CONTEXT ---\n${databaseContext}\n--- END DATABASE CONTEXT ---\n` : ""}`;

  const parts: string[] = [];

  if (documentContext.length > 0) {
    const docStr = documentContext.map((c, i) => `[Document ${i + 1}]: ${c}`).join("\n\n");
    parts.push(`RELEVANT UPLOADED DOCUMENTS:\n${docStr}`);
  }

  parts.push(`QUESTION: ${query}`);

  return [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: parts.join("\n\n"),
    },
  ];
}

export function buildNoticePrompt(
  templateContent: string,
  variables: Record<string, string>,
  instructions?: string
): ChatMessage[] {
  return [
    {
      role: "system",
      content: `You are a legal drafting assistant specializing in Indian legal notices. Your task is to polish and complete legal notices while maintaining proper legal language, format, and Indian legal conventions.

GUIDELINES:
- Maintain formal legal language appropriate for Indian courts
- Ensure all legal references are accurate
- Use proper salutations and closings
- Follow the structure of the template provided
- Fill in any gaps with appropriate legal language
- Do not change the fundamental legal position or claims`,
    },
    {
      role: "user",
      content: `Please polish and complete the following legal notice.

TEMPLATE:
${templateContent}

VARIABLES:
${Object.entries(variables)
  .map(([k, v]) => `${k}: ${v}`)
  .join("\n")}

${instructions ? `ADDITIONAL INSTRUCTIONS: ${instructions}` : ""}

Please return the completed, polished notice ready for printing.`,
    },
  ];
}
