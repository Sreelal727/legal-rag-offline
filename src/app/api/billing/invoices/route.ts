import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const { error } = await withAuth("cases:read");
  if (error) return error;

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status");
  const clientId = searchParams.get("clientId");

  const where: any = {};
  if (status) where.status = status;
  if (clientId) where.clientId = clientId;

  const invoices = await prisma.invoice.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      client: { select: { id: true, name: true, gstNumber: true } },
      case: { select: { id: true, caseNumber: true } },
      _count: { select: { timeEntries: true, invoiceItems: true } },
    },
  });

  return NextResponse.json(invoices);
}

export async function POST(request: NextRequest) {
  const { error, session } = await withAuth("cases:write");
  if (error) return error;

  const body = await request.json();
  const { clientId, caseId, items, timeEntryIds, gstRate, dueDate, notes } = body;

  if (!clientId || (!items?.length && !timeEntryIds?.length)) {
    return NextResponse.json({ error: "Client and at least one item or time entry required" }, { status: 400 });
  }

  // Generate invoice number
  const count = await prisma.invoice.count();
  const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

  // Calculate from items
  let subtotal = 0;
  const invoiceItems = (items || []).map((item: any) => {
    const amount = Number(item.quantity || 1) * Number(item.rate);
    subtotal += amount;
    return {
      description: item.description,
      quantity: Number(item.quantity || 1),
      rate: Number(item.rate),
      amount,
      sacCode: item.sacCode || "998211",
    };
  });

  // Calculate from time entries
  if (timeEntryIds?.length) {
    const timeEntries = await prisma.timeEntry.findMany({
      where: { id: { in: timeEntryIds } },
    });
    for (const entry of timeEntries) {
      subtotal += entry.amount;
      invoiceItems.push({
        description: entry.description,
        quantity: entry.hours,
        rate: entry.rate,
        amount: entry.amount,
        sacCode: "998211",
      });
    }
  }

  const gst = Number(gstRate || 18);
  const gstAmount = subtotal * (gst / 100);
  const totalAmount = subtotal + gstAmount;

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      clientId,
      caseId: caseId || null,
      subtotal,
      gstRate: gst,
      gstAmount,
      totalAmount,
      dueDate: dueDate ? new Date(dueDate) : null,
      notes,
      createdBy: session!.user.id,
      invoiceItems: {
        create: invoiceItems,
      },
    },
    include: {
      invoiceItems: true,
      client: true,
    },
  });

  // Mark time entries as billed
  if (timeEntryIds?.length) {
    await prisma.timeEntry.updateMany({
      where: { id: { in: timeEntryIds } },
      data: { isBilled: true, invoiceId: invoice.id },
    });
  }

  await prisma.auditLog.create({
    data: {
      userId: session!.user.id,
      action: "CREATE",
      entity: "Invoice",
      entityId: invoice.id,
      details: `Invoice ${invoiceNumber}: Rs. ${totalAmount.toFixed(2)}`,
    },
  });

  return NextResponse.json(invoice, { status: 201 });
}
