"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Clock, Receipt, IndianRupee, Trash2, FileText, Loader2, Download,
} from "lucide-react";
import { downloadInvoicePDF } from "@/lib/invoice-pdf";
import { clientLabel, selectedClientLabel } from "@/lib/client-label";
import { toast } from "sonner";
import { RoleGate } from "@/components/role-gate";
import { format } from "date-fns";
import Link from "next/link";

const invoiceStatusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "secondary",
  SENT: "outline",
  PAID: "default",
  OVERDUE: "destructive",
  CANCELLED: "destructive",
};

interface TimeEntry {
  id: string;
  description: string;
  date: string;
  hours: number;
  rate: number;
  amount: number;
  isBilled: boolean;
  user: { id: string; name: string };
  case: { id: string; caseNumber: string } | null;
  client: { id: string; name: string } | null;
}

interface InvoiceItem {
  id: string;
  clientId: string;
  invoiceNumber: string;
  subtotal: number;
  gstRate: number;
  gstAmount: number;
  totalAmount: number;
  status: string;
  createdAt: string;
  dueDate: string | null;
  client: { id: string; name: string; gstNumber: string | null };
  case: { id: string; caseNumber: string } | null;
  _count: { timeEntries: number; invoiceItems: number };
}

export default function BillingPage() {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [timeOpen, setTimeOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [viewInvoice, setViewInvoice] = useState<any>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [invoiceClientId, setInvoiceClientId] = useState("");
  const [invoiceCaseId, setInvoiceCaseId] = useState("");

  // Invoice form items
  const [invoiceItems, setInvoiceItems] = useState<{ description: string; quantity: string; rate: string }[]>([
    { description: "", quantity: "1", rate: "" },
  ]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [teRes, invRes] = await Promise.all([
      fetch("/api/billing/time-entries"),
      fetch("/api/billing/invoices"),
    ]);
    const [teData, invData] = await Promise.all([teRes.json(), invRes.json()]);
    setTimeEntries(Array.isArray(teData) ? teData : []);
    setInvoices(Array.isArray(invData) ? invData : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    fetch("/api/cases?limit=100").then((r) => r.json()).then((d) => setCases(d.cases || []));
    fetch("/api/clients?limit=100").then((r) => r.json()).then((d) => setClients(d.clients || []));
  }, [fetchData]);

  const handleTimeEntry = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());

    const res = await fetch("/api/billing/time-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      toast.success("Time entry added");
      setTimeOpen(false);
      fetchData();
    } else {
      toast.error("Failed to add time entry");
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const clientId = invoiceClientId;
    const caseId = invoiceCaseId;
    const gstRate = fd.get("gstRate") as string;
    const dueDate = fd.get("dueDate") as string;
    const notes = fd.get("notes") as string;

    const items = invoiceItems
      .filter((i) => i.description && i.rate)
      .map((i) => ({
        description: i.description,
        quantity: Number(i.quantity) || 1,
        rate: Number(i.rate),
      }));

    const timeEntryIds = Array.from(selectedEntries);

    const res = await fetch("/api/billing/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        caseId: caseId || null,
        items,
        timeEntryIds,
        gstRate: Number(gstRate) || 18,
        dueDate: dueDate || null,
        notes,
      }),
    });

    if (res.ok) {
      toast.success("Invoice created");
      setInvoiceOpen(false);
      setSelectedEntries(new Set());
      setInvoiceItems([{ description: "", quantity: "1", rate: "" }]);
      setInvoiceClientId("");
      setInvoiceCaseId("");
      fetchData();
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to create invoice");
    }
  };

  const handleViewInvoice = async (id: string) => {
    const res = await fetch(`/api/billing/invoices/${id}`);
    const data = await res.json();
    setViewInvoice(data);
    setViewOpen(true);
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/billing/invoices/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      toast.success(`Invoice marked as ${status.toLowerCase()}`);
      setViewOpen(false);
      fetchData();
    }
  };

  const toggleEntry = (id: string) => {
    const next = new Set(selectedEntries);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedEntries(next);
  };

  const unbilledEntries = timeEntries.filter((e) => !e.isBilled);
  const totalUnbilled = unbilledEntries.reduce((sum, e) => sum + e.amount, 0);
  const totalPending = invoices.filter((i) => i.status === "SENT").reduce((sum, i) => sum + i.totalAmount, 0);
  const totalPaid = invoices.filter((i) => i.status === "PAID").reduce((sum, i) => sum + i.totalAmount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <IndianRupee className="h-8 w-8" /> Billing & Invoicing
        </h1>
        <div className="flex gap-2">
          <RoleGate permission="cases:write">
            <Dialog open={timeOpen} onOpenChange={setTimeOpen}>
              <DialogTrigger asChild>
                <Button variant="outline"><Clock className="mr-2 h-4 w-4" /> Log Time</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Log Time Entry</DialogTitle></DialogHeader>
                <form onSubmit={handleTimeEntry} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Description *</Label>
                    <Textarea name="description" required rows={2} />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Date *</Label>
                      <Input name="date" type="date" defaultValue={new Date().toISOString().split("T")[0]} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Hours *</Label>
                      <Input name="hours" type="number" step="0.25" min="0.25" required />
                    </div>
                    <div className="space-y-2">
                      <Label>Rate (Rs/hr)</Label>
                      <Input name="rate" type="number" defaultValue="2000" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Case</Label>
                      <Select name="caseId">
                        <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                        <SelectContent>
                          {cases.map((c: any) => (
                            <SelectItem key={c.id} value={c.id}>{c.caseNumber}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Client</Label>
                      <Select name="clientId">
                        <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                        <SelectContent>
                          {clients.map((c: any) => (
                            <SelectItem key={c.id} value={c.id}>{clientLabel(c, clients)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button type="submit" className="w-full">Save Entry</Button>
                </form>
              </DialogContent>
            </Dialog>
          </RoleGate>
          <RoleGate permission="cases:write">
            <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
              <DialogTrigger asChild>
                <Button><Receipt className="mr-2 h-4 w-4" /> Create Invoice</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Create Invoice</DialogTitle></DialogHeader>
                <form onSubmit={handleCreateInvoice} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Client *</Label>
                      <Select value={invoiceClientId} onValueChange={(v) => { setInvoiceClientId(v ?? ""); setInvoiceCaseId(""); }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select client">
                            {selectedClientLabel(invoiceClientId, clients) || undefined}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {clients.map((c: any) => (
                            <SelectItem key={c.id} value={c.id}>{clientLabel(c, clients)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Case</Label>
                      <Select
                        value={invoiceCaseId}
                        onValueChange={(v) => setInvoiceCaseId(!v || v === "none" ? "" : v)}
                        disabled={!invoiceClientId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={invoiceClientId ? "Select case" : "Select client first"}>
                            {invoiceCaseId ? cases.find((c: any) => c.id === invoiceCaseId)?.caseNumber : (invoiceClientId ? "Select case" : "Select client first")}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {cases
                            .filter((c: any) => c.caseClients?.some((cc: any) => cc.clientId === invoiceClientId || cc.client?.id === invoiceClientId))
                            .map((c: any) => (
                              <SelectItem key={c.id} value={c.id}>{c.caseNumber} — {c.title}</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Line items */}
                  <div className="space-y-2">
                    <Label>Line Items</Label>
                    {invoiceItems.map((item, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input
                          placeholder="Description"
                          value={item.description}
                          onChange={(e) => {
                            const next = [...invoiceItems];
                            next[idx].description = e.target.value;
                            setInvoiceItems(next);
                          }}
                          className="flex-1"
                        />
                        <Input
                          placeholder="Qty"
                          type="number"
                          value={item.quantity}
                          onChange={(e) => {
                            const next = [...invoiceItems];
                            next[idx].quantity = e.target.value;
                            setInvoiceItems(next);
                          }}
                          className="w-20"
                        />
                        <Input
                          placeholder="Rate"
                          type="number"
                          value={item.rate}
                          onChange={(e) => {
                            const next = [...invoiceItems];
                            next[idx].rate = e.target.value;
                            setInvoiceItems(next);
                          }}
                          className="w-28"
                        />
                        {invoiceItems.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setInvoiceItems(invoiceItems.filter((_, i) => i !== idx))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setInvoiceItems([...invoiceItems, { description: "", quantity: "1", rate: "" }])}
                    >
                      <Plus className="mr-1 h-3 w-3" /> Add Item
                    </Button>
                  </div>

                  {/* Include unbilled time entries */}
                  {unbilledEntries.length > 0 && (
                    <div className="space-y-2">
                      <Label>Include Unbilled Time ({unbilledEntries.length} entries)</Label>
                      <div className="max-h-32 overflow-y-auto border rounded p-2 space-y-1">
                        {unbilledEntries.map((entry) => (
                          <label key={entry.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted p-1 rounded">
                            <input
                              type="checkbox"
                              checked={selectedEntries.has(entry.id)}
                              onChange={() => toggleEntry(entry.id)}
                            />
                            <span className="flex-1">{entry.description}</span>
                            <span>{entry.hours}h</span>
                            <span className="font-mono">Rs.{entry.amount.toFixed(0)}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>GST Rate (%)</Label>
                      <Input name="gstRate" type="number" defaultValue="18" />
                    </div>
                    <div className="space-y-2">
                      <Label>Due Date</Label>
                      <Input name="dueDate" type="date" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea name="notes" rows={2} />
                  </div>
                  <Button type="submit" className="w-full">Generate Invoice</Button>
                </form>
              </DialogContent>
            </Dialog>
          </RoleGate>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Unbilled Time</p>
            <p className="text-2xl font-bold">Rs. {totalUnbilled.toLocaleString("en-IN", { minimumFractionDigits: 0 })}</p>
            <p className="text-xs text-muted-foreground">{unbilledEntries.length} entries</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Pending Payment</p>
            <p className="text-2xl font-bold text-orange-600">Rs. {totalPending.toLocaleString("en-IN", { minimumFractionDigits: 0 })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Collected</p>
            <p className="text-2xl font-bold text-green-600">Rs. {totalPaid.toLocaleString("en-IN", { minimumFractionDigits: 0 })}</p>
          </CardContent>
        </Card>
      </div>

      {/* View Invoice Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Invoice {viewInvoice?.invoice?.invoiceNumber}</DialogTitle></DialogHeader>
          {viewInvoice?.invoice && (
            <div className="space-y-4">
              {/* Firm header */}
              {viewInvoice.firm && (
                <div className="border-b pb-3">
                  <p className="font-bold">{viewInvoice.firm.firmName}</p>
                  <p className="text-sm text-muted-foreground">{viewInvoice.firm.address}</p>
                  {viewInvoice.firm.gstin && <p className="text-sm">GSTIN: {viewInvoice.firm.gstin}</p>}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Bill To:</p>
                  <p className="font-medium">{viewInvoice.invoice.client.name}</p>
                  {viewInvoice.invoice.client.gstNumber && (
                    <p className="text-sm">GSTIN: {viewInvoice.invoice.client.gstNumber}</p>
                  )}
                </div>
                <div className="text-right">
                  <Badge variant={invoiceStatusColors[viewInvoice.invoice.status]}>
                    {viewInvoice.invoice.status}
                  </Badge>
                  <p className="text-sm mt-1">Date: {format(new Date(viewInvoice.invoice.createdAt), "dd MMM yyyy")}</p>
                  {viewInvoice.invoice.dueDate && (
                    <p className="text-sm">Due: {format(new Date(viewInvoice.invoice.dueDate), "dd MMM yyyy")}</p>
                  )}
                </div>
              </div>

              {/* Items table */}
              <div className="border rounded">
                <div className="grid grid-cols-12 gap-2 p-2 bg-muted text-sm font-medium">
                  <div className="col-span-6">Description</div>
                  <div className="col-span-2 text-right">Qty</div>
                  <div className="col-span-2 text-right">Rate</div>
                  <div className="col-span-2 text-right">Amount</div>
                </div>
                {viewInvoice.invoice.invoiceItems.map((item: any) => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 p-2 border-t text-sm">
                    <div className="col-span-6">{item.description}</div>
                    <div className="col-span-2 text-right">{item.quantity}</div>
                    <div className="col-span-2 text-right">Rs.{item.rate}</div>
                    <div className="col-span-2 text-right font-mono">Rs.{item.amount.toFixed(2)}</div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-1 text-right">
                <p className="text-sm">Subtotal: <span className="font-mono">Rs.{viewInvoice.invoice.subtotal.toFixed(2)}</span></p>
                <p className="text-sm">GST ({viewInvoice.invoice.gstRate}%): <span className="font-mono">Rs.{viewInvoice.invoice.gstAmount.toFixed(2)}</span></p>
                <p className="text-lg font-bold">Total: <span className="font-mono">Rs.{viewInvoice.invoice.totalAmount.toFixed(2)}</span></p>
              </div>

              {viewInvoice.invoice.notes && (
                <p className="text-sm text-muted-foreground italic">{viewInvoice.invoice.notes}</p>
              )}

              {/* SAC Code info */}
              <p className="text-xs text-muted-foreground">SAC Code: 998211 (Legal advisory and representation services)</p>

              {/* Actions */}
              <div className="flex gap-2 border-t pt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => downloadInvoicePDF(viewInvoice)}
                >
                  <Download className="mr-1 h-4 w-4" /> Download PDF
                </Button>
                {viewInvoice.invoice.status === "DRAFT" && (
                  <Button size="sm" onClick={() => handleUpdateStatus(viewInvoice.invoice.id, "SENT")}>
                    Mark as Sent
                  </Button>
                )}
                {viewInvoice.invoice.status === "SENT" && (
                  <Button size="sm" onClick={() => handleUpdateStatus(viewInvoice.invoice.id, "PAID")}>
                    Mark as Paid
                  </Button>
                )}
                {viewInvoice.invoice.status !== "CANCELLED" && viewInvoice.invoice.status !== "PAID" && (
                  <Button size="sm" variant="destructive" onClick={() => handleUpdateStatus(viewInvoice.invoice.id, "CANCELLED")}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="time">
        <TabsList>
          <TabsTrigger value="time">Time Entries</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="courtfees">Court Fees</TabsTrigger>
          <TabsTrigger value="feeagreements">Fee Agreements</TabsTrigger>
        </TabsList>

        <TabsContent value="time">
          {loading ? (
            <div className="text-center py-10 text-muted-foreground">Loading...</div>
          ) : timeEntries.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">No time entries yet</div>
          ) : (
            <div className="space-y-2">
              {timeEntries.map((entry) => (
                <Card key={entry.id} className={entry.isBilled ? "opacity-60" : ""}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{entry.description}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{format(new Date(entry.date), "dd MMM yyyy")}</span>
                          <span>{entry.user.name}</span>
                          {entry.case && <Badge variant="outline" className="text-[10px]">{entry.case.caseNumber}</Badge>}
                          {entry.client && <span>{entry.client.name}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-sm">{entry.hours}h x Rs.{entry.rate} = <strong>Rs.{entry.amount.toFixed(0)}</strong></p>
                        {entry.isBilled ? <Badge variant="secondary" className="text-xs">Billed</Badge> : <Badge variant="outline" className="text-xs">Unbilled</Badge>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="invoices">
          {loading ? (
            <div className="text-center py-10 text-muted-foreground">Loading...</div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">No invoices yet</div>
          ) : (
            <div className="space-y-2">
              {invoices.map((inv) => (
                <Card key={inv.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleViewInvoice(inv.id)}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Receipt className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono font-medium">{inv.invoiceNumber}</span>
                          <Badge variant={invoiceStatusColors[inv.status]}>{inv.status}</Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <span>{inv.client.name}</span>
                          {inv.case && <span>Case: {inv.case.caseNumber}</span>}
                          <span>{format(new Date(inv.createdAt), "dd MMM yyyy")}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold">Rs.{inv.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                        <p className="text-xs text-muted-foreground">(incl. GST {inv.gstRate}%)</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="courtfees">
          <CourtFeesTab cases={cases} />
        </TabsContent>

        <TabsContent value="feeagreements">
          <FeeAgreementsTab cases={cases} clients={clients} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Court Fees Tab ───────────────────────────────────────────────────────────

function CourtFeesTab({ cases }: { cases: any[] }) {
  const [entries, setEntries] = useState<any[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    caseId: "", amount: "", feeType: "COURT_FEE",
    description: "", paidDate: "", receiptNumber: "", isPaid: false,
  });

  const fetch_ = useCallback(async () => {
    const res = await fetch("/api/court-fees");
    if (res.ok) { const d = await res.json(); setEntries(Array.isArray(d) ? d : []); }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const handleAdd = async () => {
    if (!form.caseId || !form.amount) { toast.error("Case and amount required"); return; }
    const res = await fetch("/api/court-fees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) { toast.success("Fee entry added"); setAddOpen(false); fetch_(); } else { toast.error("Failed"); }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/court-fees/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Deleted"); fetch_(); }
  };

  const totalDue = entries.filter((e) => !e.isPaid).reduce((s: number, e: any) => s + e.amount, 0);
  const totalPaid = entries.filter((e) => e.isPaid).reduce((s: number, e: any) => s + e.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          <div className="text-center"><p className="text-2xl font-bold text-red-600">₹{totalDue.toLocaleString()}</p><p className="text-xs text-muted-foreground">Pending</p></div>
          <div className="text-center"><p className="text-2xl font-bold text-green-600">₹{totalPaid.toLocaleString()}</p><p className="text-xs text-muted-foreground">Paid</p></div>
        </div>
        <RoleGate permission="billing:write">
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Court Fee
          </Button>
        </RoleGate>
      </div>

      {entries.length === 0 ? (
        <p className="text-center py-10 text-muted-foreground">No court fee entries</p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry: any) => (
            <Card key={entry.id} className={entry.isPaid ? "opacity-70" : ""}>
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">₹{entry.amount.toLocaleString()}</span>
                    <Badge variant={entry.isPaid ? "default" : "destructive"}>
                      {entry.isPaid ? "Paid" : "Pending"}
                    </Badge>
                    <Badge variant="outline">{entry.feeType.replace(/_/g, " ")}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground flex gap-2 mt-1">
                    {entry.case && <span>Case: {entry.case.caseNumber}</span>}
                    {entry.description && <span>{entry.description}</span>}
                    {entry.receiptNumber && <span>Receipt: {entry.receiptNumber}</span>}
                    {entry.paidDate && <span>Paid: {format(new Date(entry.paidDate), "dd MMM yyyy")}</span>}
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(entry.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Court Fee Entry</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Case *</Label>
              <Select value={form.caseId} onValueChange={(v: any) => setForm({ ...form, caseId: String(v || "") })}>
                <SelectTrigger><SelectValue placeholder="Select case" /></SelectTrigger>
                <SelectContent>{cases.map((c) => <SelectItem key={c.id} value={c.id}>{c.caseNumber} - {c.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Amount (₹) *</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
              <div>
                <Label>Fee Type</Label>
                <Select value={form.feeType} onValueChange={(v: any) => setForm({ ...form, feeType: String(v || "COURT_FEE") })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COURT_FEE">Court Fee</SelectItem>
                    <SelectItem value="PROCESS_FEE">Process Fee</SelectItem>
                    <SelectItem value="ADVOCATE_FEE">Advocate Fee</SelectItem>
                    <SelectItem value="MISC">Miscellaneous</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Paid Date</Label><Input type="date" value={form.paidDate} onChange={(e) => setForm({ ...form, paidDate: e.target.value })} /></div>
              <div><Label>Receipt No.</Label><Input value={form.receiptNumber} onChange={(e) => setForm({ ...form, receiptNumber: e.target.value })} /></div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isPaid" checked={form.isPaid} onChange={(e) => setForm({ ...form, isPaid: e.target.checked })} />
              <Label htmlFor="isPaid">Already Paid</Label>
            </div>
            <Button onClick={handleAdd} className="w-full">Add Entry</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Fee Agreements Tab ───────────────────────────────────────────────────────

function FeeAgreementsTab({ cases, clients }: { cases: any[]; clients: any[] }) {
  const [agreements, setAgreements] = useState<any[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    clientId: "", caseId: "",
    agreementDate: new Date().toISOString().split("T")[0],
    totalFee: "", retainerFee: "", appearanceFee: "", successFee: "",
    paymentTerms: "", notes: "",
  });

  const fetch_ = useCallback(async () => {
    const res = await fetch("/api/fee-agreements");
    if (res.ok) { const d = await res.json(); setAgreements(Array.isArray(d) ? d : []); }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const handleAdd = async () => {
    if (!form.clientId || !form.totalFee) { toast.error("Client and total fee required"); return; }
    const res = await fetch("/api/fee-agreements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) { toast.success("Fee agreement added"); setAddOpen(false); fetch_(); } else { toast.error("Failed"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{agreements.length} fee agreement(s)</p>
        <RoleGate permission="billing:write">
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Fee Agreement
          </Button>
        </RoleGate>
      </div>

      {agreements.length === 0 ? (
        <p className="text-center py-10 text-muted-foreground">No fee agreements</p>
      ) : (
        <div className="space-y-2">
          {agreements.map((ag: any) => (
            <Card key={ag.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{ag.client?.name} — ₹{ag.totalFee.toLocaleString()}</p>
                    <div className="text-xs text-muted-foreground flex gap-3 mt-1">
                      {ag.case && <span>Case: {ag.case.caseNumber}</span>}
                      <span>Date: {format(new Date(ag.agreementDate), "dd MMM yyyy")}</span>
                      {ag.retainerFee > 0 && <span>Retainer: ₹{ag.retainerFee.toLocaleString()}</span>}
                      {ag.appearanceFee > 0 && <span>Per Appearance: ₹{ag.appearanceFee.toLocaleString()}</span>}
                      {ag.successFee > 0 && <span>Success Fee: ₹{ag.successFee.toLocaleString()}</span>}
                    </div>
                    {ag.paymentTerms && <p className="text-xs text-muted-foreground mt-1">{ag.paymentTerms}</p>}
                  </div>
                  <Badge variant={ag.status === "ACTIVE" ? "default" : "secondary"}>{ag.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Fee Agreement</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Client *</Label>
              <Select value={form.clientId} onValueChange={(v: any) => setForm({ ...form, clientId: String(v || "") })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select client">
                    {selectedClientLabel(form.clientId, clients) || undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{clientLabel(c, clients)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Link to Case</Label>
              <Select value={form.caseId} onValueChange={(v: any) => setForm({ ...form, caseId: v === "none" ? "" : String(v || "") })}>
                <SelectTrigger><SelectValue placeholder="Select case (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {cases.map((c) => <SelectItem key={c.id} value={c.id}>{c.caseNumber} - {c.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Agreement Date *</Label><Input type="date" value={form.agreementDate} onChange={(e) => setForm({ ...form, agreementDate: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Total Fee (₹) *</Label><Input type="number" value={form.totalFee} onChange={(e) => setForm({ ...form, totalFee: e.target.value })} /></div>
              <div><Label>Retainer Fee (₹)</Label><Input type="number" value={form.retainerFee} onChange={(e) => setForm({ ...form, retainerFee: e.target.value })} /></div>
              <div><Label>Per Appearance (₹)</Label><Input type="number" value={form.appearanceFee} onChange={(e) => setForm({ ...form, appearanceFee: e.target.value })} /></div>
              <div><Label>Success Fee (₹)</Label><Input type="number" value={form.successFee} onChange={(e) => setForm({ ...form, successFee: e.target.value })} /></div>
            </div>
            <div><Label>Payment Terms</Label><Textarea value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })} rows={2} /></div>
            <Button onClick={handleAdd} className="w-full">Save Agreement</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
