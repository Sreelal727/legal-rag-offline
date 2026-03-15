const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function chatCompletion(messages: ChatMessage[], stream = false) {
  const response = await fetch(`${DEEPSEEK_BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages,
      stream,
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
  }

  if (stream) {
    return response;
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export function buildRAGPrompt(query: string, context: string[], caseInfo?: string): ChatMessage[] {
  const systemPrompt = `You are a legal AI assistant specializing in Indian law. You help lawyers with legal research, case analysis, and document review.

IMPORTANT GUIDELINES:
- Always cite the source documents when referencing specific information
- Distinguish between established law and your analysis
- Reference specific sections, acts, and case laws where applicable
- Use Indian legal terminology appropriately
- If the context doesn't contain enough information, say so clearly
- Format responses with clear headings and bullet points

${caseInfo ? `Current Case Context:\n${caseInfo}\n` : ""}`;

  const contextStr = context
    .map((c, i) => `[Source ${i + 1}]: ${c}`)
    .join("\n\n");

  return [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `Based on the following legal documents and context, please answer the question.

RELEVANT DOCUMENTS:
${contextStr}

QUESTION: ${query}

Please provide a comprehensive answer with citations to the source documents.`,
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
