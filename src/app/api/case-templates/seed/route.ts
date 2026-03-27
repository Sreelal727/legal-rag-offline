import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, getOrgId } from "@/lib/api-utils";
import { ALL_TEMPLATES } from "@/lib/court-templates";

export async function POST(request: NextRequest) {
  const { error, session } = await withAuth("cases:write");
  if (error) return error;

  const organizationId = getOrgId(session!);

  // Get existing template documentTypes for this org
  const existing = await prisma.caseTemplate.findMany({
    where: { organizationId },
    select: { documentType: true },
  });
  const existingTypes = new Set(existing.map((t) => t.documentType));

  // Only add templates that don't already exist by documentType
  const toCreate = ALL_TEMPLATES.filter((t) => !existingTypes.has(t.documentType));

  let created = 0;
  for (const template of toCreate) {
    await prisma.caseTemplate.create({
      data: {
        name: template.name,
        category: template.category,
        documentType: template.documentType,
        description: template.description,
        content: template.content,
        variables: template.variables,
        courtType: (template as any).courtType || null,
        organizationId,
      },
    });
    created++;
  }

  return NextResponse.json({
    message: `Seeded ${created} templates. ${existingTypes.size} already existed.`,
    created,
    skipped: existingTypes.size,
  });
}
