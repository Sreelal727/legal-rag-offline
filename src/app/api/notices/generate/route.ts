import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-utils";
import { chatCompletion, buildNoticePrompt } from "@/lib/llm";

export async function POST(request: NextRequest) {
  const { error } = await withAuth("notices:draft");
  if (error) return error;

  const { templateContent, variables, instructions } = await request.json();

  if (!templateContent) {
    return NextResponse.json({ error: "Template content is required" }, { status: 400 });
  }

  try {
    const messages = buildNoticePrompt(templateContent, variables || {}, instructions);
    const response = await chatCompletion(messages);
    return NextResponse.json({ content: response });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
