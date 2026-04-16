"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Landmark, Plus, Upload, Loader2, CheckCircle, Circle, Lock,
  FileText, Eye, Pencil, Trash2, Printer, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { MATTER_STAGES, OS_FILING_BUNDLE, CS_FILING_BUNDLE, EP_TYPES, BANKING_TEMPLATES } from "@/lib/banking-templates";

interface MatterDoc {
  id: string;
  documentType: string;
  title: string;
  content: string;
  status: string;
  createdAt: string;
}

interface Matter {
  id: string;
  title: string;
  suitType: string;
  currentStage: string;
  status: string;
  courtName: string | null;
  courtType: string | null;
  extractedData: any;
  notes: string | null;
  case: any;
  matterDocuments: MatterDoc[];
  createdAt: string;
}

const STAGE_ORDER = MATTER_STAGES.map((s) => s.code);

function stageIndex(stage: string) {
  return STAGE_ORDER.indexOf(stage);
}

function stageStatus(currentStage: string, targetStage: string, docs: MatterDoc[], suitType: string) {
  const current = stageIndex(currentStage);
  const target = stageIndex(targetStage);
  if (target < current) return "DONE";
  if (target === current) return "ACTIVE";
  // Skip MEDIATION for OS
  if (targetStage === "MEDIATION" && suitType === "OS") return "SKIP";
  return "LOCKED";
}

