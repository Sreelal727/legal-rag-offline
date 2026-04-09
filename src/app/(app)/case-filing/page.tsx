"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  FileSignature,
  Eye,
  Download,
  CheckCircle,
  Pencil,
  Trash2,
  Sparkles,
  Database,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { RoleGate } from "@/components/role-gate";

const DOC_TYPES = [
  "PLAINT", "RCP", "GOP", "SOP", "SARFAESI", "NI_ACT_138", "CAVEAT",
  "PROOF_AFFIDAVIT", "FACT_AFFIDAVIT", "STATEMENT_OF_TRUTH", "VERIFICATION_AFFIDAVIT",
];

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-200 text-gray-800",
  REVIEW: "bg-blue-200 text-blue-800",
  FINALIZED: "bg-green-200 text-green-800",
  FILED: "bg-purple-200 text-purple-800",
};

interface CaseTemplate {
  id: string;
  name: string;
  category: string;
  documentType: string;
  description: string | null;
  content: string;
  variables: string | null;
  courtType: string | null;
}

interface CaseDocument {
  id: string;
  caseId: string;
  documentType: string;
  title: string;
  content: string;
  templateId: string | null;
  status: string;
  filedDate: string | null;
  filingNumber: string | null;
  courtName: string | null;
  notes: string | null;
  createdAt: string;
  case: { id: string; caseNumber: string; title: string; courtName: string | null } | null;
  template: { id: string; name: string; documentType: string } | null;
  creator: { id: string; name: string } | null;
}

interface CaseOption {
  id: string;
  caseNumber: string;
  title: string;
  courtName: string | null;
  caseType: string | null;
  courtType: string | null;
  judge: string | null;
  filingDate: string | null;
  status: string | null;
  stage: string | null;
  clients: { name: string; role: string; address: string; phone: string; fatherHusbandName: string }[];
}

