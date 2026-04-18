"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  FileText, Eye, Trash2, Printer, ChevronRight, AlertCircle, RefreshCw,
  ArrowRight, X,
} from "lucide-react";
import { toast } from "sonner";
import { MATTER_STAGES, OS_FILING_BUNDLE, CS_FILING_BUNDLE, EP_TYPES, BANKING_TEMPLATES } from "@/lib/banking-templates";

/** Opens a new window with just the document text and prints it (A4, monospace) */
function printDocument(title: string, content: string) {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) { toast.error("Pop-up blocked — allow pop-ups for this site to print"); return; }
  win.document.write(`<!DOCTYPE html>
<html><head>
<title>${title}</title>
<style>
  @page { size: A4; margin: 2.5cm 2.5cm 2.5cm 3cm; }
  body { font-family: "Courier New", Courier, monospace; font-size: 12pt; line-height: 1.6;
         white-space: pre-wrap; word-break: break-word; color: #000; background: #fff; }
  h1 { font-size: 13pt; text-align: center; margin-bottom: 1em; font-family: Arial, sans-serif; }
  @media print { body { margin: 0; } }
</style>
</head><body>
<h1>${title}</h1>
${content.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}
<script>window.onload=function(){ window.print(); window.onafterprint=function(){ window.close(); }; }<\/script>
</body></html>`);
  win.document.close();
}

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

function stageStatus(currentStage: string, targetStage: string, suitType: string) {
  const current = stageIndex(currentStage);
  const target = stageIndex(targetStage);
  if (targetStage === "MEDIATION" && suitType === "OS") return "SKIP";
  if (target < current) return "DONE";
  if (target === current) return "ACTIVE";
  return "LOCKED";
}

