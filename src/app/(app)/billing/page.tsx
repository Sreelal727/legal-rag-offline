"use client";

import { useState, useEffect, useCallback } from "react";
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
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
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
                            {invoiceClientId ? clients.find((c: any) => c.id === invoiceClientId)?.name : "Select client"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {clients.map((c: any) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
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
      </Tabs>
    </div>
  );
}
