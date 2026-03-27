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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Gavel, FileText, Plus, Pencil, Trash2, CheckCircle, Printer,
  Database, Upload, Eye,
} from "lucide-react";
import { toast } from "sonner";
import { RoleGate } from "@/components/role-gate";
import { format } from "date-fns";

const EP_TYPES = [
  { value: "EP_MAIN", label: "Execution Petition (Main)" },
  { value: "EP_BATTA", label: "Batta Application" },
  { value: "EP_NOTICE", label: "Notice Application" },
  { value: "EP_ARREST", label: "Arrest Application" },
  { value: "EP_ATTACHMENT", label: "Attachment of Property" },
  { value: "EP_SALE", label: "Sale of Attached Property" },
];

const STATUS_COLORS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "secondary",
  REVIEW: "outline",
  FINALIZED: "default",
  FILED: "default",
};

interface CaseDocument {
  id: string;
  caseId: string;
  documentType: string;
  title: string;
  content: string;
  status: string;
  courtName: string | null;
  filedDate: string | null;
  filingNumber: string | null;
  createdAt: string;
  case: { id: string; caseNumber: string; title: string; courtName: string | null } | null;
  template: { name: string } | null;
}

interface CaseTemplate {
  id: string;
  name: string;
  documentType: string;
  content: string;
  variables: string | null;
}

