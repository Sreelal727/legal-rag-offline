import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, getOrgId } from "@/lib/api-utils";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await withAuth("cases:read");
  if (error) return error;

  const orgId = getOrgId(session!);
  const { id } = await params;
  const invoice = await prisma.invoice.findFirst({
    where: { id, organizationId: orgId },
    include: {
      client: true,
      case: { select: { id: true, caseNumber: true, title: true } },
      invoiceItems: true,
      timeEntries: {
        include: { user: { select: { name: true } } },
      },
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  // Get org settings for invoice header (replaces old FirmSettings)
  const firm = await prisma.organization.findUnique({ where: { id: orgId } });

  return NextResponse.json({ invoice, firm });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await withAuth("cases:write");
  if (error) return error;

  const orgId = getOrgId(session!);
  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.invoice.findFirst({ where: { id, organizationId: orgId } });
  if (!existing) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  const invoice = await prisma.invoice.update({
    where: { id },
    data: {
      status: body.status,
      paidDate: body.status === "PAID" ? new Date() : undefined,
      notes: body.notes,
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: orgId,
      userId: session!.user.id,
      action: "UPDATE",
      entity: "Invoice",
      entityId: id,
      details: `Invoice ${invoice.invoiceNumber} status: ${body.status}`,
    },
  });

  return NextResponse.json(invoice);
}
