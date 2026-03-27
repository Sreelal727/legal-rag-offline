import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, getOrgId } from "@/lib/api-utils";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await withAuth("cases:read");
  if (error) return error;

  const organizationId = getOrgId(session!);
  const { id } = await params;

  const template = await prisma.caseTemplate.findFirst({
    where: { id, organizationId },
  });

  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  return NextResponse.json(template);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await withAuth("cases:write");
  if (error) return error;

  const organizationId = getOrgId(session!);
  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.caseTemplate.findFirst({ where: { id, organizationId } });
  if (!existing) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const template = await prisma.caseTemplate.update({
    where: { id },
    data: {
      name: body.name ?? existing.name,
      category: body.category ?? existing.category,
      documentType: body.documentType ?? existing.documentType,
      description: body.description !== undefined ? body.description : existing.description,
      content: body.content ?? existing.content,
      variables: body.variables !== undefined ? body.variables : existing.variables,
      courtType: body.courtType !== undefined ? body.courtType : existing.courtType,
      isActive: body.isActive !== undefined ? body.isActive : existing.isActive,
    },
  });

  return NextResponse.json(template);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await withAuth("cases:write");
  if (error) return error;

  const organizationId = getOrgId(session!);
  const { id } = await params;

  const existing = await prisma.caseTemplate.findFirst({ where: { id, organizationId } });
  if (!existing) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  await prisma.caseTemplate.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
