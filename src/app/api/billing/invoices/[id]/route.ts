import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-utils";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await withAuth("cases:read");
  if (error) return error;

  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
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

  // Also get firm settings for the invoice header
  const firm = await prisma.firmSettings.findUnique({ where: { id: "default" } });

  return NextResponse.json({ invoice, firm });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await withAuth("cases:write");
  if (error) return error;

  const { id } = await params;
  const body = await request.json();

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
      userId: session!.user.id,
      action: "UPDATE",
      entity: "Invoice",
      entityId: id,
      details: `Invoice ${invoice.invoiceNumber} status: ${body.status}`,
    },
  });

  return NextResponse.json(invoice);
}