export default function BankingMatterPage() {
  const [matters, setMatters] = useState<Matter[]>([]);
  const [activeMatter, setActiveMatter] = useState<Matter | null>(null);
  const [loading, setLoading] = useState(true);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ title: "", suitType: "OS", courtName: "", courtType: "Munsiff" });
  const [creating, setCreating] = useState(false);

  // Upload
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);

  // Document view/edit
  const [viewDoc, setViewDoc] = useState<MatterDoc | null>(null);
  const [editContent, setEditContent] = useState("");
  const [generating, setGenerating] = useState(false);

  const loadMatters = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/banking-matter");
    if (r.ok) setMatters(await r.json());
    setLoading(false);
  }, []);

  const loadMatter = useCallback(async (id: string) => {
    const r = await fetch(`/api/banking-matter/${id}`);
    if (r.ok) {
      const m = await r.json();
      setActiveMatter(m);
    }
  }, []);

  useEffect(() => { loadMatters(); }, [loadMatters]);

  // Create matter
  const handleCreate = async () => {
    if (!createForm.title) { toast.error("Title is required"); return; }
    setCreating(true);
    try {
      const r = await fetch("/api/banking-matter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      if (r.ok) {
        const m = await r.json();
        toast.success("Matter created");
        setCreateOpen(false);
        setCreateForm({ title: "", suitType: "OS", courtName: "", courtType: "Munsiff" });
        loadMatters();
        loadMatter(m.id);
      } else {
        const e = await r.json();
        toast.error(e.error || "Failed");
      }
    } finally { setCreating(false); }
  };

  // Upload & extract documents
  const handleUploadExtract = async (files: FileList) => {
    if (!activeMatter) return;
    setUploading(true);
    setExtracting(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach((f) => formData.append("files", f));

      const r = await fetch("/api/banking-matter/extract", {
        method: "POST",
        body: formData,
      });

      if (r.ok) {
        const d = await r.json();
        // Save extracted data to the matter
        await fetch(`/api/banking-matter/${activeMatter.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            extractedData: d.extractedData,
            currentStage: "NOTICE", // advance to next stage
          }),
        });
        toast.success(`Extracted data from ${d.filesProcessed.length} files`);
        loadMatter(activeMatter.id);
      } else {
        const e = await r.json();
        toast.error(e.error || "Extraction failed");
      }
    } finally {
      setUploading(false);
      setExtracting(false);
    }
  };

  // Generate a document
  const handleGenerate = async (documentType: string) => {
    if (!activeMatter) return;
    setGenerating(true);
    try {
      const r = await fetch(`/api/banking-matter/${activeMatter.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentType }),
      });
      if (r.ok) {
        const d = await r.json();
        if (d.remainingPlaceholders?.length) {
          toast.info(`Generated with ${d.remainingPlaceholders.length} unfilled fields — review and fill manually`);
        } else {
          toast.success("Document generated");
        }
        loadMatter(activeMatter.id);
      } else {
        const e = await r.json();
        toast.error(e.error || "Generation failed");
      }
    } finally { setGenerating(false); }
  };

  // Approve / edit document
  const handleDocAction = async (docId: string, action: "APPROVED" | "UNDER_REVIEW" | "GENERATED", content?: string) => {
    if (!activeMatter) return;
    const r = await fetch(`/api/banking-matter/${activeMatter.id}/documents`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: docId, status: action, ...(content ? { content } : {}) }),
    });
    if (r.ok) {
      toast.success(action === "APPROVED" ? "Approved" : "Updated");
      loadMatter(activeMatter.id);
      setViewDoc(null);
    }
  };

  // Advance stage
  const advanceStage = async (nextStage: string) => {
    if (!activeMatter) return;
    await fetch(`/api/banking-matter/${activeMatter.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentStage: nextStage }),
    });
    loadMatter(activeMatter.id);
  };

  // Change suit type
  const changeSuitType = async (type: string) => {
    if (!activeMatter) return;
    await fetch(`/api/banking-matter/${activeMatter.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suitType: type }),
    });
    loadMatter(activeMatter.id);
  };

  const getDocByType = (type: string) =>
    activeMatter?.matterDocuments?.find((d) => d.documentType === type);

  // ============================
  // RENDER
  // ============================
  if (activeMatter) {
    return (
      <ActiveMatterView
        matter={activeMatter}
        onBack={() => { setActiveMatter(null); loadMatters(); }}
        onUpload={handleUploadExtract}
        uploading={uploading}
        extracting={extracting}
        onGenerate={handleGenerate}
        generating={generating}
        onDocAction={handleDocAction}
        onAdvanceStage={advanceStage}
        onChangeSuitType={changeSuitType}
        getDocByType={getDocByType}
        viewDoc={viewDoc}
        setViewDoc={setViewDoc}
        editContent={editContent}
        setEditContent={setEditContent}
        onReload={() => loadMatter(activeMatter.id)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Landmark className="h-6 w-6" />
            Banking Matters
          </h1>
          <p className="text-sm text-muted-foreground">
            End-to-end pipeline: Documents → Notice → Plaint → Annexures → EP
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Matter
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-10"><Loader2 className="h-5 w-5 animate-spin inline" /> Loading...</div>
      ) : matters.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <Landmark className="h-10 w-10 mx-auto mb-2 opacity-30" />
            No banking matters yet. Click "New Matter" to start a pipeline.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {matters.map((m) => (
            <Card
              key={m.id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => loadMatter(m.id)}
            >
              <CardContent className="py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{m.title}</p>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="outline">{m.suitType}</Badge>
                    <Badge variant="secondary">
                      {MATTER_STAGES.find((s) => s.code === m.currentStage)?.label || m.currentStage}
                    </Badge>
                    {m.case && <Badge>{m.case.caseNumber}</Badge>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {m.matterDocuments?.length || 0} docs
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Banking Matter</DialogTitle>
            <DialogDescription>
              Start a new banking recovery matter pipeline.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Title *</Label>
              <Input
                value={createForm.title}
                onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                placeholder="e.g., SIB Kottayi vs. Rajan K."
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Suit Type</Label>
                <Select
                  value={createForm.suitType}
                  onValueChange={(v) => setCreateForm({ ...createForm, suitType: v || "OS" })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OS">OS (Original Suit)</SelectItem>
                    <SelectItem value="CS">CS (Commercial Suit)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Hint: Commercial Suit if value &gt; ₹10L and commercial dispute
                </p>
              </div>
              <div>
                <Label>Court Type</Label>
                <Select
                  value={createForm.courtType}
                  onValueChange={(v) => setCreateForm({ ...createForm, courtType: v || "Munsiff" })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Munsiff">Munsiff</SelectItem>
                    <SelectItem value="Sub-Court">Sub-Court</SelectItem>
                    <SelectItem value="District Court">District Court</SelectItem>
                    <SelectItem value="Commercial Court">Commercial Court</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Court Name</Label>
              <Input
                value={createForm.courtName}
                onChange={(e) => setCreateForm({ ...createForm, courtName: e.target.value })}
                placeholder="e.g., Munsiff of Palakkad"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Matter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// ACTIVE MATTER VIEW — the pipeline
// ============================================================
function ActiveMatterView({
  matter, onBack, onUpload, uploading, extracting, onGenerate, generating,
  onDocAction, onAdvanceStage, onChangeSuitType, getDocByType,
  viewDoc, setViewDoc, editContent, setEditContent, onReload,
}: any) {
  const stages = MATTER_STAGES.filter(
    (s) => !(s.code === "MEDIATION" && matter.suitType === "OS")
  );

  const filingBundle = matter.suitType === "CS" ? CS_FILING_BUNDLE : OS_FILING_BUNDLE;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" onClick={onBack} className="mb-2">
            ← Back to all matters
          </Button>
          <h1 className="text-2xl font-bold">{matter.title}</h1>
          <div className="flex gap-2 mt-1">
            <Select value={matter.suitType} onValueChange={onChangeSuitType}>
              <SelectTrigger className="w-24 h-7">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OS">OS</SelectItem>
                <SelectItem value="CS">CS</SelectItem>
              </SelectContent>
            </Select>
            {matter.courtName && (
              <Badge variant="outline">{matter.courtName}</Badge>
            )}
            <Badge variant="secondary">
              {MATTER_STAGES.find((s: any) => s.code === matter.currentStage)?.label}
            </Badge>
          </div>
        </div>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-2" /> Print
        </Button>
      </div>

      {/* Extracted data summary */}
      {matter.extractedData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Extracted Data Card</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Bank</p>
                <p className="font-medium">{matter.extractedData.bankName}</p>
                <p className="text-xs">{matter.extractedData.branchName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Borrower(s)</p>
                {matter.extractedData.borrowers?.map((b: any, i: number) => (
                  <p key={i} className="font-medium">{b.name}</p>
                ))}
              </div>
              <div>
                <p className="text-muted-foreground">Outstanding</p>
                <p className="font-medium text-red-600">
                  ₹{Number(matter.extractedData.outstandingAmount || 0).toLocaleString("en-IN")}
                </p>
                <p className="text-xs">as on {matter.extractedData.outstandingDate}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Loan Facilities</p>
                {matter.extractedData.loanFacilities?.map((f: any, i: number) => (
                  <p key={i} className="text-xs">{f.type}: ₹{Number(f.amount || 0).toLocaleString("en-IN")} @ {f.interestRate}%</p>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pipeline stages */}
      <div className="space-y-3">
        {stages.map((stage: any) => {
          const ss = stageStatus(matter.currentStage, stage.code, matter.matterDocuments, matter.suitType);
          return (
            <StageCard
              key={stage.code}
              stage={stage}
              status={ss}
              matter={matter}
              onUpload={onUpload}
              uploading={uploading}
              extracting={extracting}
              onGenerate={onGenerate}
              generating={generating}
              onDocAction={onDocAction}
              onAdvanceStage={onAdvanceStage}
              getDocByType={getDocByType}
              filingBundle={filingBundle}
              setViewDoc={setViewDoc}
              setEditContent={setEditContent}
            />
          );
        })}
      </div>

      {/* Document view/edit dialog */}
      <Dialog open={!!viewDoc} onOpenChange={() => setViewDoc(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewDoc?.title}</DialogTitle>
          </DialogHeader>
          <Textarea
            rows={25}
            className="font-mono text-sm"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setViewDoc(null)}>Close</Button>
            <Button
              variant="outline"
              onClick={() => onDocAction(viewDoc?.id, undefined, editContent)}
            >
              Save Edits
            </Button>
            {viewDoc?.status !== "APPROVED" && (
              <Button onClick={() => onDocAction(viewDoc?.id, "APPROVED", editContent)}>
                <CheckCircle className="h-4 w-4 mr-2" /> Approve
              </Button>
            )}
            {viewDoc?.status === "APPROVED" && (
              <Button variant="destructive" onClick={() => onDocAction(viewDoc?.id, "GENERATED")}>
                Revoke Approval
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// STAGE CARD
// ============================================================
function StageCard({
  stage, status, matter, onUpload, uploading, extracting, onGenerate, generating,
  onDocAction, onAdvanceStage, getDocByType, filingBundle,
  setViewDoc, setEditContent,
}: any) {
  const icon =
    status === "DONE" ? <CheckCircle className="h-5 w-5 text-green-600" /> :
    status === "ACTIVE" ? <Circle className="h-5 w-5 text-blue-600 fill-blue-100" /> :
    <Lock className="h-5 w-5 text-muted-foreground" />;

  const cardClass =
    status === "ACTIVE" ? "border-blue-300 bg-blue-50/30" :
    status === "DONE" ? "border-green-200" :
    "opacity-60";

  // Helper to render a generated document row
  const docRow = (doc: MatterDoc | undefined, label: string) => {
    if (!doc) return null;
    return (
      <div className="flex items-center gap-2 text-sm border rounded px-3 py-2 bg-background">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <span className="flex-1">{label}</span>
        <Badge variant={doc.status === "APPROVED" ? "default" : doc.status === "UNDER_REVIEW" ? "outline" : "secondary"}>
          {doc.status}
        </Badge>
        <Button size="sm" variant="ghost" onClick={() => { setViewDoc(doc); setEditContent(doc.content); }}>
          <Eye className="h-3 w-3" />
        </Button>
      </div>
    );
  };

  return (
    <Card className={cardClass}>
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">{icon}</div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="font-medium">{stage.label}</p>
              {status === "DONE" && (
                <Badge variant="outline" className="text-green-700">Complete</Badge>
              )}
            </div>

            {/* Stage-specific content */}
            {stage.code === "DOCUMENTS" && status === "ACTIVE" && (
              <div className="mt-3 space-y-2">
                {!matter.extractedData ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Upload all documents from the bank (loan agreement, ledger, demand notice, etc.)
                    </p>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="file"
                        multiple
                        accept=".doc,.docx,.pdf,.txt,.rtf"
                        className="hidden"
                        onChange={(e) => e.target.files && onUpload(e.target.files)}
                        disabled={uploading}
                      />
                      <Button disabled={uploading} onClick={(e: any) => e.currentTarget.previousElementSibling?.click()}>
                        {extracting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                        {extracting ? "Extracting..." : "Upload & Extract"}
                      </Button>
                    </label>
                  </>
                ) : (
                  <div className="space-y-2">
                    <Badge variant="default">Data extracted — review above</Badge>
                    <Button size="sm" onClick={() => onAdvanceStage("NOTICE")}>
                      Confirm & Proceed to Notice →
                    </Button>
                  </div>
                )}
              </div>
            )}

            {stage.code === "NOTICE" && status === "ACTIVE" && (
              <div className="mt-3 space-y-2">
                {!getDocByType("DEMAND_NOTICE") ? (
                  <Button size="sm" onClick={() => onGenerate("DEMAND_NOTICE")} disabled={generating}>
                    {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                    Generate Demand Notice
                  </Button>
                ) : (
                  <>
                    {docRow(getDocByType("DEMAND_NOTICE"), "Demand Notice")}
                    {getDocByType("DEMAND_NOTICE")?.status === "APPROVED" && (
                      <Button size="sm" onClick={() =>
                        onAdvanceStage(matter.suitType === "CS" ? "MEDIATION" : "PLAINT")
                      }>
                        Proceed to {matter.suitType === "CS" ? "Mediation" : "Plaint"} →
                      </Button>
                    )}
                  </>
                )}
              </div>
            )}

            {stage.code === "MEDIATION" && status === "ACTIVE" && (
              <div className="mt-3 space-y-2">
                <p className="text-sm text-muted-foreground">
                  Mandatory pre-institution mediation under Section 12A, Commercial Courts Act 2015
                </p>
                {!getDocByType("MEDIATION_APPLICATION") ? (
                  <Button size="sm" onClick={() => onGenerate("MEDIATION_APPLICATION")} disabled={generating}>
                    {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                    Generate Mediation Application (Form-1)
                  </Button>
                ) : (
                  <>
                    {docRow(getDocByType("MEDIATION_APPLICATION"), "Mediation Application (Form-1)")}
                    {getDocByType("MEDIATION_APPLICATION")?.status === "APPROVED" && (
                      <Button size="sm" onClick={() => onAdvanceStage("PLAINT")}>
                        Proceed to Plaint →
                      </Button>
                    )}
                  </>
                )}
              </div>
            )}

            {stage.code === "PLAINT" && status === "ACTIVE" && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">Suit Type:</span>
                  <Badge variant={matter.suitType === "CS" ? "destructive" : "default"}>
                    {matter.suitType === "CS" ? "Commercial Suit" : "Original Suit"}
                  </Badge>
                </div>
                {!getDocByType(matter.suitType === "CS" ? "CS_PLAINT" : "OS_PLAINT") ? (
                  <Button
                    size="sm"
                    onClick={() => onGenerate(matter.suitType === "CS" ? "CS_PLAINT" : "OS_PLAINT")}
                    disabled={generating}
                  >
                    {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                    Generate {matter.suitType} Plaint
                  </Button>
                ) : (
                  <>
                    {docRow(
                      getDocByType(matter.suitType === "CS" ? "CS_PLAINT" : "OS_PLAINT"),
                      `${matter.suitType} Plaint`
                    )}
                    {getDocByType(matter.suitType === "CS" ? "CS_PLAINT" : "OS_PLAINT")?.status === "APPROVED" && (
                      <Button size="sm" onClick={() => onAdvanceStage("FILING_BUNDLE")}>
                        Proceed to Filing Bundle →
                      </Button>
                    )}
                  </>
                )}
              </div>
            )}

            {stage.code === "FILING_BUNDLE" && status === "ACTIVE" && (
              <FilingBundleStage
                matter={matter}
                filingBundle={filingBundle}
                getDocByType={getDocByType}
                onGenerate={onGenerate}
                generating={generating}
                docRow={docRow}
                onAdvanceStage={onAdvanceStage}
              />
            )}

            {stage.code === "TRIAL" && status === "ACTIVE" && (
              <div className="mt-3 space-y-2">
                {!getDocByType("PROOF_AFFIDAVIT") ? (
                  <Button size="sm" onClick={() => onGenerate("PROOF_AFFIDAVIT")} disabled={generating}>
                    {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                    Generate Proof Affidavit
                  </Button>
                ) : (
                  <>
                    {docRow(getDocByType("PROOF_AFFIDAVIT"), "Proof Affidavit")}
                    {getDocByType("PROOF_AFFIDAVIT")?.status === "APPROVED" && (
                      <Button size="sm" onClick={() => onAdvanceStage("DECREE")}>
                        Proceed to Decree →
                      </Button>
                    )}
                  </>
                )}
              </div>
            )}

            {stage.code === "DECREE" && status === "ACTIVE" && (
              <div className="mt-3 space-y-2">
                <p className="text-sm text-muted-foreground">
                  Upload the decree document from court to extract decree details for EP.
                </p>
                <Button size="sm" onClick={() => onAdvanceStage("EXECUTION")}>
                  Proceed to Execution →
                </Button>
              </div>
            )}

            {stage.code === "EXECUTION" && status === "ACTIVE" && (
              <div className="mt-3 space-y-2">
                <p className="text-sm text-muted-foreground">
                  Generate Execution Petition. You can generate multiple EPs per case.
                </p>
                <div className="flex flex-wrap gap-2">
                  {EP_TYPES.map((ep) => (
                    <Button
                      key={ep.code}
                      size="sm"
                      variant="outline"
                      onClick={() => onGenerate(ep.code)}
                      disabled={generating}
                    >
                      {ep.label}
                    </Button>
                  ))}
                </div>
                {/* Show generated EPs */}
                {EP_TYPES.map((ep) => {
                  const doc = getDocByType(ep.code);
                  return doc ? (
                    <div key={ep.code}>{docRow(doc, ep.label)}</div>
                  ) : null;
                })}
                {/* EP Affidavit */}
                {!getDocByType("EP_AFFIDAVIT") ? (
                  <Button size="sm" variant="outline" onClick={() => onGenerate("EP_AFFIDAVIT")} disabled={generating}>
                    Generate EP Affidavit
                  </Button>
                ) : (
                  docRow(getDocByType("EP_AFFIDAVIT"), "EP Supporting Affidavit")
                )}
              </div>
            )}

            {/* Show existing docs for completed stages */}
            {status === "DONE" && (
              <div className="mt-2 space-y-1">
                {matter.matterDocuments
                  ?.filter((d: MatterDoc) => {
                    if (stage.code === "NOTICE") return d.documentType === "DEMAND_NOTICE";
                    if (stage.code === "MEDIATION") return d.documentType === "MEDIATION_APPLICATION";
                    if (stage.code === "PLAINT") return ["OS_PLAINT", "CS_PLAINT"].includes(d.documentType);
                    if (stage.code === "FILING_BUNDLE") return filingBundle.includes(d.documentType);
                    if (stage.code === "TRIAL") return d.documentType === "PROOF_AFFIDAVIT";
                    if (stage.code === "EXECUTION") return d.documentType.startsWith("EP_");
                    return false;
                  })
                  .map((d: MatterDoc) => (
                    <div key={d.id}>{docRow(d, d.title)}</div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// FILING BUNDLE STAGE
// ============================================================
function FilingBundleStage({
  matter, filingBundle, getDocByType, onGenerate, generating, docRow, onAdvanceStage,
}: any) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (type: string) => {
    setSelected((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const templateLabel = (type: string) =>
    BANKING_TEMPLATES.find((t) => t.documentType === type)?.name || type;

  const allGenerated = filingBundle.every((type: string) => getDocByType(type));
  const allApproved = filingBundle.every(
    (type: string) => getDocByType(type)?.status === "APPROVED"
  );

  return (
    <div className="mt-3 space-y-3">
      <p className="text-sm text-muted-foreground">
        Select documents to generate for the filing bundle:
      </p>
      <div className="space-y-1">
        {filingBundle
          .filter((type: string) => {
            // Skip mediation if already generated
            if (type === "MEDIATION_APPLICATION" && getDocByType("MEDIATION_APPLICATION")) return false;
            return true;
          })
          .map((type: string) => {
            const existing = getDocByType(type);
            if (existing) {
              return <div key={type}>{docRow(existing, templateLabel(type))}</div>;
            }
            return (
              <label key={type} className="flex items-center gap-2 text-sm border rounded px-3 py-2 cursor-pointer hover:bg-muted/50">
                <input
                  type="checkbox"
                  checked={selected.includes(type)}
                  onChange={() => toggle(type)}
                />
                {templateLabel(type)}
              </label>
            );
          })}
      </div>
      {selected.length > 0 && (
        <Button
          size="sm"
          onClick={async () => {
            for (const type of selected) {
              await onGenerate(type);
            }
            setSelected([]);
          }}
          disabled={generating}
        >
          {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
          Generate Selected ({selected.length})
        </Button>
      )}
      {allApproved && (
        <Button size="sm" onClick={() => onAdvanceStage("FILED")}>
          Mark as Filed →
        </Button>
      )}
    </div>
  );
}
