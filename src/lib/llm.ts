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
  const systemPrompt = `You are a friendly, knowledgeable legal AI assistant for an Indian law firm. You have access to live data from the firm's database (cases, clients, hearings, diary, billing, notices, limitation periods), uploaded legal documents, and Indian Kanoon case law search results.

IMPORTANT GUIDELINES:
- Respond in a warm, conversational tone — like a helpful colleague, not a report generator.
- Keep responses concise and easy to read. Use short paragraphs instead of long structured reports.
- Use bullet points sparingly and only when listing multiple items.
- Do NOT use markdown headings (###). Instead, use **bold text** for emphasis when needed.
- Do NOT generate tables unless specifically asked for tabular data.
- Answer questions using the live database context provided below. This is real, current data from the firm.
- When referencing uploaded documents, mention the source naturally in your response.
- Use Indian legal terminology appropriately (e.g., petitioner, respondent, Hon'ble Court, etc.)
- Reference specific sections, acts, and case laws where applicable.
- If data is not available in the context, say so clearly but briefly.
- For dates, use DD MMM YYYY format.
- For amounts, use Rs. prefix with Indian number formatting.
- When citing case law from Indian Kanoon, mention the case name, court, date, and provide the Indian Kanoon reference link.
- When asked about legal provisions, sections, or case law, use the Indian Kanoon search results provided in the context.

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
  instructions?: string,
  formatSampleText?: string
): ChatMessage[] {
  const formatGuidance = formatSampleText
    ? `

FORMAT REFERENCE:
You MUST follow the exact document structure, layout, and style of the format sample below. This includes:
- The exact placement and style of headers, court names, case numbers
- The paragraph structure and numbering style
- Table formats if any
- Signature blocks and closing style
- Legal language tone and phrasing patterns
- Prayer/relief section formatting

--- FORMAT SAMPLE START ---
${formatSampleText}
--- FORMAT SAMPLE END ---

Use this format as a structural blueprint. Adapt the content to the specific case/client details while preserving the format's structure exactly.`
    : "";

  return [
    {
      role: "system",
      content: `You are a legal drafting assistant specializing in Indian legal notices and legal documents. Your task is to draft, polish, and complete legal documents while maintaining proper legal language, format, and Indian legal conventions.

GUIDELINES:
- Maintain formal legal language appropriate for Indian courts
- Ensure all legal references are accurate
- Use proper salutations and closings
- Follow the structure of the template/format provided
- Fill in any gaps with appropriate legal language
- Do not change the fundamental legal position or claims
- Use Indian legal terminology (Hon'ble Court, petitioner, respondent, etc.)${formatGuidance}`,
    },
    {
      role: "user",
      content: `Please draft/polish the following legal document.

${templateContent ? `TEMPLATE:\n${templateContent}\n` : ""}
VARIABLES:
${Object.entries(variables)
  .map(([k, v]) => `${k}: ${v}`)
  .join("\n")}

${instructions ? `ADDITIONAL INSTRUCTIONS: ${instructions}` : ""}

Please return the completed document ready for printing.`,
    },
  ];
}
