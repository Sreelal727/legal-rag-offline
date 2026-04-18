import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, getOrgId } from "@/lib/api-utils";

/**
 * Update a MatterDocument status (approve / revert to draft).
 * Also handles content edits.
 */
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { error, session } = await withAuth("cases:write");
  if (error) return error;
  const { id: matterId } = await ctx.params;
  const orgId = getOrgId(session!);

  // Verify matter belongs to org
  const matter = await prisma.bankingMatter.findFirst({
    where: { id: matterId, organizationId: orgId },
  });
  if (!matter) return NextResponse.json({ error: "Matter not found" }, { status: 404 });

  const body = await req.json();
  const { documentId, status, content } = body;

  if (!documentId) {
    return NextResponse.json({ error: "documentId is required" }, { status: 400 });
  }

  const doc = await prisma.matterDocument.findFirst({
    where: { id: documentId, matterId },
  });
  if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const data: any = {};
  if (status) {
    data.status = status;
    if (status === "APPROVED") {
      data.approvedAt = new Date();
      data.approvedBy = session!.user.id;
    }
  }
  if (content !== undefined) data.content = content;

  const updated = await prisma.matterDocument.update({
    where: { id: documentId },
    data,
  });

  return NextResponse.json(updated);
}

/**
 * Delete a MatterDocument.
 */
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { error, session } = await withAuth("cases:write");
  if (error) return error;
  const { id: matterId } = await ctx.params;
  const orgId = getOrgId(session!);

  const matter = await prisma.bankingMatter.findFirst({
    where: { id: matterId, organizationId: orgId },
  });
  if (!matter) return NextResponse.json({ error: "Matter not found" }, { status: 404 });

  const { documentId } = await req.json();
  if (!documentId) {
    return NextResponse.json({ error: "documentId required" }, { status: 400 });
  }

  await prisma.matterDocument.delete({ where: { id: documentId } });
  return NextResponse.json({ ok: true });
}
