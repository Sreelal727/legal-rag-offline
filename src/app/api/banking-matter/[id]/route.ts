import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, getOrgId } from "@/lib/api-utils";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { error, session } = await withAuth("cases:read");
  if (error) return error;
  const { id } = await ctx.params;

  const matter = await prisma.bankingMatter.findFirst({
    where: { id, organizationId: getOrgId(session!) },
    include: {
      case: {
        select: {
          id: true, caseNumber: true, title: true, courtName: true, status: true,
          caseClients: { include: { client: true } },
          oppositeParties: true,
          revivalLetters: { orderBy: { revivalDate: "desc" }, take: 1 },
          accountStatements: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
      matterDocuments: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!matter) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    ...matter,
    extractedData: matter.extractedData ? JSON.parse(matter.extractedData) : null,
  });
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { error, session } = await withAuth("cases:write");
  if (error) return error;
  const { id } = await ctx.params;
  const orgId = getOrgId(session!);

  const existing = await prisma.bankingMatter.findFirst({ where: { id, organizationId: orgId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const allowed = [
    "title", "suitType", "currentStage", "status", "extractedData",
    "courtName", "courtType", "caseId", "bankClientId", "notes",
  ];

  const data: any = {};
  for (const k of allowed) {
    if (body[k] !== undefined) {
      data[k] = k === "extractedData" && typeof body[k] === "object"
        ? JSON.stringify(body[k])
        : body[k];
    }
  }

  const updated = await prisma.bankingMatter.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { error, session } = await withAuth("cases:delete");
  if (error) return error;
  const { id } = await ctx.params;

  const existing = await prisma.bankingMatter.findFirst({
    where: { id, organizationId: getOrgId(session!) },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.bankingMatter.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
