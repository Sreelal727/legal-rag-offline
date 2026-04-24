"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
  Building2, Plus, Pencil, Trash2, Printer, Upload, Settings, Loader2, CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { RoleGate } from "@/components/role-gate";
import { format } from "date-fns";

const STATUS_COLORS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "secondary",
  REVIEW: "outline",
  FINALIZED: "default",
};

const DEFAULT_TEMPLATE = `LEGAL OPINION ON TITLE OF PROPERTY

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
{{documentsExamined}}

TITLE INVESTIGATION:

1. OWNERSHIP:
Based on the documents examined, {{borrowerName}} is the absolute owner of the schedule property.

2. CHAIN OF TITLE:
{{chainOfTitle}}

3. ENCUMBRANCES:
Based on the Encumbrance Certificate for the period from {{ecPeriodFrom}} to {{ecPeriodTo}}, no encumbrances are found on the schedule property.

4. LEGAL HEIRS / SUCCESSION:
{{legalHeirs}}

5. GOVERNMENT DUES:
Property Tax paid up to [year]. {{governmentDues}}

6. LITIGATION:
No litigation is pending against the schedule property.

7. MARKETABILITY:
The title to the schedule property is clear, marketable and free from all encumbrances.

SCHEDULE OF PROPERTY:
{{propertySchedule}}

OPINION:

Based on the examination of the title documents furnished, we are of the opinion that:

a) {{borrowerName}} has clear and marketable title to the schedule property.
b) The property is free from any encumbrance/lien/charge.
c) The property is mortgageable.
d) The loan of Rs. {{loanAmount}}/- can be sanctioned on the security of the schedule property.

This opinion is based solely on the documents furnished to us and we are not responsible for any concealed facts.

Date: {{date}}
Place: {{place}}

Yours faithfully,

{{advocateName}}
Advocate
{{barCouncilNumber}}`;

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
  const [bankClients, setBankClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [editOpinion, setEditOpinion] = useState<BankOpinion | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editStatus, setEditStatus] = useState("DRAFT");

  // Template management
  const [currentTemplate, setCurrentTemplate] = useState(DEFAULT_TEMPLATE);
  const [editingTemplate, setEditingTemplate] = useState(DEFAULT_TEMPLATE);

  // Document upload / analysis
  const [uploading, setUploading] = useState(false);
  const [docExtracted, setDocExtracted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    bankClientId: "",   // selected from client list
    bankName: "",
    branchName: "",
    borrowerName: "",
    propertyAddress: "",
    loanAmount: "",
    caseId: "",
    // Fields auto-filled from document extraction
    documentsExamined: "",
    chainOfTitle: "",
    ecPeriodFrom: "",
    ecPeriodTo: "",
    legalHeirs: "",
    governmentDues: "",
    litigation: "",
    encumbrances: "",
    marketability: "",
    propertySchedule: "",
    advocateName: "G. Ananthakrishnan",
    barCouncilNumber: "KER/123/2001",
    place: "Palakkad",
  });

  const fetchOpinions = useCallback(async () => {
    const res = await fetch("/api/bank-opinions");
    if (res.ok) {
      const data = await res.json();
      setOpinions(Array.isArray(data) ? data : []);
    }
  }, []);

  useEffect(() => {
    // Load saved template from localStorage
    const saved = localStorage.getItem("bankOpinionTemplate");
    if (saved) { setCurrentTemplate(saved); setEditingTemplate(saved); }

    Promise.all([
      fetchOpinions(),
      fetch("/api/cases?limit=200").then((r) => r.json()).then((d) => setCases(d.cases || [])),
      // Fetch company-type clients (banks)
      fetch("/api/clients?clientType=COMPANY&limit=500").then((r) => r.json()).then((d) => setBankClients(d.clients || [])),
    ]).then(() => setLoading(false));
  }, [fetchOpinions]);

  const handleBankSelect = (clientId: string) => {
    const bank = bankClients.find((c) => c.id === clientId);
    setForm((prev) => ({
      ...prev,
      bankClientId: clientId,
      bankName: bank?.name || "",
      branchName: bank?.address || "",
    }));
  };

  // Upload title document and extract property / borrower details
  const handleDocUpload = async (file: File) => {
    setUploading(true);
    setDocExtracted(false);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/bank-opinions/extract-document", { method: "POST", body: fd });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Could not extract info from document");
        return;
      }

      if (data.warning) {
        toast.warning(data.warning);
      }

      const x = data.extracted ?? {};

      // Build property address from granular fields if a combined one isn't present
      const addrParts = [
        x.propertyAddress,
        x.surveyNumber ? `Survey No. ${x.surveyNumber}` : null,
        x.village,
        x.taluk ? `${x.taluk} Taluk` : null,
        x.district ? `${x.district} District` : null,
        x.totalExtent ? `Extent: ${x.totalExtent}` : null,
      ].filter(Boolean);
      const propertyAddr = addrParts.join(", ");

      // Build borrower description
      const borrower = [
        x.ownerName,
        x.fatherHusbandName ? `S/o ${x.fatherHusbandName}` : null,
        x.ownerAge ? `Age ${x.ownerAge}` : null,
      ].filter(Boolean).join(", ");

      setForm((prev) => ({
        ...prev,
        borrowerName:      x.ownerName          || prev.borrowerName,
        loanAmount:        x.loanAmount ? String(x.loanAmount) : prev.loanAmount,
        propertyAddress:   propertyAddr          || prev.propertyAddress,
        propertySchedule:  x.propertySchedule   || propertyAddr || prev.propertySchedule,
        bankName:          x.bankName            || prev.bankName,
        branchName:        x.branchName          || prev.branchName,
        documentsExamined: x.documentsExamined   || prev.documentsExamined,
        chainOfTitle:      x.chainOfTitle        || prev.chainOfTitle,
        ecPeriodFrom:      x.ecPeriodFrom        || prev.ecPeriodFrom,
        ecPeriodTo:        x.ecPeriodTo          || prev.ecPeriodTo,
        legalHeirs:        x.legalHeirs          || prev.legalHeirs,
        governmentDues:    x.governmentDues      || prev.governmentDues,
        litigation:        x.litigation          || prev.litigation,
        encumbrances:      x.encumbrances        || prev.encumbrances,
        marketability:     x.marketability       || prev.marketability,
      }));

      setDocExtracted(true);
      toast.success(`${data.documentType || "Document"} read — fields auto-filled`);
    } catch {
      toast.error("Could not extract info from document. Please fill in the details manually.");
    } finally {
      setUploading(false);
    }
  };

  const getFilledContent = () => {
    return currentTemplate
      .replace(/\{\{bankName\}\}/g,          form.bankName          || "[Bank Name]")
      .replace(/\{\{branchName\}\}/g,        form.branchName        || "[Branch Name]")
      .replace(/\{\{borrowerName\}\}/g,      form.borrowerName      || "[Borrower Name]")
      .replace(/\{\{propertyAddress\}\}/g,   form.propertyAddress   || "[Property Address]")
      .replace(/\{\{propertySchedule\}\}/g,  form.propertySchedule  || form.propertyAddress || "[Property Schedule]")
      .replace(/\{\{loanAmount\}\}/g,        form.loanAmount        || "[Loan Amount]")
      .replace(/\{\{documentsExamined\}\}/g, form.documentsExamined || "1. [List of documents furnished]")
      .replace(/\{\{chainOfTitle\}\}/g,      form.chainOfTitle      || "[Describe the chain of title]")
      .replace(/\{\{ecPeriodFrom\}\}/g,      form.ecPeriodFrom      || "[year]")
      .replace(/\{\{ecPeriodTo\}\}/g,        form.ecPeriodTo        || "[year]")
      .replace(/\{\{legalHeirs\}\}/g,        form.legalHeirs        || "Not applicable")
      .replace(/\{\{governmentDues\}\}/g,    form.governmentDues    || "[Government dues status]")
      .replace(/\{\{litigation\}\}/g,        form.litigation        || "No litigation noted")
      .replace(/\{\{encumbrances\}\}/g,      form.encumbrances      || "Nil")
      .replace(/\{\{marketability\}\}/g,     form.marketability     || "Title appears clear and marketable")
      .replace(/\{\{advocateName\}\}/g,      form.advocateName      || "G. Ananthakrishnan")
      .replace(/\{\{barCouncilNumber\}\}/g,  form.barCouncilNumber  || "[Bar Council No.]")
      .replace(/\{\{date\}\}/g,              format(new Date(), "dd/MM/yyyy"))
      .replace(/\{\{place\}\}/g,             form.place             || "Palakkad");
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
        bankName: form.bankName,
        branchName: form.branchName || undefined,
        borrowerName: form.borrowerName,
        propertyAddress: form.propertyAddress || undefined,
        loanAmount: form.loanAmount || undefined,
        content: getFilledContent(),
        caseId: form.caseId || undefined,
        clientId: form.bankClientId || undefined,
      }),
    });
    if (res.ok) {
      toast.success("Bank opinion created");
      setCreateOpen(false);
      setForm({ bankClientId: "", bankName: "", branchName: "", borrowerName: "", propertyAddress: "", loanAmount: "", caseId: "", documentsExamined: "", chainOfTitle: "", ecPeriodFrom: "", ecPeriodTo: "", legalHeirs: "", governmentDues: "", litigation: "", encumbrances: "", marketability: "", propertySchedule: "", advocateName: "G. Ananthakrishnan", barCouncilNumber: "KER/123/2001", place: "Palakkad" });
      setDocExtracted(false);
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

  const handleSaveTemplate = () => {
    setCurrentTemplate(editingTemplate);
    localStorage.setItem("bankOpinionTemplate", editingTemplate);
    setTemplateOpen(false);
    toast.success("Opinion template updated");
  };

  const handleResetTemplate = () => {
    setEditingTemplate(DEFAULT_TEMPLATE);
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
            Upload title documents → auto-extract details → generate legal opinion
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setEditingTemplate(currentTemplate); setTemplateOpen(true); }}>
            <Settings className="mr-2 h-4 w-4" /> Manage Template
          </Button>
          <RoleGate permission="cases:write">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> New Bank Opinion
            </Button>
          </RoleGate>
        </div>
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
                      {op.propertyAddress && <span>Property: {op.propertyAddress.substring(0, 60)}...</span>}
                      {op.case && <span>Case: {op.case.caseNumber}</span>}
                      <span>{format(new Date(op.createdAt), "dd MMM yyyy")}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost" size="icon"
                      onClick={() => { setEditOpinion(op); setEditContent(op.content || ""); setEditStatus(op.status); setEditOpen(true); }}
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

      {/* ── Create Dialog ─────────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Bank Opinion</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">

            {/* Document Upload */}
            <div className="rounded-md border-2 border-dashed p-4 space-y-2">
              <p className="text-sm font-medium">Step 1 — Upload Title Documents (optional)</p>
              <p className="text-xs text-muted-foreground">
                Upload title deed, EC certificate, loan agreement etc. — system will auto-extract borrower name and loan amount.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.txt"
                onChange={(e) => e.target.files?.[0] && handleDocUpload(e.target.files[0])}
              />
              <div className="flex gap-2 items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  {uploading ? "Reading document..." : "Upload Document"}
                </Button>
                {docExtracted && (
                  <span className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Fields auto-filled from document
                  </span>
                )}
              </div>
            </div>

            {/* Bank Selection */}
            <div className="space-y-3">
              <p className="text-sm font-medium">Step 2 — Fill in Details</p>
              <div>
                <Label>Select Bank (from client list)</Label>
                <Select value={form.bankClientId} onValueChange={(v: any) => handleBankSelect(String(v || ""))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a bank client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {bankClients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Or type manually below</p>
              </div>

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
                    placeholder="Palakkad Main Branch"
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
                <Label>Property Address / Schedule</Label>
                <Textarea
                  value={form.propertyAddress}
                  onChange={(e) => setForm({ ...form, propertyAddress: e.target.value })}
                  rows={3}
                  placeholder="Survey No., Village, Taluk, District..."
                />
              </div>
              <div>
                <Label>Link to Case (optional)</Label>
                <Select value={form.caseId} onValueChange={(v: any) => setForm({ ...form, caseId: v === "none" ? "" : String(v || "") })}>
                  <SelectTrigger><SelectValue placeholder="Select case (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {cases.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.caseNumber} — {c.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={handleCreate} className="w-full">
              Generate Bank Opinion
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ───────────────────────────────────────────────── */}
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
              <Button
                variant="outline"
                onClick={() => editOpinion && handlePrint({ ...editOpinion, content: editContent })}
              >
                <Printer className="mr-2 h-4 w-4" /> Print
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Manage Template Dialog ────────────────────────────────────── */}
      <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" /> Manage Bank Opinion Template
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Edit the standard format for all bank opinions. Use{" "}
              <code className="bg-muted px-1 rounded text-xs">{"{{variable}}"}</code> placeholders.
              Available: bankName, branchName, borrowerName, propertyAddress, propertySchedule, loanAmount,
              documentsExamined, chainOfTitle, ecPeriodFrom, ecPeriodTo, legalHeirs,
              governmentDues, advocateName, barCouncilNumber, date, place.
            </p>
            <Textarea
              value={editingTemplate}
              onChange={(e) => setEditingTemplate(e.target.value)}
              rows={35}
              className="font-mono text-xs"
            />
            <div className="flex gap-2">
              <Button onClick={handleSaveTemplate} className="flex-1">
                Save Template
              </Button>
              <Button variant="outline" onClick={handleResetTemplate}>
                Reset to Default
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
