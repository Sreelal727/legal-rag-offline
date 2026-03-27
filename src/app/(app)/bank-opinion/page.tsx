"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Building2, Plus, Pencil, Trash2, CheckCircle, Printer, FileText,
} from "lucide-react";
import { toast } from "sonner";
import { RoleGate } from "@/components/role-gate";
import { format } from "date-fns";

const STATUS_COLORS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "secondary",
  REVIEW: "outline",
  FINALIZED: "default",
};

const BANK_OPINION_TEMPLATE = `LEGAL OPINION ON TITLE OF PROPERTY

TO,
The Branch Manager,
{{bankName}}, {{branchName}},
[Branch Address]

Dear Sir/Madam,

RE: TITLE OPINION FOR LOAN PROPOSED TO {{borrowerName}}
    PROPERTY: {{propertyAddress}}
    LOAN AMOUNT: Rs. {{loanAmount}}/-

We have been requested to furnish a Legal Opinion with respect to the title of the above-mentioned property proposed to be mortgaged as security for the loan.

We have examined the following documents furnished to us:
1. [List of documents]

TITLE INVESTIGATION:

1. OWNERSHIP:
Based on the documents examined, {{borrowerName}} is the absolute owner of the schedule property.

2. CHAIN OF TITLE:
[Describe the chain of title from original owner to borrower]

3. ENCUMBRANCES:
Based on the Encumbrance Certificate for the period from [year] to [year], no encumbrances are found on the schedule property.

4. LEGAL HEIRS / SUCCESSION:
[If applicable]

5. GOVERNMENT DUES:
Property Tax paid up to [year]. [Other dues if any]

6. LITIGATION:
No litigation is pending against the schedule property.

7. MARKETABILITY:
The title to the schedule property is clear, marketable and free from all encumbrances.

SCHEDULE OF PROPERTY:
{{propertyAddress}}
[Detailed schedule]

OPINION:

Based on the examination of the title documents furnished, we are of the opinion that:

a) {{borrowerName}} has clear and marketable title to the schedule property.
b) The property is free from any encumbrance/lien/charge.
c) The property is mortgageable.
d) The loan of Rs. {{loanAmount}}/- can be sanctioned on the security of the schedule property.

This opinion is based solely on the documents furnished to us and we are not responsible for any concealed facts.

Date: [date]
Place: [place]

Yours faithfully,

[Advocate Name]
Advocate
[Bar Council No.]`;

interface BankOpinion {
  id: string;
  bankName: string;
  branchName: string | null;
  borrowerName: string;
  propertyAddress: string | null;
  loanAmount: number | null;
  content: string | null;
  status: string;
  createdAt: string;
  case: { id: string; caseNumber: string } | null;
  client: { id: string; name: string } | null;
  creator: { id: string; name: string } | null;
}

