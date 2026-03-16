import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface InvoiceData {
  invoice: {
    invoiceNumber: string;
    createdAt: string;
    dueDate: string | null;
    status: string;
    subtotal: number;
    gstRate: number;
    gstAmount: number;
    totalAmount: number;
    notes: string | null;
    client: {
      name: string;
      email?: string | null;
      phone?: string | null;
      address?: string | null;
      gstNumber?: string | null;
    };
    case?: { caseNumber: string; title: string } | null;
    invoiceItems: {
      description: string;
      quantity: number;
      rate: number;
      amount: number;
    }[];
  };
  firm?: {
    firmName: string;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    gstin?: string | null;
  } | null;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatCurrency(amount: number): string {
  return "Rs. " + amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function generateInvoicePDF(data: InvoiceData) {
  const { invoice, firm } = data;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 20;

  // --- Firm Header ---
  doc.setFont("times", "bold");
  doc.setFontSize(18);
  doc.text(firm?.firmName || "Law Office", margin, y);
  y += 7;

  doc.setFont("times", "normal");
  doc.setFontSize(9);
  if (firm?.address) {
    doc.text(firm.address, margin, y);
    y += 4;
  }
  if (firm?.phone) {
    doc.text(`Phone: ${firm.phone}`, margin, y);
    y += 4;
  }
  if (firm?.email) {
    doc.text(`Email: ${firm.email}`, margin, y);
    y += 4;
  }
  if (firm?.gstin) {
    doc.text(`GSTIN: ${firm.gstin}`, margin, y);
    y += 4;
  }

  // --- INVOICE title + number on right ---
  doc.setFont("times", "bold");
  doc.setFontSize(22);
  doc.text("INVOICE", pageWidth - margin, 25, { align: "right" });
  doc.setFontSize(11);
  doc.text(invoice.invoiceNumber, pageWidth - margin, 33, { align: "right" });

  // --- Horizontal line ---
  y += 4;
  doc.setDrawColor(60, 60, 60);
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // --- Bill To and Invoice Details side by side ---
  doc.setFont("times", "bold");
  doc.setFontSize(10);
  doc.text("BILL TO:", margin, y);
  doc.text("INVOICE DETAILS:", pageWidth / 2 + 10, y);
  y += 6;

  doc.setFont("times", "normal");
  doc.setFontSize(10);

  // Left: client info
  let leftY = y;
  doc.setFont("times", "bold");
  doc.text(invoice.client.name, margin, leftY);
  doc.setFont("times", "normal");
  leftY += 5;
  if (invoice.client.address) {
    const addressLines = doc.splitTextToSize(invoice.client.address, 70);
    doc.text(addressLines, margin, leftY);
    leftY += addressLines.length * 4.5;
  }
  if (invoice.client.phone) {
    doc.text(`Phone: ${invoice.client.phone}`, margin, leftY);
    leftY += 5;
  }
  if (invoice.client.email) {
    doc.text(`Email: ${invoice.client.email}`, margin, leftY);
    leftY += 5;
  }
  if (invoice.client.gstNumber) {
    doc.text(`GSTIN: ${invoice.client.gstNumber}`, margin, leftY);
    leftY += 5;
  }

  // Right: invoice details
  let rightY = y;
  const rightX = pageWidth / 2 + 10;
  const detailPairs = [
    ["Date:", formatDate(invoice.createdAt)],
    ["Due Date:", invoice.dueDate ? formatDate(invoice.dueDate) : "N/A"],
    ["Status:", invoice.status],
  ];
  if (invoice.case) {
    detailPairs.push(["Case:", `${invoice.case.caseNumber}`]);
  }

  for (const [label, value] of detailPairs) {
    doc.setFont("times", "normal");
    doc.text(label, rightX, rightY);
    doc.text(value, rightX + 30, rightY);
    rightY += 5;
  }

  y = Math.max(leftY, rightY) + 8;

  // --- Items Table ---
  const tableBody = invoice.invoiceItems.map((item, idx) => [
    String(idx + 1),
    item.description,
    String(item.quantity),
    formatCurrency(item.rate),
    formatCurrency(item.amount),
  ]);

  autoTable(doc, {
    startY: y,
    head: [["#", "Description", "Qty", "Rate", "Amount"]],
    body: tableBody,
    theme: "grid",
    styles: {
      font: "times",
      fontSize: 10,
      cellPadding: 4,
    },
    headStyles: {
      fillColor: [50, 50, 50],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 12 },
      1: { cellWidth: "auto" },
      2: { halign: "center", cellWidth: 20 },
      3: { halign: "right", cellWidth: 35 },
      4: { halign: "right", cellWidth: 35 },
    },
    margin: { left: margin, right: margin },
  });

  // @ts-ignore - autotable adds lastAutoTable
  y = doc.lastAutoTable.finalY + 10;

  // --- Totals ---
  const totalsX = pageWidth - margin - 80;
  doc.setFont("times", "normal");
  doc.setFontSize(10);

  doc.text("Subtotal:", totalsX, y);
  doc.text(formatCurrency(invoice.subtotal), pageWidth - margin, y, { align: "right" });
  y += 6;

  doc.text(`GST (${invoice.gstRate}%):`, totalsX, y);
  doc.text(formatCurrency(invoice.gstAmount), pageWidth - margin, y, { align: "right" });
  y += 2;

  doc.setDrawColor(60, 60, 60);
  doc.setLineWidth(0.5);
  doc.line(totalsX, y, pageWidth - margin, y);
  y += 6;

  doc.setFont("times", "bold");
  doc.setFontSize(12);
  doc.text("Total:", totalsX, y);
  doc.text(formatCurrency(invoice.totalAmount), pageWidth - margin, y, { align: "right" });
  y += 12;

  // --- Notes ---
  if (invoice.notes) {
    doc.setFont("times", "italic");
    doc.setFontSize(9);
    doc.text("Notes:", margin, y);
    y += 5;
    doc.setFont("times", "normal");
    const noteLines = doc.splitTextToSize(invoice.notes, pageWidth - 2 * margin);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 4 + 8;
  }

  // --- SAC Code ---
  doc.setFont("times", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text("SAC Code: 998211 — Legal advisory and representation services", margin, y);
  y += 10;

  // --- Footer line ---
  doc.setDrawColor(60, 60, 60);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;
  doc.setFontSize(8);
  doc.text("This is a computer-generated invoice.", pageWidth / 2, y, { align: "center" });

  return doc;
}

export function downloadInvoicePDF(data: InvoiceData) {
  const doc = generateInvoicePDF(data);
  doc.save(`Invoice-${data.invoice.invoiceNumber}.pdf`);
}