// ============================================================
// MAIN PAGE
// ============================================================
export default function BankingMatterPage() {
  const [matters, setMatters] = useState<Matter[]>([]);
  const [activeMatter, setActiveMatter] = useState<Matter | null>(null);
  const [loading, setLoading] = useState(true);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ title: "", suitType: "OS", courtName: "", courtType: "Munsiff" });
  const [creating, setCreating] = useState(false);

  // Upload & extraction
  const [uploadStatus, setUploadStatus] = useState<{
    phase: "idle" | "uploading" | "extracting" | "done" | "error";
    files: string[];
    error?: string;
  }>({ phase: "idle", files: [] });

  // Generate
  const [generating, setGenerating] = useState<string | null>(null); // documentType being generated

  // Document view/edit
  const [viewDoc, setViewDoc] = useState<MatterDoc | null>(null);
  const [editContent, setEditContent] = useState("");

  const loadMatters = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/banking-matter");
      if (r.ok) setMatters(await r.json());
      else {
        const e = await r.json().catch(() => ({}));
        toast.error(e.error || "Failed to load matters");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMatter = useCallback(async (id: string) => {
    const r = await fetch(`/api/banking-matter/${id}`);
    if (r.ok) {
      const m = await r.json();
      setActiveMatter(m);
    } else {
      const e = await r.json().catch(() => ({}));
      toast.error(e.error || "Failed to load matter");
    }
  }, []);

  useEffect(() => { loadMatters(); }, [loadMatters]);

  // ── Create matter ──────────────────────────────────────────
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
        toast.success("Matter created — upload bank documents to begin");
        setCreateOpen(false);
        setCreateForm({ title: "", suitType: "OS", courtName: "", courtType: "Munsiff" });
        await loadMatters();
        loadMatter(m.id);
      } else {
        const e = await r.json().catch(() => ({}));
        toast.error(e.error || "Failed to create matter");
      }
    } finally { setCreating(false); }
  };

  // ── Upload & Extract ──────────────────────────────────────
  const handleUploadExtract = async (files: FileList) => {
    if (!activeMatter || !files.length) return;

    const fileNames = Array.from(files).map((f) => f.name);
    setUploadStatus({ phase: "uploading", files: fileNames });

    try {
      const formData = new FormData();
      Array.from(files).forEach((f) => formData.append("files", f));

      setUploadStatus({ phase: "extracting", files: fileNames });

      const r = await fetch("/api/banking-matter/extract", {
        method: "POST",
        body: formData,
      });

      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        setUploadStatus({ phase: "error", files: fileNames, error: e.error || "Extraction failed" });
        toast.error(e.error || "Extraction failed");
        return;
      }

      const d = await r.json();

      // Save extracted data and advance stage
      const saveR = await fetch(`/api/banking-matter/${activeMatter.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          extractedData: d.extractedData,
          currentStage: "NOTICE",
        }),
      });

      if (!saveR.ok) {
        const e = await saveR.json().catch(() => ({}));
        setUploadStatus({ phase: "error", files: fileNames, error: e.error || "Failed to save extracted data" });
        toast.error(e.error || "Failed to save extracted data");
        return;
      }

      setUploadStatus({ phase: "done", files: fileNames });
      toast.success(`✓ Extracted data from ${d.filesProcessed.length} file(s) — ready for Notice`);
      loadMatter(activeMatter.id);
    } catch (err: any) {
      setUploadStatus({ phase: "error", files: fileNames, error: err.message });
      toast.error(err.message || "Upload failed");
    }
  };

  // ── Generate document ─────────────────────────────────────
  const handleGenerate = async (documentType: string) => {
    if (!activeMatter) return;
    setGenerating(documentType);
    try {
      const r = await fetch(`/api/banking-matter/${activeMatter.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentType }),
      });
      if (r.ok) {
        const d = await r.json();
        if (d.remainingPlaceholders?.length) {
          toast.info(`Generated with ${d.remainingPlaceholders.length} unfilled field(s) — review and edit: ${d.remainingPlaceholders.slice(0, 3).join(", ")}${d.remainingPlaceholders.length > 3 ? "..." : ""}`);
        } else {
          toast.success("Document generated — click to review");
        }
        loadMatter(activeMatter.id);
      } else {
        const e = await r.json().catch(() => ({}));
        toast.error(e.error || "Generation failed");
      }
    } finally { setGenerating(null); }
  };

  // ── Approve / edit document ───────────────────────────────
  const handleDocAction = async (docId: string, action?: "APPROVED" | "UNDER_REVIEW" | "GENERATED", content?: string) => {
    if (!activeMatter) return;
    const body: any = { documentId: docId };
    if (action) body.status = action;
    if (content !== undefined) body.content = content;

    const r = await fetch(`/api/banking-matter/${activeMatter.id}/documents`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (r.ok) {
      toast.success(action === "APPROVED" ? "Document approved ✓" : "Saved");
      loadMatter(activeMatter.id);
      if (action) setViewDoc(null);
    } else {
      const e = await r.json().catch(() => ({}));
      toast.error(e.error || "Failed to update document");
    }
  };

  // ── Advance stage ─────────────────────────────────────────
  const advanceStage = async (nextStage: string) => {
    if (!activeMatter) return;
    const r = await fetch(`/api/banking-matter/${activeMatter.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentStage: nextStage }),
    });
    if (r.ok) {
      toast.success(`Advanced to ${MATTER_STAGES.find((s) => s.code === nextStage)?.label || nextStage}`);
      loadMatter(activeMatter.id);
    } else {
      const e = await r.json().catch(() => ({}));
      toast.error(e.error || "Failed to advance stage");
    }
  };

  // ── Delete matter ─────────────────────────────────────────
  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      const r = await fetch(`/api/banking-matter/${id}`, { method: "DELETE" });
      if (r.ok) {
        toast.success("Matter deleted");
        setDeleteTarget(null);
        setActiveMatter(null);
        setUploadStatus({ phase: "idle", files: [] });
        loadMatters();
      } else {
        const e = await r.json().catch(() => ({}));
        toast.error(e.error || "Failed to delete matter");
      }
    } finally {
      setDeleting(false);
    }
  };

  // ── Change suit type ──────────────────────────────────────
  const changeSuitType = async (type: string) => {
    if (!activeMatter) return;
    const r = await fetch(`/api/banking-matter/${activeMatter.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suitType: type }),
    });
    if (r.ok) {
      toast.success(`Suit type changed to ${type}`);
      loadMatter(activeMatter.id);
    }
  };

  const getDocByType = (type: string) =>
    activeMatter?.matterDocuments?.find((d) => d.documentType === type);

  // ── Render active matter ──────────────────────────────────
  if (activeMatter) {
    return (
      <ActiveMatterView
        matter={activeMatter}
        uploadStatus={uploadStatus}
        onUpload={handleUploadExtract}
        onGenerate={handleGenerate}
        generating={generating}
        onDocAction={handleDocAction}
        onAdvanceStage={advanceStage}
        onChangeSuitType={changeSuitType}
        onDelete={handleDelete}
        getDocByType={getDocByType}
        viewDoc={viewDoc}
        setViewDoc={setViewDoc}
        editContent={editContent}
        setEditContent={setEditContent}
        onReload={() => loadMatter(activeMatter.id)}
        onBack={() => { setActiveMatter(null); setUploadStatus({ phase: "idle", files: [] }); loadMatters(); }}
      />
    );
  }

  // ── Matter list ───────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Landmark className="h-6 w-6" />
            Banking Matters
          </h1>
          <p className="text-sm text-muted-foreground">
            End-to-end pipeline: Documents → Notice → Plaint → Filing Bundle → EP
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Matter
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin inline mb-2" />
          <p>Loading matters...</p>
        </div>
      ) : matters.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Landmark className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-lg font-medium mb-1">No banking matters yet</p>
            <p className="text-sm mb-4">Create a matter to start the recovery pipeline</p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> New Matter
            </Button>
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
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{m.title}</p>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    <Badge variant="outline">{m.suitType}</Badge>
                    <Badge variant="secondary">
                      {MATTER_STAGES.find((s) => s.code === m.currentStage)?.label || m.currentStage}
                    </Badge>
                    {m.case && <Badge variant="outline">{m.case.caseNumber}</Badge>}
                    {m.courtName && <span className="text-xs text-muted-foreground">{m.courtName}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground shrink-0">
                  <span className="text-xs">{m.matterDocuments?.length || 0} docs</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget({ id: m.id, title: m.title });
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <ChevronRight className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" /> Delete Matter
            </DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>&ldquo;{deleteTarget?.title}&rdquo;</strong> and all
              its generated documents. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && handleDelete(deleteTarget.id)}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete Matter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Banking Matter</DialogTitle>
            <DialogDescription>
              Start a new banking recovery pipeline. You will upload bank documents next.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Matter Title *</Label>
              <Input
                value={createForm.title}
                onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                placeholder="e.g., Canara Bank vs. Krishnadas K."
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
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
                    <SelectItem value="OS">OS — Original Suit</SelectItem>
                    <SelectItem value="CS">CS — Commercial Suit</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Consider CS if value &gt; ₹10L
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
              {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Create Matter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// ACTIVE MATTER VIEW
// ============================================================
function ActiveMatterView({
  matter, uploadStatus, onUpload, onGenerate, generating,
  onDocAction, onAdvanceStage, onChangeSuitType, onDelete, getDocByType,
  viewDoc, setViewDoc, editContent, setEditContent, onReload, onBack,
}: any) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stages = MATTER_STAGES.filter(
    (s) => !(s.code === "MEDIATION" && matter.suitType === "OS")
  );
  const filingBundle = matter.suitType === "CS" ? CS_FILING_BUNDLE : OS_FILING_BUNDLE;
  const extracted = matter.extractedData;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Button variant="ghost" size="sm" onClick={onBack} className="mb-2 -ml-2">
            ← All Matters
          </Button>
          <h1 className="text-xl font-bold">{matter.title}</h1>
          <div className="flex gap-2 mt-1 flex-wrap items-center">
            <Select value={matter.suitType} onValueChange={onChangeSuitType}>
              <SelectTrigger className="w-28 h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OS">OS (Original)</SelectItem>
                <SelectItem value="CS">CS (Commercial)</SelectItem>
              </SelectContent>
            </Select>
            {matter.courtName && <Badge variant="outline">{matter.courtName}</Badge>}
            <Badge>
              {MATTER_STAGES.find((s: any) => s.code === matter.currentStage)?.label || matter.currentStage}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onReload}>
            <RefreshCw className="h-3 w-3 mr-1" /> Refresh
          </Button>
          <Button variant="outline" size="sm" title="Open a document to print it" disabled>
            <Printer className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" /> Delete Matter
            </DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>&ldquo;{matter.title}&rdquo;</strong> and all{" "}
              <strong>{matter.matterDocuments?.length || 0} generated document(s)</strong>.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={async () => {
                setDeleting(true);
                await onDelete(matter.id);
                setDeleting(false);
                setConfirmDelete(false);
              }}
            >
              {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete Matter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload status banner */}
      {uploadStatus.phase !== "idle" && (
        <Card className={
          uploadStatus.phase === "done" ? "border-green-400 bg-green-50/40" :
          uploadStatus.phase === "error" ? "border-red-400 bg-red-50/40" :
          "border-blue-300 bg-blue-50/30"
        }>
          <CardContent className="py-3 flex items-start gap-3">
            {uploadStatus.phase === "uploading" || uploadStatus.phase === "extracting" ? (
              <Loader2 className="h-5 w-5 animate-spin text-blue-600 mt-0.5 shrink-0" />
            ) : uploadStatus.phase === "done" ? (
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">
                {uploadStatus.phase === "uploading" && "Uploading files..."}
                {uploadStatus.phase === "extracting" && "AI extracting data from documents..."}
                {uploadStatus.phase === "done" && "Extraction complete — ready for Notice"}
                {uploadStatus.phase === "error" && `Extraction failed: ${uploadStatus.error}`}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                Files: {uploadStatus.files.join(", ")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Extracted data card */}
      {extracted && (
        <Card className="border-green-200 bg-green-50/20">
          <CardHeader className="py-3 pb-0">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Extracted Data Card
            </CardTitle>
          </CardHeader>
          <CardContent className="py-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Bank</p>
                <p className="font-medium">{extracted.bankName || "—"}</p>
                <p className="text-xs text-muted-foreground">{extracted.branchName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Borrower(s)</p>
                {extracted.borrowers?.length ? (
                  extracted.borrowers.map((b: any, i: number) => (
                    <p key={i} className="font-medium text-sm">{b.name}</p>
                  ))
                ) : (
                  <p className="font-medium">{extracted.borrowerName || "—"}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Outstanding</p>
                <p className="font-medium text-red-700 text-base">
                  ₹{Number(extracted.outstandingAmount || 0).toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-muted-foreground">as on {extracted.outstandingDate}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Facilities</p>
                {extracted.loanFacilities?.map((f: any, i: number) => (
                  <p key={i} className="text-xs">
                    {f.type}: ₹{Number(f.amount || 0).toLocaleString("en-IN")} @ {f.interestRate}%
                  </p>
                ))}
              </div>
            </div>
            {(extracted.suggestedCourt || extracted.suggestedSuitType) && (
              <div className="mt-3 pt-3 border-t flex gap-4 text-xs text-muted-foreground">
                {extracted.suggestedSuitType && (
                  <span>AI suggestion: <strong>{extracted.suggestedSuitType}</strong></span>
                )}
                {extracted.suggestedCourt && (
                  <span>Court: <strong>{extracted.suggestedCourt}</strong></span>
                )}
                {extracted.confidence && (
                  <span>Confidence: <strong>{extracted.confidence}</strong></span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pipeline stages */}
      <div className="space-y-2">
        {stages.map((stage: any, idx: number) => {
          const ss = stageStatus(matter.currentStage, stage.code, matter.suitType);
          const prevStage = stages[idx - 1];
          return (
            <StageCard
              key={stage.code}
              stage={stage}
              status={ss}
              matter={matter}
              fileInputRef={stage.code === "DOCUMENTS" ? fileInputRef : null}
              onUpload={onUpload}
              uploadStatus={uploadStatus}
              onGenerate={onGenerate}
              generating={generating}
              onDocAction={onDocAction}
              onAdvanceStage={onAdvanceStage}
              getDocByType={getDocByType}
              filingBundle={filingBundle}
              setViewDoc={setViewDoc}
              setEditContent={setEditContent}
              prevStageLabel={prevStage?.label}
            />
          );
        })}
      </div>

      {/* Hidden file input — controlled via ref */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".doc,.docx,.pdf,.txt,.rtf"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) {
            onUpload(e.target.files);
            e.target.value = ""; // reset so same file can be re-uploaded
          }
        }}
      />

      {/* Document view/edit dialog */}
      <Dialog open={!!viewDoc} onOpenChange={() => setViewDoc(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {viewDoc?.title}
            </DialogTitle>
            <div className="flex gap-2">
              <Badge variant={
                viewDoc?.status === "APPROVED" ? "default" :
                viewDoc?.status === "UNDER_REVIEW" ? "outline" : "secondary"
              }>
                {viewDoc?.status}
              </Badge>
            </div>
          </DialogHeader>
          <Textarea
            rows={28}
            className="font-mono text-xs leading-relaxed"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
          />
          <DialogFooter className="gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setViewDoc(null)}>Close</Button>
            <Button
              variant="outline"
              onClick={() => printDocument(viewDoc?.title || "Document", editContent)}
            >
              <Printer className="h-4 w-4 mr-2" /> Print
            </Button>
            <Button
              variant="outline"
              onClick={() => onDocAction(viewDoc?.id, undefined, editContent)}
            >
              Save Edits
            </Button>
            {viewDoc?.status !== "APPROVED" && (
              <Button onClick={() => onDocAction(viewDoc?.id, "APPROVED", editContent)}>
                <CheckCircle className="h-4 w-4 mr-2" /> Approve Document
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
  stage, status, matter, fileInputRef, onUpload, uploadStatus, onGenerate, generating,
  onDocAction, onAdvanceStage, getDocByType, filingBundle,
  setViewDoc, setEditContent, prevStageLabel,
}: any) {
  const isActive = status === "ACTIVE";
  const isDone = status === "DONE";
  const isLocked = status === "LOCKED";

  const icon = isDone
    ? <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
    : isActive
    ? <Circle className="h-5 w-5 text-blue-600 fill-blue-100 shrink-0" />
    : <Lock className="h-5 w-5 text-muted-foreground/50 shrink-0" />;

  const cardClass = isDone
    ? "border-green-200 bg-green-50/10"
    : isActive
    ? "border-blue-300 bg-blue-50/20"
    : "opacity-50";

  // Helper: render a document row
  const docRow = (doc: MatterDoc | undefined, label: string) => {
    if (!doc) return null;
    return (
      <div key={doc.id} className="flex items-center gap-2 text-sm border rounded px-3 py-2 bg-background">
        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="flex-1 truncate">{label}</span>
        <Badge
          variant={doc.status === "APPROVED" ? "default" : doc.status === "UNDER_REVIEW" ? "outline" : "secondary"}
          className="text-xs"
        >
          {doc.status === "APPROVED" ? "✓ Approved" : doc.status === "UNDER_REVIEW" ? "Under Review" : "Draft"}
        </Badge>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2"
          onClick={() => { setViewDoc(doc); setEditContent(doc.content); }}
        >
          <Eye className="h-3 w-3 mr-1" /> View
        </Button>
      </div>
    );
  };

  // Helper: generate button
  const genBtn = (docType: string, label: string) => {
    const isGenerating = generating === docType;
    const existing = getDocByType(docType);
    if (existing) return docRow(existing, label);
    return (
      <Button
        size="sm"
        onClick={() => onGenerate(docType)}
        disabled={!!generating}
      >
        {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
        {isGenerating ? "Generating..." : `Generate ${label}`}
      </Button>
    );
  };

  return (
    <Card className={`transition-all ${cardClass}`}>
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">{icon}</div>
          <div className="flex-1 min-w-0">
            {/* Stage header */}
            <div className="flex items-center justify-between gap-2">
              <p className={`font-medium ${isLocked ? "text-muted-foreground" : ""}`}>
                {stage.label}
              </p>
              {isDone && <Badge variant="outline" className="text-green-700 text-xs">Complete</Badge>}
              {isActive && <Badge className="text-xs bg-blue-600">Active</Badge>}
            </div>

            {/* Locked explanation */}
            {isLocked && (
              <p className="text-xs text-muted-foreground mt-1">
                Complete {prevStageLabel || "the previous stage"} first
              </p>
            )}

            {/* ── DOCUMENTS stage ── */}
            {stage.code === "DOCUMENTS" && isActive && (
              <div className="mt-3 space-y-3">
                {!matter.extractedData ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Upload all documents from the bank — loan agreement, sanction letter,
                      demand notice, ledger, hypothecation deed, guarantee deeds, etc.
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => fileInputRef?.current?.click()}
                        disabled={uploadStatus.phase === "uploading" || uploadStatus.phase === "extracting"}
                      >
                        {uploadStatus.phase === "uploading" || uploadStatus.phase === "extracting" ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {uploadStatus.phase === "uploading" ? "Uploading..." : "Extracting..."}</>
                        ) : (
                          <><Upload className="h-4 w-4 mr-2" />Upload & Extract</>
                        )}
                      </Button>
                      {uploadStatus.phase === "error" && (
                        <Button variant="outline" size="sm" onClick={() => fileInputRef?.current?.click()}>
                          Retry
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Accepts: PDF, Word (.doc/.docx), TXT, RTF
                    </p>
                  </>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-green-700">
                      <CheckCircle className="h-4 w-4" />
                      Data extracted successfully — review the card above
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => onAdvanceStage("NOTICE")}>
                        <ArrowRight className="h-4 w-4 mr-2" /> Proceed to Notice
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => fileInputRef?.current?.click()}
                        disabled={uploadStatus.phase === "extracting"}
                      >
                        <Upload className="h-4 w-4 mr-1" /> Re-upload
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* DOCUMENTS done — show re-upload option */}
            {stage.code === "DOCUMENTS" && isDone && (
              <div className="mt-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs h-7"
                  onClick={() => fileInputRef?.current?.click()}
                  disabled={uploadStatus.phase === "extracting"}
                >
                  <Upload className="h-3 w-3 mr-1" /> Upload additional documents
                </Button>
              </div>
            )}

            {/* ── NOTICE stage ── */}
            {stage.code === "NOTICE" && isActive && (
              <div className="mt-3 space-y-2">
                {genBtn("DEMAND_NOTICE", "Demand Notice")}
                {getDocByType("DEMAND_NOTICE") && (
                  <>
                    {getDocByType("DEMAND_NOTICE")?.status !== "APPROVED" && (
                      <p className="text-xs text-amber-600">
                        ↑ Review and approve the notice to proceed
                      </p>
                    )}
                    {getDocByType("DEMAND_NOTICE")?.status === "APPROVED" && (
                      <Button size="sm" onClick={() =>
                        onAdvanceStage(matter.suitType === "CS" ? "MEDIATION" : "PLAINT")
                      }>
                        <ArrowRight className="h-4 w-4 mr-2" />
                        Proceed to {matter.suitType === "CS" ? "Mediation" : "Plaint"}
                      </Button>
                    )}
                  </>
                )}
              </div>
            )}

            {/* NOTICE done */}
            {stage.code === "NOTICE" && isDone && (
              <div className="mt-2 space-y-1">
                {docRow(getDocByType("DEMAND_NOTICE"), "Demand Notice")}
              </div>
            )}

            {/* ── MEDIATION stage (CS only) ── */}
            {stage.code === "MEDIATION" && isActive && (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-muted-foreground">
                  Mandatory pre-institution mediation — Section 12A, Commercial Courts Act 2015
                </p>
                {genBtn("MEDIATION_APPLICATION", "Mediation Application (Form-1)")}
                {getDocByType("MEDIATION_APPLICATION") && (
                  <>
                    {getDocByType("MEDIATION_APPLICATION")?.status !== "APPROVED" && (
                      <p className="text-xs text-amber-600">↑ Approve the application to proceed</p>
                    )}
                    {getDocByType("MEDIATION_APPLICATION")?.status === "APPROVED" && (
                      <Button size="sm" onClick={() => onAdvanceStage("PLAINT")}>
                        <ArrowRight className="h-4 w-4 mr-2" /> Proceed to Plaint
                      </Button>
                    )}
                  </>
                )}
              </div>
            )}

            {stage.code === "MEDIATION" && isDone && (
              <div className="mt-2 space-y-1">
                {docRow(getDocByType("MEDIATION_APPLICATION"), "Mediation Application")}
              </div>
            )}

            {/* ── PLAINT stage ── */}
            {stage.code === "PLAINT" && isActive && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-muted-foreground">Filing as:</span>
                  <Badge variant={matter.suitType === "CS" ? "destructive" : "default"} className="text-xs">
                    {matter.suitType === "CS" ? "Commercial Suit" : "Original Suit"}
                  </Badge>
                </div>
                {genBtn(
                  matter.suitType === "CS" ? "CS_PLAINT" : "OS_PLAINT",
                  `${matter.suitType} Plaint`
                )}
                {getDocByType(matter.suitType === "CS" ? "CS_PLAINT" : "OS_PLAINT") && (
                  <>
                    {getDocByType(matter.suitType === "CS" ? "CS_PLAINT" : "OS_PLAINT")?.status !== "APPROVED" && (
                      <p className="text-xs text-amber-600">↑ Review and approve the plaint to proceed</p>
                    )}
                    {getDocByType(matter.suitType === "CS" ? "CS_PLAINT" : "OS_PLAINT")?.status === "APPROVED" && (
                      <Button size="sm" onClick={() => onAdvanceStage("FILING_BUNDLE")}>
                        <ArrowRight className="h-4 w-4 mr-2" /> Proceed to Filing Bundle
                      </Button>
                    )}
                  </>
                )}
              </div>
            )}

            {stage.code === "PLAINT" && isDone && (
              <div className="mt-2 space-y-1">
                {docRow(
                  getDocByType(matter.suitType === "CS" ? "CS_PLAINT" : "OS_PLAINT"),
                  `${matter.suitType} Plaint`
                )}
              </div>
            )}

            {/* ── FILING BUNDLE stage ── */}
            {stage.code === "FILING_BUNDLE" && isActive && (
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

            {stage.code === "FILING_BUNDLE" && isDone && (
              <div className="mt-2 space-y-1">
                {matter.matterDocuments
                  ?.filter((d: MatterDoc) => filingBundle.includes(d.documentType))
                  .map((d: MatterDoc) => (
                    <div key={d.id}>{docRow(d, d.title)}</div>
                  ))}
              </div>
            )}

            {/* ── TRIAL stage ── */}
            {stage.code === "TRIAL" && isActive && (
              <div className="mt-3 space-y-2">
                {genBtn("PROOF_AFFIDAVIT", "Proof Affidavit")}
                {getDocByType("PROOF_AFFIDAVIT")?.status === "APPROVED" && (
                  <Button size="sm" onClick={() => onAdvanceStage("DECREE")}>
                    <ArrowRight className="h-4 w-4 mr-2" /> Proceed to Decree
                  </Button>
                )}
              </div>
            )}

            {stage.code === "TRIAL" && isDone && (
              <div className="mt-2 space-y-1">
                {docRow(getDocByType("PROOF_AFFIDAVIT"), "Proof Affidavit")}
              </div>
            )}

            {/* ── DECREE stage ── */}
            {stage.code === "DECREE" && isActive && (
              <div className="mt-3 space-y-2">
                <p className="text-sm text-muted-foreground">
                  Upload the court decree to extract details for the Execution Petition.
                </p>
                <Button size="sm" onClick={() => onAdvanceStage("EXECUTION")}>
                  <ArrowRight className="h-4 w-4 mr-2" /> Decree received — Proceed to Execution
                </Button>
              </div>
            )}

            {/* ── EXECUTION stage ── */}
            {stage.code === "EXECUTION" && isActive && (
              <div className="mt-3 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Generate Execution Petition(s). Multiple EPs can be generated for the same decree.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {EP_TYPES.map((ep: any) => (
                    <Button
                      key={ep.code}
                      size="sm"
                      variant="outline"
                      onClick={() => onGenerate(ep.code)}
                      disabled={!!generating}
                      className="justify-start text-left h-auto py-2"
                    >
                      {generating === ep.code ? (
                        <Loader2 className="h-3 w-3 mr-2 animate-spin shrink-0" />
                      ) : (
                        <FileText className="h-3 w-3 mr-2 shrink-0" />
                      )}
                      <span className="text-xs">{ep.label}</span>
                    </Button>
                  ))}
                </div>
                {/* Generated EPs */}
                <div className="space-y-1">
                  {EP_TYPES.map((ep: any) => {
                    const doc = getDocByType(ep.code);
                    return doc ? <div key={ep.code}>{docRow(doc, ep.label)}</div> : null;
                  })}
                </div>
                {/* EP Affidavit */}
                <div className="border-t pt-2">
                  {genBtn("EP_AFFIDAVIT", "EP Supporting Affidavit")}
                </div>
              </div>
            )}

            {stage.code === "EXECUTION" && isDone && (
              <div className="mt-2 space-y-1">
                {matter.matterDocuments
                  ?.filter((d: MatterDoc) => d.documentType.startsWith("EP_"))
                  .map((d: MatterDoc) => <div key={d.id}>{docRow(d, d.title)}</div>)}
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
  const [bulkGenerating, setBulkGenerating] = useState(false);

  const toggle = (type: string) =>
    setSelected((prev) => prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]);

  const templateLabel = (type: string) =>
    BANKING_TEMPLATES.find((t) => t.documentType === type)?.name || type;

  const allApproved = filingBundle.every(
    (type: string) => getDocByType(type)?.status === "APPROVED"
  );

  const pending = filingBundle.filter((type: string) => !getDocByType(type));
  const generated = filingBundle.filter((type: string) => !!getDocByType(type));

  const handleSelectAll = () => {
    setSelected(pending.length === selected.length ? [] : [...pending]);
  };

  const handleBulkGenerate = async () => {
    setBulkGenerating(true);
    for (const type of selected) {
      await onGenerate(type);
    }
    setSelected([]);
    setBulkGenerating(false);
  };

  return (
    <div className="mt-3 space-y-3">
      {/* Generated docs */}
      {generated.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Generated</p>
          {generated.map((type: string) => (
            <div key={type}>{docRow(getDocByType(type), templateLabel(type))}</div>
          ))}
        </div>
      )}

      {/* Pending docs */}
      {pending.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">To Generate</p>
            <button className="text-xs text-primary underline" onClick={handleSelectAll}>
              {selected.length === pending.length ? "Deselect all" : "Select all"}
            </button>
          </div>
          {pending.map((type: string) => (
            <label
              key={type}
              className="flex items-center gap-2 text-sm border rounded px-3 py-2 cursor-pointer hover:bg-muted/50"
            >
              <input
                type="checkbox"
                checked={selected.includes(type)}
                onChange={() => toggle(type)}
              />
              {templateLabel(type)}
            </label>
          ))}
          {selected.length > 0 && (
            <Button
              size="sm"
              onClick={handleBulkGenerate}
              disabled={bulkGenerating || !!generating}
            >
              {bulkGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
              Generate {selected.length} Selected
            </Button>
          )}
        </div>
      )}

      {allApproved && (
        <div className="pt-1 border-t">
          <Button size="sm" onClick={() => onAdvanceStage("FILED")}>
            <CheckCircle className="h-4 w-4 mr-2" /> Mark as Filed
          </Button>
        </div>
      )}
    </div>
  );
}
