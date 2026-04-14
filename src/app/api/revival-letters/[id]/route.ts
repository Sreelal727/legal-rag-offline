import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, getOrgId } from "@/lib/api-utils";

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { error, session } = await withAuth("cases:write");
  if (error) return error;
  const { id } = await ctx.params;

  const existing = await prisma.revivalLetter.findFirst({
    where: { id, organizationId: getOrgId(session!) },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.revivalLetter.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