export default function ExecutionPage() {
  const [documents, setDocuments] = useState<CaseDocument[]>([]);
  const [templates, setTemplates] = useState<CaseTemplate[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [genOpen, setGenOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<CaseTemplate | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [previewContent, setPreviewContent] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [generating, setGenerating] = useState(false);
  const [createdDocId, setCreatedDocId] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editDoc, setEditDoc] = useState<CaseDocument | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editFilingNumber, setEditFilingNumber] = useState("");

  const [decreeUploadOpen, setDecreeUploadOpen] = useState(false);
  const [decreeFile, setDecreeFile] = useState<File | null>(null);
  const [decreeUploadCaseId, setDecreeUploadCaseId] = useState("");

  const [seeding, setSeeding] = useState(false);

  const fetchDocuments = useCallback(async () => {
    const res = await fetch("/api/case-documents");
    const data = await res.json();
    const all: CaseDocument[] = data.documents || [];
    setDocuments(all.filter((d) => d.documentType.startsWith("EP_")));
  }, []);

  const fetchTemplates = useCallback(async () => {
    const res = await fetch("/api/case-templates?category=EXECUTION");
    const data = await res.json();
    setTemplates(data.templates || []);
  }, []);

  useEffect(() => {
    Promise.all([
      fetchDocuments(),
      fetchTemplates(),
      fetch("/api/cases?limit=200").then((r) => r.json()).then((d) => setCases(d.cases || [])),
    ]).then(() => setLoading(false));
  }, [fetchDocuments, fetchTemplates]);

  const handleSeed = async () => {
    setSeeding(true);
    const res = await fetch("/api/case-templates/seed", { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      toast.success(data.message);
      fetchTemplates();
    } else {
      toast.error("Seeding failed");
    }
    setSeeding(false);
  };

  const openGen = (template: CaseTemplate) => {
    setSelectedTemplate(template);
    setSelectedCaseId("");
    setVariableValues({ year: new Date().getFullYear().toString(), date: format(new Date(), "dd/MM/yyyy") });
    setPreviewContent("");
    setShowPreview(false);
    setCreatedDocId("");
    setDocTitle(template.name);
    setGenOpen(true);
  };

  const handleCaseSelect = (caseId: string) => {
    setSelectedCaseId(caseId);
    const c = cases.find((x) => x.id === caseId);
    if (c) {
      setVariableValues((prev) => ({
        ...prev,
        courtName: c.courtName || "",
        csNumber: c.caseNumber || "",
        year: new Date().getFullYear().toString(),
        date: format(new Date(), "dd/MM/yyyy"),
        place: c.courtName || "",
      }));
    }
  };

  const handleGenerate = async () => {
    if (!selectedTemplate || !selectedCaseId) {
      toast.error("Select a case first");
      return;
    }
    setGenerating(true);

    const createRes = await fetch("/api/case-documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caseId: selectedCaseId,
        documentType: selectedTemplate.documentType,
        title: docTitle,
        content: "...",
        templateId: selectedTemplate.id,
      }),
    });
    if (!createRes.ok) {
      toast.error("Failed to create document");
      setGenerating(false);
      return;
    }
    const created = await createRes.json();
    setCreatedDocId(created.id);

    const genRes = await fetch(`/api/case-documents/${created.id}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId: selectedTemplate.id, variables: variableValues }),
    });
    if (genRes.ok) {
      const gen = await genRes.json();
      setPreviewContent(gen.content);
      setShowPreview(true);
    } else {
      toast.error("Generation failed");
    }
    setGenerating(false);
  };

  const handleSaveEdited = async () => {
    if (!createdDocId || !previewContent) return;
    const res = await fetch(`/api/case-documents/${createdDocId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: previewContent }),
    });
    if (res.ok) {
      toast.success("EP saved");
      setGenOpen(false);
      fetchDocuments();
    } else {
      toast.error("Save failed");
    }
  };

  const handleSaveEdit = async () => {
    if (!editDoc) return;
    const res = await fetch(`/api/case-documents/${editDoc.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: editContent,
        filingNumber: editFilingNumber || undefined,
      }),
    });
    if (res.ok) {
      toast.success("Saved");
      setEditOpen(false);
      fetchDocuments();
    } else {
      toast.error("Save failed");
    }
  };

  const handleFinalize = async (docId: string) => {
    const res = await fetch(`/api/case-documents/${docId}/finalize`, { method: "POST" });
    if (res.ok) { toast.success("Finalized"); fetchDocuments(); }
  };

  const handleDelete = async (docId: string) => {
    const res = await fetch(`/api/case-documents/${docId}`, { method: "DELETE" });
    if (res.ok) { toast.success("Deleted"); fetchDocuments(); }
  };

  const handlePrint = (doc: CaseDocument) => {
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(`<html><head><title>${doc.title}</title>
        <style>body{font-family:'Times New Roman',serif;margin:2cm;line-height:1.6;}
        pre{white-space:pre-wrap;font-family:inherit;}
        @media print{.no-print{display:none;}}</style></head>
        <body>
        <button class="no-print" onclick="window.print()" style="padding:8px;margin-bottom:1cm;cursor:pointer;">Print</button>
        <pre>${doc.content}</pre>
        </body></html>`);
      w.document.close();
    }
  };

  // Decree upload is just uploading to the documents system for the case
  const handleDecreeUpload = async () => {
    if (!decreeFile || !decreeUploadCaseId) {
      toast.error("Select a case and file");
      return;
    }
    const formData = new FormData();
    formData.append("file", decreeFile);
    formData.append("caseId", decreeUploadCaseId);
    formData.append("title", `Decree/Judgment - ${decreeFile.name}`);

    const res = await fetch("/api/documents", {
      method: "POST",
      body: formData,
    });
    if (res.ok) {
      toast.success("Decree/Judgment uploaded successfully");
      setDecreeUploadOpen(false);
      setDecreeFile(null);
      setDecreeUploadCaseId("");
    } else {
      toast.error("Upload failed");
    }
  };

  const variableNames = selectedTemplate?.variables
    ? (JSON.parse(selectedTemplate.variables) as string[])
    : [];

  if (loading) return <div className="text-center py-10 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Gavel className="h-8 w-8" /> Execution & Decree
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage decrees, generate Execution Petitions and EP applications
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setDecreeUploadOpen(true)}>
            <Upload className="mr-2 h-4 w-4" /> Upload Decree/Judgment
          </Button>
          <Button variant="outline" onClick={handleSeed} disabled={seeding}>
            <Database className="mr-2 h-4 w-4" />
            {seeding ? "Loading..." : "Load EP Templates"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="create">
        <TabsList>
          <TabsTrigger value="create">Create EP / Application</TabsTrigger>
          <TabsTrigger value="documents">My EPs ({documents.length})</TabsTrigger>
        </TabsList>

        {/* Create Tab */}
        <TabsContent value="create">
          {templates.length === 0 ? (
            <div className="text-center py-16 border rounded-lg">
              <Gavel className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No EP templates loaded.</p>
              <Button onClick={handleSeed}>
                <Database className="mr-2 h-4 w-4" /> Load EP Templates
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {EP_TYPES.map((epType) => {
                const template = templates.find((t) => t.documentType === epType.value);
                return (
                  <Card
                    key={epType.value}
                    className={`cursor-pointer transition-shadow ${template ? "hover:shadow-md border-primary/20" : "opacity-50"}`}
                    onClick={() => template && openGen(template)}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3">
                        <Gavel className="h-8 w-8 text-primary shrink-0" />
                        <div>
                          <p className="font-semibold">{epType.label}</p>
                          {!template && (
                            <Badge variant="outline" className="text-xs mt-1">Not loaded</Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          {documents.length === 0 ? (
            <p className="text-center py-10 text-muted-foreground">No EPs created yet</p>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <Card key={doc.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{doc.title}</span>
                          <Badge variant={STATUS_COLORS[doc.status]}>{doc.status}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground flex gap-3">
                          {doc.case && <span>Case: {doc.case.caseNumber}</span>}
                          <span>{EP_TYPES.find((t) => t.value === doc.documentType)?.label || doc.documentType}</span>
                          {doc.filingNumber && <span>EP No: {doc.filingNumber}</span>}
                          <span>{format(new Date(doc.createdAt), "dd MMM yyyy")}</span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost" size="icon"
                          onClick={() => {
                            setEditDoc(doc);
                            setEditContent(doc.content);
                            setEditFilingNumber(doc.filingNumber || "");
                            setEditOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handlePrint(doc)}>
                          <Printer className="h-4 w-4" />
                        </Button>
                        {doc.status !== "FINALIZED" && (
                          <Button variant="ghost" size="icon" onClick={() => handleFinalize(doc.id)}>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                        <RoleGate permission="cases:write">
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(doc.id)}>
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
        </TabsContent>
      </Tabs>

      {/* Generate Dialog */}
      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTemplate?.name}</DialogTitle>
          </DialogHeader>

          {!showPreview ? (
            <div className="space-y-4">
              <div>
                <Label>Select Case *</Label>
                <Select value={selectedCaseId} onValueChange={(v: any) => handleCaseSelect(String(v || ""))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a case..." />
                  </SelectTrigger>
                  <SelectContent>
                    {cases.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.caseNumber} — {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Document Title</Label>
                <Input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} />
              </div>

              {variableNames.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Fill in Details</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {variableNames.map((varName) => (
                      <div key={varName}>
                        <Label className="text-xs capitalize">
                          {varName.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim()}
                        </Label>
                        {["propertyDescription", "modeOfExecution", "grounds"].includes(varName) ? (
                          <Textarea
                            value={variableValues[varName] || ""}
                            onChange={(e) => setVariableValues((p) => ({ ...p, [varName]: e.target.value }))}
                            rows={3}
                          />
                        ) : (
                          <Input
                            value={variableValues[varName] || ""}
                            onChange={(e) => setVariableValues((p) => ({ ...p, [varName]: e.target.value }))}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={handleGenerate} disabled={!selectedCaseId || generating} className="w-full">
                {generating ? "Generating..." : "Generate EP"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Preview & Edit</Label>
                <Button variant="outline" size="sm" onClick={() => setShowPreview(false)}>← Back</Button>
              </div>
              <Textarea
                value={previewContent}
                onChange={(e) => setPreviewContent(e.target.value)}
                rows={28}
                className="font-mono text-sm"
              />
              <div className="flex gap-2">
                <Button onClick={handleSaveEdited} className="flex-1">Save EP</Button>
                <Button variant="outline" onClick={() => {
                  const w = window.open("", "_blank");
                  if (w) {
                    w.document.write(`<html><head><title>${docTitle}</title>
                      <style>body{font-family:'Times New Roman',serif;margin:2cm;line-height:1.6;}
                      pre{white-space:pre-wrap;font-family:inherit;}@media print{.no-print{display:none;}}</style></head>
                      <body><button class="no-print" onclick="window.print()" style="padding:8px;margin-bottom:1cm;cursor:pointer;">Print</button>
                      <pre>${previewContent}</pre></body></html>`);
                    w.document.close();
                  }
                }}>
                  <Printer className="mr-2 h-4 w-4" /> Print
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit — {editDoc?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>EP/Filing Number</Label>
              <Input
                value={editFilingNumber}
                onChange={(e) => setEditFilingNumber(e.target.value)}
                placeholder="E.P. No. / Filing Number"
              />
            </div>
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={28}
              className="font-mono text-sm"
            />
            <div className="flex gap-2">
              <Button onClick={handleSaveEdit} className="flex-1">Save</Button>
              <Button variant="outline" onClick={() => {
                const w = window.open("", "_blank");
                if (w) {
                  w.document.write(`<html><head><title>${editDoc?.title}</title>
                    <style>body{font-family:'Times New Roman',serif;margin:2cm;line-height:1.6;}
                    pre{white-space:pre-wrap;font-family:inherit;}@media print{.no-print{display:none;}}</style></head>
                    <body><button class="no-print" onclick="window.print()" style="padding:8px;margin-bottom:1cm;cursor:pointer;">Print</button>
                    <pre>${editContent}</pre></body></html>`);
                  w.document.close();
                }
              }}>
                <Printer className="mr-2 h-4 w-4" /> Print
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Decree Upload Dialog */}
      <Dialog open={decreeUploadOpen} onOpenChange={setDecreeUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Decree / Judgment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Link to Case</Label>
              <Select value={decreeUploadCaseId} onValueChange={(v: any) => setDecreeUploadCaseId(String(v || ""))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select case..." />
                </SelectTrigger>
                <SelectContent>
                  {cases.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.caseNumber} — {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Decree / Judgment File</Label>
              <Input
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => setDecreeFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                PDF, Word, or image of the decree/judgment
              </p>
            </div>
            <Button onClick={handleDecreeUpload} disabled={!decreeFile || !decreeUploadCaseId} className="w-full">
              <Upload className="mr-2 h-4 w-4" /> Upload
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
