import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, getOrgId } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const { error, session } = await withAuth("cases:read");
  if (error) return error;

  const organizationId = getOrgId(session!);
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const documentType = searchParams.get("documentType");

  const where: any = { organizationId, isActive: true };
  if (category) where.category = category;
  if (documentType) where.documentType = documentType;

  const templates = await prisma.caseTemplate.findMany({
    where,
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({ templates });
}

export async function POST(request: NextRequest) {
  const { error, session } = await withAuth("cases:write");
  if (error) return error;

  const organizationId = getOrgId(session!);
  const body = await request.json();

  if (!body.name || !body.category || !body.documentType || !body.content) {
    return NextResponse.json(
      { error: "name, category, documentType, and content are required" },
      { status: 400 }
    );
  }

  const template = await prisma.caseTemplate.create({
    data: {
      name: body.name,
      category: body.category,
      documentType: body.documentType,
      description: body.description || null,
      content: body.content,
      variables: body.variables || null,
      courtType: body.courtType || null,
      organizationId,
    },
  });

  return NextResponse.json(template, { status: 201 });
}