export default function CaseFilingPage() {
  const [templates, setTemplates] = useState<CaseTemplate[]>([]);
  const [documents, setDocuments] = useState<CaseDocument[]>([]);
  const [cases, setCases] = useState<CaseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("templates");

  // Template generation dialog
  const [genOpen, setGenOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<CaseTemplate | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [previewContent, setPreviewContent] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [docTitle, setDocTitle] = useState("");

  // Document edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editDoc, setEditDoc] = useState<CaseDocument | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // Document view dialog
  const [viewOpen, setViewOpen] = useState(false);
  const [viewDoc, setViewDoc] = useState<CaseDocument | null>(null);

  // Case search dropdown
  const [caseSearch, setCaseSearch] = useState("");
  const [caseDropdownOpen, setCaseDropdownOpen] = useState(false);
  const caseDropdownRef = useRef<HTMLDivElement>(null);

  // Filter
  const [statusFilter, setStatusFilter] = useState("ALL");

  const fetchTemplates = useCallback(async () => {
    const res = await fetch("/api/case-templates");
    const data = await res.json();
    setTemplates(data.templates || []);
  }, []);

  const fetchDocuments = useCallback(async () => {
    const res = await fetch("/api/case-documents");
    const data = await res.json();
    setDocuments(data.documents || []);
  }, []);

  const fetchCases = useCallback(async () => {
    const res = await fetch("/api/cases?limit=5000");
    const data = await res.json();
    setCases(
      (data.cases || []).map((c: any) => ({
        id: c.id,
        caseNumber: c.caseNumber,
        title: c.title,
        courtName: c.courtName || null,
        caseType: c.caseType || null,
        courtType: c.courtType || null,
        judge: c.judge || null,
        filingDate: c.filingDate || null,
        status: c.status || null,
        stage: c.stage || null,
        clients: (c.caseClients || []).map((cc: any) => ({
          name: cc.client?.name || "",
          role: cc.role || "",
          address: cc.client?.address || "",
          phone: cc.client?.phone || "",
          fatherHusbandName: cc.client?.fatherHusbandName || "",
        })),
      }))
    );
  }, []);

  useEffect(() => {
    Promise.all([fetchTemplates(), fetchDocuments(), fetchCases()]).then(() =>
      setLoading(false)
    );
  }, [fetchTemplates, fetchDocuments, fetchCases]);

  const handleSeedTemplates = async () => {
    const res = await fetch("/api/case-templates/seed", { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      toast.success(data.message);
      fetchTemplates();
    } else {
      toast.error(data.error || "Failed to seed templates");
    }
  };

  const openGenerateDialog = (template: CaseTemplate) => {
    setSelectedTemplate(template);
    setSelectedCaseId("");
    setCaseSearch("");
    setVariableValues({});
    setPreviewContent("");
    setShowPreview(false);
    setDocTitle(`${template.name}`);
    setGenOpen(true);
  };

  const handleCaseSelectForGenerate = (caseId: string) => {
    setSelectedCaseId(caseId);
    const caseData = cases.find((c) => c.id === caseId);
    if (caseData) {
      setCaseSearch(`${caseData.caseNumber} - ${caseData.title}`);
      setCaseDropdownOpen(false);

      // Auto-fill all possible template variables from case data
      const petitionerRoles = ["PETITIONER", "PLAINTIFF", "COMPLAINANT"];
      const respondentRoles = ["RESPONDENT", "DEFENDANT", "ACCUSED"];

      const petitioners = caseData.clients.filter((cl) => petitionerRoles.includes(cl.role));
      const respondents = caseData.clients.filter((cl) => respondentRoles.includes(cl.role));
      const allClients = caseData.clients;

      const pet = petitioners[0] || { name: "", address: "", phone: "", fatherHusbandName: "" };
      const resp = respondents[0] || { name: "", address: "", phone: "", fatherHusbandName: "" };
      const firstClient = allClients[0] || { name: "", address: "", phone: "", fatherHusbandName: "" };

      setVariableValues((prev) => ({
        ...prev,
        // Case details
        courtName: caseData.courtName || prev.courtName || "",
        caseNumber: caseData.caseNumber || prev.caseNumber || "",
        caseTitle: caseData.title || prev.caseTitle || "",
        caseType: caseData.caseType?.replace(/_/g, " ") || prev.caseType || "",
        courtType: caseData.courtType?.replace(/_/g, " ") || prev.courtType || "",
        judge: caseData.judge || prev.judge || "",
        judgeName: caseData.judge || prev.judgeName || "",
        filingDate: caseData.filingDate ? new Date(caseData.filingDate).toLocaleDateString("en-IN") : prev.filingDate || "",

        // Petitioner / Plaintiff / Complainant
        petitionerName: pet.name || prev.petitionerName || "",
        petitionerNames: petitioners.map((p) => p.name).join(", ") || prev.petitionerNames || "",
        petitionerAddress: pet.address || prev.petitionerAddress || "",
        plaintiffName: pet.name || prev.plaintiffName || "",
        plaintiffAddress: pet.address || prev.plaintiffAddress || "",
        complainantName: pet.name || prev.complainantName || "",
        complainantAddress: pet.address || prev.complainantAddress || "",
        complainantPhone: pet.phone || prev.complainantPhone || "",
        complainantFatherName: pet.fatherHusbandName || prev.complainantFatherName || "",

        // Respondent / Defendant / Accused
        respondentName: resp.name || prev.respondentName || "",
        respondentNames: respondents.map((r) => r.name).join(", ") || prev.respondentNames || "",
        respondentAddress: resp.address || prev.respondentAddress || "",
        defendantName: resp.name || prev.defendantName || "",
        defendantAddress: resp.address || prev.defendantAddress || "",
        accusedName: resp.name || prev.accusedName || "",
        accusedAddress: resp.address || prev.accusedAddress || "",

        // Generic client
        clientName: firstClient.name || prev.clientName || "",
        clientAddress: firstClient.address || prev.clientAddress || "",
        clientPhone: firstClient.phone || prev.clientPhone || "",
        clientFatherName: firstClient.fatherHusbandName || prev.clientFatherName || "",
      }));
    }
  };

  // Close case dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (caseDropdownRef.current && !caseDropdownRef.current.contains(e.target as Node)) {
        setCaseDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCasesForDropdown = cases.filter((c) => {
    if (!caseSearch) return true;
    const q = caseSearch.toLowerCase();
    return (
      c.caseNumber.toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q) ||
      (c.courtName || "").toLowerCase().includes(q)
    );
  }).slice(0, 50);

  const handleGeneratePreview = async () => {
    if (!selectedTemplate || !selectedCaseId) {
      toast.error("Please select a case");
      return;
    }

    // Create a temporary document first
    const createRes = await fetch("/api/case-documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caseId: selectedCaseId,
        documentType: selectedTemplate.documentType,
        title: docTitle || selectedTemplate.name,
        content: "Generating...",
        templateId: selectedTemplate.id,
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.json();
      toast.error(err.error || "Failed to create document");
      return;
    }

    const created = await createRes.json();

    // Generate content from template
    const genRes = await fetch(`/api/case-documents/${created.id}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        templateId: selectedTemplate.id,
        variables: variableValues,
      }),
    });

    if (!genRes.ok) {
      const err = await genRes.json();
      toast.error(err.error || "Failed to generate document");
      return;
    }

    const genData = await genRes.json();
    setPreviewContent(genData.document.content);
    setShowPreview(true);
    setEditDoc(genData.document);

    if (genData.remainingPlaceholders?.length > 0) {
      toast.info(
        `Some placeholders remain unfilled: ${genData.remainingPlaceholders.join(", ")}`
      );
    }

    fetchDocuments();
  };

  const handleSaveGenerated = async () => {
    if (!editDoc) return;

    const res = await fetch(`/api/case-documents/${editDoc.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: previewContent,
        title: docTitle,
      }),
    });

    if (res.ok) {
      toast.success("Document saved");
      setGenOpen(false);
      fetchDocuments();
    } else {
      toast.error("Failed to save");
    }
  };

  const openEditDialog = async (doc: CaseDocument) => {
    const res = await fetch(`/api/case-documents/${doc.id}`);
    if (res.ok) {
      const data = await res.json();
      setEditDoc(data);
      setEditContent(data.content);
      setEditNotes(data.notes || "");
      setEditOpen(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!editDoc) return;

    const res = await fetch(`/api/case-documents/${editDoc.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: editContent,
        notes: editNotes,
      }),
    });

    if (res.ok) {
      toast.success("Document updated");
      setEditOpen(false);
      fetchDocuments();
    } else {
      toast.error("Failed to update");
    }
  };

  const handleFinalize = async (docId: string) => {
    const res = await fetch(`/api/case-documents/${docId}/finalize`, {
      method: "POST",
    });

    if (res.ok) {
      toast.success("Document finalized");
      fetchDocuments();
      setViewOpen(false);
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to finalize");
    }
  };

  const handleExport = async (docId: string, format: "text" | "docx") => {
    const res = await fetch(`/api/case-documents/${docId}/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format }),
    });

    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = format === "docx" ? "docx" : "txt";
      a.download = `document.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Downloaded");
    } else {
      toast.error("Failed to export");
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    const res = await fetch(`/api/case-documents/${docId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Document deleted");
      fetchDocuments();
      setViewOpen(false);
    } else {
      toast.error("Failed to delete");
    }
  };

  const openViewDialog = async (doc: CaseDocument) => {
    const res = await fetch(`/api/case-documents/${doc.id}`);
    if (res.ok) {
      const data = await res.json();
      setViewDoc(data);
      setViewOpen(true);
    }
  };

  const templateVariables = selectedTemplate?.variables
    ? JSON.parse(selectedTemplate.variables)
    : [];

  const filteredDocuments =
    statusFilter === "ALL"
      ? documents
      : documents.filter((d) => d.status === statusFilter);

  const caseFilingTemplates = templates.filter((t) => t.category === "CASE_FILING");
  const affidavitTemplates = templates.filter((t) => t.category === "AFFIDAVIT");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileSignature className="h-8 w-8" />
            Case Filing & Documents
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generate court documents from templates
          </p>
        </div>
        <RoleGate permission="cases:write">
          <Button variant="outline" onClick={handleSeedTemplates}>
            <Database className="mr-2 h-4 w-4" /> Seed Default Templates
          </Button>
        </RoleGate>
      </div>

      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
        <TabsList>
          <TabsTrigger value="templates">Templates ({templates.length})</TabsTrigger>
          <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          {templates.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <p className="text-muted-foreground mb-4">
                  No templates found. Seed default templates to get started.
                </p>
                <Button onClick={handleSeedTemplates}>
                  <Database className="mr-2 h-4 w-4" /> Seed Default Templates
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Case Filing Templates */}
              {caseFilingTemplates.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold mb-3">Case Filing Templates</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {caseFilingTemplates.map((template) => (
                      <Card key={template.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center justify-between">
                            <span>{template.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {template.documentType.replace(/_/g, " ")}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-3">
                            {template.description}
                          </p>
                          {template.courtType && (
                            <p className="text-xs text-muted-foreground mb-3">
                              Court: {template.courtType.replace(/_/g, " ")}
                            </p>
                          )}
                          <RoleGate permission="cases:write">
                            <Button
                              size="sm"
                              onClick={() => openGenerateDialog(template)}
                            >
                              <Sparkles className="mr-1 h-3 w-3" /> Generate Document
                            </Button>
                          </RoleGate>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Affidavit Templates */}
              {affidavitTemplates.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold mb-3">Affidavit Templates</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {affidavitTemplates.map((template) => (
                      <Card key={template.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center justify-between">
                            <span>{template.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {template.documentType.replace(/_/g, " ")}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-3">
                            {template.description}
                          </p>
                          <RoleGate permission="cases:write">
                            <Button
                              size="sm"
                              onClick={() => openGenerateDialog(template)}
                            >
                              <Sparkles className="mr-1 h-3 w-3" /> Generate Document
                            </Button>
                          </RoleGate>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <div className="flex items-center gap-4">
            <Label className="text-sm">Status:</Label>
            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="REVIEW">Review</SelectItem>
                <SelectItem value="FINALIZED">Finalized</SelectItem>
                <SelectItem value="FILED">Filed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="text-center py-10 text-muted-foreground">Loading...</div>
          ) : filteredDocuments.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                No documents found. Generate documents from templates.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredDocuments.map((doc) => (
                <Card key={doc.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-sm truncate">{doc.title}</h3>
                          <Badge
                            className={`text-xs ${STATUS_COLORS[doc.status] || ""}`}
                          >
                            {doc.status}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {doc.documentType.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {doc.case && (
                            <span>
                              Case: {doc.case.caseNumber} - {doc.case.title}
                            </span>
                          )}
                          {doc.template && <span>Template: {doc.template.name}</span>}
                          {doc.creator && <span>By: {doc.creator.name}</span>}
                          <span>
                            {new Date(doc.createdAt).toLocaleDateString("en-IN")}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openViewDialog(doc)}
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <RoleGate permission="cases:write">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditDialog(doc)}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </RoleGate>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleExport(doc.id, "text")}
                          title="Export as text"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {doc.status !== "FINALIZED" && doc.status !== "FILED" && (
                          <RoleGate permission="cases:write">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-green-600"
                              onClick={() => handleFinalize(doc.id)}
                              title="Finalize"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          </RoleGate>
                        )}
                        <RoleGate permission="cases:write">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-700"
                            onClick={() => handleDeleteDoc(doc.id)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
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

      {/* Generate Document Dialog */}
      <Dialog open={genOpen} onOpenChange={(v) => {
        setGenOpen(v);
        if (!v) {
          setSelectedTemplate(null);
          setShowPreview(false);
          setPreviewContent("");
          setEditDoc(null);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Generate: {selectedTemplate?.name}
            </DialogTitle>
          </DialogHeader>

          {!showPreview ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Document Title</Label>
                <Input
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="Document title"
                />
              </div>

              <div className="space-y-2">
                <Label>Link to Case *</Label>
                <div className="relative" ref={caseDropdownRef}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={caseSearch}
                      onChange={(e) => {
                        setCaseSearch(e.target.value);
                        setCaseDropdownOpen(true);
                        if (!e.target.value) setSelectedCaseId("");
                      }}
                      onFocus={() => setCaseDropdownOpen(true)}
                      placeholder="Search by case number, title, or court..."
                      className="pl-9 pr-8"
                    />
                    {selectedCaseId && (
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setCaseSearch("");
                          setSelectedCaseId("");
                          setVariableValues({});
                          setCaseDropdownOpen(true);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {caseDropdownOpen && !selectedCaseId && (
                    <div className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-md border bg-popover shadow-lg">
                      {filteredCasesForDropdown.length === 0 ? (
                        <div className="p-3 text-sm text-muted-foreground text-center">No cases found</div>
                      ) : (
                        filteredCasesForDropdown.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-accent cursor-pointer border-b last:border-b-0"
                            onClick={() => handleCaseSelectForGenerate(c.id)}
                          >
                            <span className="font-medium">{c.caseNumber}</span>
                            <span className="text-muted-foreground"> — {c.title}</span>
                            {c.courtName && (
                              <span className="text-xs text-muted-foreground block">{c.courtName}</span>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {templateVariables.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">
                    Template Variables (auto-filled from case data where possible)
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    {templateVariables.map((varName: string) => (
                      <div key={varName} className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          {varName.replace(/([A-Z])/g, " $1").trim()}
                        </Label>
                        <Input
                          value={variableValues[varName] || ""}
                          onChange={(e) =>
                            setVariableValues((prev) => ({
                              ...prev,
                              [varName]: e.target.value,
                            }))
                          }
                          placeholder={varName}
                          className="h-8 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={handleGeneratePreview}
                className="w-full"
                disabled={!selectedCaseId}
              >
                <Sparkles className="mr-2 h-4 w-4" /> Generate & Preview
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Generated Content (editable)</Label>
                <Textarea
                  value={previewContent}
                  onChange={(e) => setPreviewContent(e.target.value)}
                  rows={20}
                  className="font-mono text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveGenerated} className="flex-1">
                  Save Document
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowPreview(false)}
                >
                  Back to Variables
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Document Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit: {editDoc?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={20}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
                placeholder="Internal notes..."
              />
            </div>
            <Button onClick={handleSaveEdit} className="w-full">
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Document Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewDoc?.title}
              {viewDoc && (
                <Badge className={STATUS_COLORS[viewDoc.status] || ""}>
                  {viewDoc.status}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {viewDoc && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {viewDoc.case && (
                  <span>Case: {viewDoc.case.caseNumber}</span>
                )}
                <span>Type: {viewDoc.documentType.replace(/_/g, " ")}</span>
                {viewDoc.creator && <span>By: {viewDoc.creator.name}</span>}
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <pre className="whitespace-pre-wrap font-mono text-sm">
                  {viewDoc.content}
                </pre>
              </div>
              {viewDoc.notes && (
                <div>
                  <Label className="text-sm font-semibold">Notes</Label>
                  <p className="text-sm text-muted-foreground">{viewDoc.notes}</p>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleExport(viewDoc.id, "text")}
                >
                  <Download className="mr-2 h-4 w-4" /> Export Text
                </Button>
                {viewDoc.status !== "FINALIZED" && viewDoc.status !== "FILED" && (
                  <RoleGate permission="cases:write">
                    <Button onClick={() => handleFinalize(viewDoc.id)}>
                      <CheckCircle className="mr-2 h-4 w-4" /> Finalize
                    </Button>
                  </RoleGate>
                )}
                <RoleGate permission="cases:write">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setViewOpen(false);
                      openEditDialog(viewDoc);
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </Button>
                </RoleGate>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
