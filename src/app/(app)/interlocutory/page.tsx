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
  FileSignature, Eye, Download, CheckCircle, Pencil, Trash2, Database,
  Scale, Printer,
} from "lucide-react";
import { toast } from "sonner";
import { RoleGate } from "@/components/role-gate";
import { useSession } from "next-auth/react";
import { format } from "date-fns";

const IA_TYPES = [
  { value: "IA_EMERGENT_NUMBERING", label: "1. Emergent Numbering" },
  { value: "IA_ADVANCE", label: "2. Advance Application" },
  { value: "IA_INJUNCTION", label: "3. Injunction" },
  { value: "IA_ATTACHMENT", label: "4. Attachment" },
  { value: "IA_COMMISSION", label: "5. Commission" },
  { value: "IA_SET_ASIDE_COMMISSION", label: "6. Set Aside Commission Report" },
  { value: "IA_REMIT_COMMISSION", label: "7. Remit Commission Report" },
  { value: "IA_IMPLEAD", label: "8. Implead" },
  { value: "IA_AMEND", label: "9. Amend Pleadings" },
  { value: "IA_SET_ASIDE_ABATEMENT", label: "10. Set Aside Abatement" },
  { value: "IA_CONDONE_DELAY", label: "11. Condone Delay" },
  { value: "IA_RAISE_ATTACHMENT", label: "12. Raise Attachment" },
  { value: "IA_VACATE_INJUNCTION", label: "13. Vacate Injunction" },
  { value: "IA_SUBSTITUTE_SERVICE", label: "14. Substitute Service" },
  { value: "IA_RECEIVE_WS", label: "15. Receive Written Statement" },
  { value: "IA_STRIKE_DEFENCE", label: "16. Strike Off Defence" },
  { value: "IA_COURT_FEE_EXTENSION", label: "17. Extension of Time to Pay Court Fee" },
  { value: "IA_AMEND_DECREE", label: "18. Amend Decree/Judgment" },
  { value: "IA_FINAL_DECREE", label: "19. Pass Final Decree" },
  { value: "IA_DISPENSE_NOTICE", label: "20. Dispense With Notice" },
  { value: "IA_FULL_SATISFACTION", label: "21. Record Full Satisfaction" },
  { value: "IA_COMPROMISE", label: "22. Compromise" },
  { value: "IA_BREAK_OPEN_LOCK", label: "23. Break Open Lock" },
  { value: "IA_POLICE_PROTECTION", label: "24. Police Protection" },
  { value: "IA_DELIVERY", label: "25. Delivery Application" },
  { value: "IA_FD_RETURN", label: "26. FD Return" },
  { value: "IA_RECORD_MAJORITY", label: "27. Record of Majority" },
  { value: "IA_ADJOURNMENT", label: "28. Adjournment" },
  { value: "IA_REMOVE_FROM_LIST", label: "29. Remove From List" },
  { value: "IA_CALL_DOCUMENTS_COURT", label: "30. Call For Documents (Court/Office)" },
  { value: "IA_CALL_DOCUMENTS_PARTY", label: "31. Call For Documents (Opposite Party)" },
  { value: "IA_CHEQUE", label: "32. Cheque Application" },
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
  createdAt: string;
  case: { id: string; caseNumber: string; title: string; courtName: string | null } | null;
  template: { name: string } | null;
  creator: { name: string } | null;
}

interface CaseTemplate {
  id: string;
  name: string;
  documentType: string;
  description: string | null;
  content: string;
  variables: string | null;
}

