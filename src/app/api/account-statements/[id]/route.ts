import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, getOrgId } from "@/lib/api-utils";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { error, session } = await withAuth("cases:read");
  if (error) return error;
  const { id } = await ctx.params;

  const statement = await prisma.accountStatement.findFirst({
    where: { id, organizationId: getOrgId(session!) },
    include: { case: { select: { id: true, caseNumber: true, title: true } } },
  });
  if (!statement) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    ...statement,
    transactions: statement.transactions ? JSON.parse(statement.transactions) : [],
    schedule: statement.schedule ? JSON.parse(statement.schedule) : [],
  });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { error, session } = await withAuth("cases:write");
  if (error) return error;
  const { id } = await ctx.params;

  const existing = await prisma.accountStatement.findFirst({
    where: { id, organizationId: getOrgId(session!) },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.accountStatement.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
