import { NextRequest, NextResponse } from "next/server";
import { withAuth, getOrgId } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { lookupByCNR } from "@/lib/ecourts/service";
import { format } from "date-fns";

const CATEGORIES = ["CASE_UPDATE", "DOCUMENT_SUBMISSION", "ECOURTS_STATUS", "BILLING", "OTHER"] as const;
type Category = (typeof CATEGORIES)[number];

function fmt(date: Date | string | null | undefined): string {
  if (!date) return "N/A";
  return format(new Date(date), "dd MMM yyyy");
}

export async function GET(req: NextRequest) {
  const { error, session } = await withAuth("clients:read");
  if (error) return error;

  const orgId = getOrgId(session!);
  const { searchParams } = req.nextUrl;
  const clientId = searchParams.get("clientId");
  const category = searchParams.get("category") as Category | null;
  const itemId = searchParams.get("itemId");

  if (!clientId) {
    return NextResponse.json({ error: "clientId required" }, { status: 400 });
  }

  const client = await prisma.client.findFirst({ where: { id: clientId, organizationId: orgId } });
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  const firmName = org?.name || "Legal Practice";

  if (!category || category === "OTHER") {
    return NextResponse.json({ client: { id: client.id, name: client.name, phone: client.phone }, items: [], message: "" });
  }

  if (!CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  // CASE_UPDATE
  if (category === "CASE_UPDATE") {
    if (!itemId) {
      const cases = await prisma.case.findMany({
        where: { organizationId: orgId, caseClients: { some: { clientId } } },
        select: { id: true, caseNumber: true, title: true },
      });
      return NextResponse.json({ client: { id: client.id, name: client.name, phone: client.phone }, items: cases, message: "" });
    }
    const c = await prisma.case.findFirst({ where: { id: itemId, organizationId: orgId } });
    if (!c) return NextResponse.json({ error: "Case not found" }, { status: 404 });
    const message = `Dear ${client.name},

Here is an update regarding your case:
Case: ${c.caseNumber} - ${c.title}
Court: ${c.courtName || "N/A"}
Status: ${c.status}
Next Hearing: ${fmt(c.nextHearingDate)}
Judge: ${c.judge || "N/A"}

Regards,
${firmName}`;
    return NextResponse.json({ client: { id: client.id, name: client.name, phone: client.phone }, items: [], message });
  }

  // DOCUMENT_SUBMISSION
  if (category === "DOCUMENT_SUBMISSION") {
    if (!itemId) {
      const cases = await prisma.case.findMany({
        where: { organizationId: orgId, caseClients: { some: { clientId } } },
        select: { id: true, caseNumber: true, title: true },
      });
      return NextResponse.json({ client: { id: client.id, name: client.name, phone: client.phone }, items: cases, message: "" });
    }
    const c = await prisma.case.findFirst({ where: { id: itemId, organizationId: orgId } });
    if (!c) return NextResponse.json({ error: "Case not found" }, { status: 404 });
    const docs = await prisma.documentSubmission.findMany({
      where: { caseId: itemId, status: { not: "COMPLETED" } },
      orderBy: { dueDate: "asc" },
    });
    if (docs.length === 0) {
      const message = `Dear ${client.name},

No pending documents for Case ${c.caseNumber}.

Regards,
${firmName}`;
      return NextResponse.json({ client: { id: client.id, name: client.name, phone: client.phone }, items: [], message });
    }
    const docList = docs.map((d, i) => `${i + 1}. ${d.title} - Due: ${fmt(d.dueDate)} - Priority: ${d.priority}`).join("\n");
    const message = `Dear ${client.name},

The following documents are pending for Case ${c.caseNumber}:

${docList}

Please submit at the earliest.

Regards,
${firmName}`;
    return NextResponse.json({ client: { id: client.id, name: client.name, phone: client.phone }, items: [], message });
  }

  // ECOURTS_STATUS
  if (category === "ECOURTS_STATUS") {
    if (!itemId) {
      const cases = await prisma.case.findMany({
        where: { organizationId: orgId, caseClients: { some: { clientId } }, cnrNumber: { not: null } },
        select: { id: true, caseNumber: true, title: true, cnrNumber: true },
      });
      return NextResponse.json({ client: { id: client.id, name: client.name, phone: client.phone }, items: cases, message: "" });
    }
    const c = await prisma.case.findFirst({ where: { id: itemId, organizationId: orgId } });
    if (!c) return NextResponse.json({ error: "Case not found" }, { status: 404 });

    let status = c.ecourtStatus || c.status;
    let nextHearing = fmt(c.nextHearingDate);
    let courtName = c.courtName || "N/A";
    let judge = c.judge || "N/A";

    if (c.cnrNumber) {
      try {
        const ecourt = await lookupByCNR(c.cnrNumber);
        if (ecourt) {
          status = ecourt.status || status;
          nextHearing = ecourt.nextHearingDate || nextHearing;
          courtName = ecourt.courtName || courtName;
          judge = ecourt.judge || judge;
        }
      } catch {
        // fallback to local data
      }
    }

    const message = `Dear ${client.name},

eCourts Status for ${c.caseNumber} - ${c.title}:
Case Status: ${status}
Next Hearing: ${nextHearing}
Court: ${courtName}
Judge: ${judge}

Regards,
${firmName}`;
    return NextResponse.json({ client: { id: client.id, name: client.name, phone: client.phone }, items: [], message });
  }

  // BILLING
  if (category === "BILLING") {
    if (!itemId) {
      const invoices = await prisma.invoice.findMany({
        where: { clientId, organizationId: orgId },
        select: { id: true, invoiceNumber: true, totalAmount: true, status: true },
        orderBy: { createdAt: "desc" },
      });
      const items = invoices.map((inv) => ({
        id: inv.id,
        caseNumber: `#${inv.invoiceNumber}`,
        title: `Rs. ${inv.totalAmount.toFixed(2)} - ${inv.status}`,
      }));
      return NextResponse.json({ client: { id: client.id, name: client.name, phone: client.phone }, items, message: "" });
    }
    const inv = await prisma.invoice.findFirst({ where: { id: itemId, organizationId: orgId }, include: { invoiceItems: true } });
    if (!inv) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    const message = `Dear ${client.name},

Invoice #${inv.invoiceNumber}:
Subtotal: Rs. ${inv.subtotal.toFixed(2)}
GST (${inv.gstRate}%): Rs. ${inv.gstAmount.toFixed(2)}
Total: Rs. ${inv.totalAmount.toFixed(2)}
Due Date: ${fmt(inv.dueDate)}
Status: ${inv.status}

Regards,
${firmName}`;
    return NextResponse.json({ client: { id: client.id, name: client.name, phone: client.phone }, items: [], message });
  }

  return NextResponse.json({ error: "Invalid category" }, { status: 400 });
}