export default function InterlocutoryPage() {
  const { data: session } = useSession();
  const [documents, setDocuments] = useState<CaseDocument[]>([]);
  const [templates, setTemplates] = useState<CaseTemplate[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [genOpen, setGenOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<CaseTemplate | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [selectedCaseData, setSelectedCaseData] = useState<any>(null);
  const [fetchingCase, setFetchingCase] = useState(false);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [previewContent, setPreviewContent] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [generating, setGenerating] = useState(false);
  const [createdDocId, setCreatedDocId] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editDoc, setEditDoc] = useState<CaseDocument | null>(null);
  const [editContent, setEditContent] = useState("");

  const [seeding, setSeeding] = useState(false);
  const [typeFilter, setTypeFilter] = useState("ALL");

  const fetchDocuments = useCallback(async () => {
    const res = await fetch("/api/case-documents");
    const data = await res.json();
    const all: CaseDocument[] = data.documents || [];
    setDocuments(all.filter((d) => d.documentType.startsWith("IA_")));
  }, []);

  const fetchTemplates = useCallback(async () => {
    const res = await fetch("/api/case-templates?category=INTERLOCUTORY");
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
    setSelectedCaseData(null);
    setVariableValues({});
    setPreviewContent("");
    setShowPreview(false);
    setCreatedDocId("");
    setDocTitle(template.name);
    setGenOpen(true);
  };

  const handleCaseSelect = async (caseId: string) => {
    setSelectedCaseId(caseId);
    setFetchingCase(true);
    try {
      const res = await fetch(`/api/cases/${caseId}`);
      const c = await res.json();
      setSelectedCaseData(c);

      const firstClient = c.caseClients?.[0]?.client;
      const allOPs = c.oppositeParties || [];
      const firstOP = allOPs[0];
      const filingYear = c.filingDate
        ? new Date(c.filingDate).getFullYear().toString()
        : new Date().getFullYear().toString();

      // Build respondents string (all opposite party names joined)
      const respondentStr = allOPs.length > 1
        ? allOPs.map((op: any, i: number) => `${i + 1}. ${op.name}`).join("\n")
        : firstOP?.name || "";

      setVariableValues((prev) => ({
        ...prev,
        courtName: c.courtName || "",
        caseNumber: c.caseNumber || "",
        caseType: c.caseSubType || c.caseType || "",
        year: filingYear,
        date: format(new Date(), "dd/MM/yyyy"),
        place: "Palakkad",
        petitionerName: firstClient?.name || "",
        applicantName: firstClient?.name || "",
        applicantRole: "Petitioner",
        respondentName: respondentStr,
        advocateName: session?.user?.name || "G. Ananthakrishnan",
      }));
    } catch {
      // fallback to list data
      const c = cases.find((x) => x.id === caseId);
      if (c) {
        setVariableValues((prev) => ({
          ...prev,
          courtName: c.courtName || "",
          caseNumber: c.caseNumber || "",
          caseType: c.caseType || "",
          year: new Date().getFullYear().toString(),
          date: format(new Date(), "dd/MM/yyyy"),
          place: "Palakkad",
        }));
      }
    } finally {
      setFetchingCase(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedTemplate || !selectedCaseId) {
      toast.error("Select a case first");
      return;
    }
    setGenerating(true);

    // Create document
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

    // Generate with variables
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
      toast.success("IA saved");
      setGenOpen(false);
      fetchDocuments();
    } else {
      toast.error("Save failed");
    }
  };

  const handleFinalize = async (docId: string) => {
    const res = await fetch(`/api/case-documents/${docId}/finalize`, { method: "POST" });
    if (res.ok) {
      toast.success("Marked as finalized");
      fetchDocuments();
    } else {
      toast.error("Failed");
    }
  };

  const handlePrint = (doc: CaseDocument) => {
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(`<html><head><title>${doc.title}</title>
        <style>body{font-family:'Times New Roman',serif;margin:2cm;line-height:1.6;}
        pre{white-space:pre-wrap;font-family:inherit;}
        @media print{.no-print{display:none;}}</style></head>
        <body>
        <button class="no-print" onclick="window.print()" style="padding:8px 16px;margin-bottom:1cm;cursor:pointer;">Print</button>
        <pre>${doc.content}</pre>
        </body></html>`);
      w.document.close();
    }
  };

  const handleDelete = async (docId: string) => {
    const res = await fetch(`/api/case-documents/${docId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Deleted");
      fetchDocuments();
    }
  };

  const filteredDocs = typeFilter === "ALL"
    ? documents
    : documents.filter((d) => d.documentType === typeFilter);

  const variableNames = selectedTemplate?.variables
    ? (JSON.parse(selectedTemplate.variables) as string[])
    : [];

  if (loading) return <div className="text-center py-10 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Scale className="h-8 w-8" /> Interlocutory Applications
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Generate and manage all 31 petition types with printout
          </p>
        </div>
        <Button variant="outline" onClick={handleSeed} disabled={seeding}>
          <Database className="mr-2 h-4 w-4" />
          {seeding ? "Seeding..." : "Load IA Templates"}
        </Button>
      </div>

      <Tabs defaultValue="create">
        <TabsList>
          <TabsTrigger value="create">Create New IA</TabsTrigger>
          <TabsTrigger value="documents">My IAs ({documents.length})</TabsTrigger>
        </TabsList>

        {/* Create Tab - Template Grid */}
        <TabsContent value="create">
          {templates.length === 0 ? (
            <div className="text-center py-16 border rounded-lg">
              <Scale className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No IA templates loaded yet.</p>
              <Button onClick={handleSeed}>
                <Database className="mr-2 h-4 w-4" /> Load IA Templates
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {IA_TYPES.map((iaType) => {
                const template = templates.find((t) => t.documentType === iaType.value);
                return (
                  <Card
                    key={iaType.value}
                    className={`cursor-pointer transition-shadow ${template ? "hover:shadow-md" : "opacity-50"}`}
                    onClick={() => template && openGen(template)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm">{iaType.label}</p>
                          {template?.description && (
                            <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                          )}
                        </div>
                        {template ? (
                          <FileSignature className="h-4 w-4 text-primary shrink-0 ml-2" />
                        ) : (
                          <Badge variant="outline" className="text-xs">Not loaded</Badge>
                        )}
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
          <div className="mb-4 flex gap-2">
            <Select value={typeFilter} onValueChange={(v: any) => setTypeFilter(String(v || "ALL"))}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                {IA_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filteredDocs.length === 0 ? (
            <p className="text-center py-10 text-muted-foreground">No IAs created yet</p>
          ) : (
            <div className="space-y-3">
              {filteredDocs.map((doc) => (
                <Card key={doc.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <FileSignature className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{doc.title}</span>
                          <Badge variant={STATUS_COLORS[doc.status]}>{doc.status}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground flex gap-3">
                          {doc.case && <span>Case: {doc.case.caseNumber}</span>}
                          <span>{IA_TYPES.find((t) => t.value === doc.documentType)?.label || doc.documentType}</span>
                          <span>{format(new Date(doc.createdAt), "dd MMM yyyy")}</span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost" size="icon"
                          onClick={() => { setEditDoc(doc); setEditContent(doc.content); setEditOpen(true); }}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          onClick={() => handlePrint(doc)}
                          title="Print"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        {doc.status !== "FINALIZED" && (
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => handleFinalize(doc.id)}
                            title="Finalize"
                          >
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                        <RoleGate permission="cases:write">
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => handleDelete(doc.id)}
                            title="Delete"
                          >
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
              {/* Case Selection */}
              <div className="space-y-2">
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
                {fetchingCase && (
                  <p className="text-xs text-muted-foreground">Loading case details...</p>
                )}
                {selectedCaseData && !fetchingCase && (
                  <div className="rounded-md bg-muted/50 border px-3 py-2 text-xs space-y-0.5">
                    <p><span className="font-medium">Petitioner:</span> {selectedCaseData.caseClients?.[0]?.client?.name || "—"}</p>
                    <p><span className="font-medium">Respondents:</span> {(selectedCaseData.oppositeParties || []).map((op: any) => op.name).join(", ") || "—"}</p>
                    <p><span className="font-medium">Court:</span> {selectedCaseData.courtName || "—"} &nbsp;|&nbsp; <span className="font-medium">Filed:</span> {selectedCaseData.filingDate ? format(new Date(selectedCaseData.filingDate), "dd/MM/yyyy") : "—"}</p>
                    {selectedCaseData.suitValue && (
                      <p><span className="font-medium">Suit Value:</span> ₹{selectedCaseData.suitValue.toLocaleString("en-IN")}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Document Title */}
              <div>
                <Label>Document Title</Label>
                <Input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} />
              </div>

              {/* Variable Fields */}
              {variableNames.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Fill in the Details</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {variableNames.map((varName) => (
                      <div key={varName}>
                        <Label className="capitalize text-xs">
                          {varName.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim()}
                        </Label>
                        {varName === "facts" || varName === "grounds" || varName === "reliefSought" || varName === "reasonForDelay" ? (
                          <Textarea
                            value={variableValues[varName] || ""}
                            onChange={(e) => setVariableValues((p) => ({ ...p, [varName]: e.target.value }))}
                            rows={3}
                            placeholder={`Enter ${varName}...`}
                          />
                        ) : (
                          <Input
                            value={variableValues[varName] || ""}
                            onChange={(e) => setVariableValues((p) => ({ ...p, [varName]: e.target.value }))}
                            placeholder={varName}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={handleGenerate}
                disabled={!selectedCaseId || generating}
                className="w-full"
              >
                {generating ? "Generating..." : "Generate IA"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Preview & Edit</Label>
                <Button variant="outline" size="sm" onClick={() => setShowPreview(false)}>
                  ← Back to Form
                </Button>
              </div>
              <Textarea
                value={previewContent}
                onChange={(e) => setPreviewContent(e.target.value)}
                rows={30}
                className="font-mono text-sm"
              />
              <div className="flex gap-2">
                <Button onClick={handleSaveEdited} className="flex-1">
                  Save IA
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const w = window.open("", "_blank");
                    if (w) {
                      w.document.write(`<html><head><title>${docTitle}</title>
                        <style>body{font-family:'Times New Roman',serif;margin:2cm;line-height:1.6;}
                        pre{white-space:pre-wrap;font-family:inherit;}
                        @media print{.no-print{display:none;}}</style></head>
                        <body>
                        <button class="no-print" onclick="window.print()" style="padding:8px;margin-bottom:1cm;cursor:pointer;">Print</button>
                        <pre>${previewContent}</pre>
                        </body></html>`);
                      w.document.close();
                    }
                  }}
                >
                  <Printer className="mr-2 h-4 w-4" /> Print Preview
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
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={30}
            className="font-mono text-sm"
          />
          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={async () => {
                if (!editDoc) return;
                const res = await fetch(`/api/case-documents/${editDoc.id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ content: editContent }),
                });
                if (res.ok) {
                  toast.success("Saved");
                  setEditOpen(false);
                  fetchDocuments();
                } else {
                  toast.error("Save failed");
                }
              }}
            >
              Save Changes
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const w = window.open("", "_blank");
                if (w) {
                  w.document.write(`<html><head><title>${editDoc?.title}</title>
                    <style>body{font-family:'Times New Roman',serif;margin:2cm;line-height:1.6;}
                    pre{white-space:pre-wrap;font-family:inherit;}
                    @media print{.no-print{display:none;}}</style></head>
                    <body>
                    <button class="no-print" onclick="window.print()" style="padding:8px;margin-bottom:1cm;cursor:pointer;">Print</button>
                    <pre>${editContent}</pre>
                    </body></html>`);
                  w.document.close();
                }
              }}
            >
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