export default function BankOpinionPage() {
  const [opinions, setOpinions] = useState<BankOpinion[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editOpinion, setEditOpinion] = useState<BankOpinion | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editStatus, setEditStatus] = useState("DRAFT");

  const [form, setForm] = useState({
    bankName: "", branchName: "", borrowerName: "",
    propertyAddress: "", loanAmount: "",
    caseId: "", clientId: "",
  });

  const fetchOpinions = useCallback(async () => {
    const res = await fetch("/api/bank-opinions");
    if (res.ok) {
      const data = await res.json();
      setOpinions(Array.isArray(data) ? data : []);
    }
  }, []);

  useEffect(() => {
    Promise.all([
      fetchOpinions(),
      fetch("/api/cases?limit=200").then((r) => r.json()).then((d) => setCases(d.cases || [])),
      fetch("/api/clients?limit=200").then((r) => r.json()).then((d) => setClients(d.clients || [])),
    ]).then(() => setLoading(false));
  }, [fetchOpinions]);

  const getFilledTemplate = () => {
    return BANK_OPINION_TEMPLATE
      .replace(/\{\{bankName\}\}/g, form.bankName)
      .replace(/\{\{branchName\}\}/g, form.branchName)
      .replace(/\{\{borrowerName\}\}/g, form.borrowerName)
      .replace(/\{\{propertyAddress\}\}/g, form.propertyAddress)
      .replace(/\{\{loanAmount\}\}/g, form.loanAmount);
  };

  const handleCreate = async () => {
    if (!form.bankName || !form.borrowerName) {
      toast.error("Bank name and borrower name are required");
      return;
    }

    const res = await fetch("/api/bank-opinions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        content: getFilledTemplate(),
        caseId: form.caseId || undefined,
        clientId: form.clientId || undefined,
        loanAmount: form.loanAmount || undefined,
      }),
    });

    if (res.ok) {
      toast.success("Bank opinion created");
      setCreateOpen(false);
      setForm({ bankName: "", branchName: "", borrowerName: "", propertyAddress: "", loanAmount: "", caseId: "", clientId: "" });
      fetchOpinions();
    } else {
      toast.error("Failed to create");
    }
  };

  const handleSaveEdit = async () => {
    if (!editOpinion) return;
    const res = await fetch(`/api/bank-opinions/${editOpinion.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editContent, status: editStatus }),
    });
    if (res.ok) {
      toast.success("Saved");
      setEditOpen(false);
      fetchOpinions();
    } else {
      toast.error("Save failed");
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/bank-opinions/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Deleted"); fetchOpinions(); }
  };

  const handlePrint = (op: BankOpinion) => {
    const content = op.content || "";
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(`<html><head><title>Bank Opinion - ${op.borrowerName}</title>
        <style>body{font-family:'Times New Roman',serif;margin:2cm;line-height:1.6;}
        pre{white-space:pre-wrap;font-family:inherit;}@media print{.no-print{display:none;}}</style></head>
        <body><button class="no-print" onclick="window.print()" style="padding:8px;margin-bottom:1cm;cursor:pointer;">Print</button>
        <pre>${content}</pre></body></html>`);
      w.document.close();
    }
  };

  if (loading) return <div className="text-center py-10 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8" /> Bank Opinion
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Generate legal opinions on property title for bank loans
          </p>
        </div>
        <RoleGate permission="cases:write">
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Bank Opinion
          </Button>
        </RoleGate>
      </div>

      {opinions.length === 0 ? (
        <div className="text-center py-16 border rounded-lg">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">No bank opinions yet</p>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Create First Bank Opinion
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {opinions.map((op) => (
            <Card key={op.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{op.bankName}{op.branchName ? `, ${op.branchName}` : ""}</span>
                      <Badge variant={STATUS_COLORS[op.status]}>{op.status}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Borrower: <strong>{op.borrowerName}</strong>
                      {op.loanAmount && <span className="ml-2">Loan: ₹{op.loanAmount.toLocaleString()}</span>}
                    </div>
                    <div className="text-xs text-muted-foreground flex gap-3">
                      {op.propertyAddress && <span>Property: {op.propertyAddress.substring(0, 50)}...</span>}
                      {op.case && <span>Case: {op.case.caseNumber}</span>}
                      {op.client && <span>Client: {op.client.name}</span>}
                      <span>{format(new Date(op.createdAt), "dd MMM yyyy")}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost" size="icon"
                      onClick={() => {
                        setEditOpinion(op);
                        setEditContent(op.content || "");
                        setEditStatus(op.status);
                        setEditOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handlePrint(op)}>
                      <Printer className="h-4 w-4" />
                    </Button>
                    <RoleGate permission="cases:write">
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(op.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </RoleGate>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Bank Opinion</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Bank Name *</Label>
                <Input
                  value={form.bankName}
                  onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                  placeholder="State Bank of India"
                />
              </div>
              <div>
                <Label>Branch Name</Label>
                <Input
                  value={form.branchName}
                  onChange={(e) => setForm({ ...form, branchName: e.target.value })}
                  placeholder="Main Branch"
                />
              </div>
              <div>
                <Label>Borrower Name *</Label>
                <Input
                  value={form.borrowerName}
                  onChange={(e) => setForm({ ...form, borrowerName: e.target.value })}
                />
              </div>
              <div>
                <Label>Loan Amount (₹)</Label>
                <Input
                  type="number"
                  value={form.loanAmount}
                  onChange={(e) => setForm({ ...form, loanAmount: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Property Address</Label>
              <Textarea
                value={form.propertyAddress}
                onChange={(e) => setForm({ ...form, propertyAddress: e.target.value })}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Link to Case</Label>
                <Select value={form.caseId} onValueChange={(v: any) => setForm({ ...form, caseId: v === "none" ? "" : String(v || "") })}>
                  <SelectTrigger><SelectValue placeholder="Select case (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {cases.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.caseNumber} - {c.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Link to Client</Label>
                <Select value={form.clientId} onValueChange={(v: any) => setForm({ ...form, clientId: v === "none" ? "" : String(v || "") })}>
                  <SelectTrigger><SelectValue placeholder="Select client (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleCreate} className="w-full">
              Create Bank Opinion
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Bank Opinion — {editOpinion?.borrowerName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Label>Status:</Label>
              <Select value={editStatus} onValueChange={(v: any) => setEditStatus(String(v || "DRAFT"))}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="REVIEW">Review</SelectItem>
                  <SelectItem value="FINALIZED">Finalized</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={30}
              className="font-mono text-sm"
            />
            <div className="flex gap-2">
              <Button onClick={handleSaveEdit} className="flex-1">Save</Button>
              <Button variant="outline" onClick={() => editOpinion && handlePrint({ ...editOpinion, content: editContent })}>
                <Printer className="mr-2 h-4 w-4" /> Print
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
