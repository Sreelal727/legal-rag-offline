import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, getOrgId } from "@/lib/api-utils";
import { chatCompletion, buildNoticePrompt } from "@/lib/llm";

export async function POST(request: NextRequest) {
  const { error, session } = await withAuth("notices:draft");
  if (error) return error;

  const { templateContent, variables, instructions, formatSampleId } = await request.json();

  if (!templateContent && !formatSampleId) {
    return NextResponse.json({ error: "Template content or format sample is required" }, { status: 400 });
  }

  let formatSampleText: string | undefined;
  if (formatSampleId) {
    const sample = await prisma.formatSample.findFirst({
      where: { id: formatSampleId, organizationId: getOrgId(session!) },
      select: { textContent: true, name: true, category: true },
    });
    if (sample) {
      formatSampleText = sample.textContent;
    }
  }

  try {
    const messages = buildNoticePrompt(
      templateContent || "",
      variables || {},
      instructions,
      formatSampleText
    );
    const response = await chatCompletion(messages);
    return NextResponse.json({ content: response });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
