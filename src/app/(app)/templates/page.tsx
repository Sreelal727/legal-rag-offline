"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { FileText, Plus, Edit, Trash2, Search, Eye, Copy, Save } from "lucide-react";
import { toast } from "sonner";

/* ─── constants ─── */

const CASE_TEMPLATE_CATEGORIES = [
  { value: "CASE_FILING", label: "Case Filing" },
  { value: "AFFIDAVIT", label: "Affidavit" },
  { value: "INTERLOCUTORY", label: "Interlocutory" },
  { value: "EXECUTION", label: "Execution" },
  { value: "WRITTEN_STATEMENT", label: "Written Statement" },
  { value: "COUNTER_STATEMENT", label: "Counter Statement" },
];

const NOTICE_TEMPLATE_CATEGORIES = [
  { value: "CPC", label: "CPC" },
  { value: "GENERAL", label: "General" },
  { value: "PROPERTY", label: "Property" },
  { value: "NI_ACT", label: "NI Act" },
  { value: "BANKING", label: "Banking" },
];

const COURT_TYPES = [
  "SUPREME_COURT",
  "HIGH_COURT",
  "DISTRICT_COURT",
  "TRIBUNAL",
  "CONSUMER_FORUM",
  "OTHER",
];

/* ─── types ─── */

interface CaseTemplate {
  id: string;
  name: string;
  category: string;
  documentType: string | null;
  description: string | null;
  content: string;
  variables: string | null;
  courtType: string | null;
  isActive?: boolean;
  createdAt?: string;
}

interface NoticeTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  content: string;
  variables: string | null;
  isActive?: boolean;
  createdAt?: string;
}

type TemplateKind = "case" | "notice";

/* ─── helpers ─── */

function extractVariables(content: string): string[] {
  const matches = content.match(/\{\{(\w+)\}\}/g);
  if (!matches) return [];
  const unique = [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, "")))];
  return unique;
}

function highlightVariables(content: string): React.ReactNode[] {
  const parts = content.split(/(\{\{\w+\}\})/g);
  return parts.map((part, i) => {
    if (/^\{\{\w+\}\}$/.test(part)) {
      return (
        <span key={i} className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 px-1 rounded font-mono text-sm">
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function getCategoryLabel(value: string, kind: TemplateKind): string {
  const list = kind === "case" ? CASE_TEMPLATE_CATEGORIES : NOTICE_TEMPLATE_CATEGORIES;
  return list.find((c) => c.value === value)?.label || value;
}

/* ─── component ─── */

export default function TemplatesPage() {
  /* tab state */
  const [activeTab, setActiveTab] = useState<TemplateKind>("case");

  /* data */
  const [caseTemplates, setCaseTemplates] = useState<CaseTemplate[]>([]);
  const [noticeTemplates, setNoticeTemplates] = useState<NoticeTemplate[]>([]);

  /* loading / filter */
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  /* dialogs */
  const [formOpen, setFormOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  /* editing */
  const [editingId, setEditingId] = useState<string | null>(null);

  /* form fields – case template */
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formDocumentType, setFormDocumentType] = useState("");
  const [formCourtType, setFormCourtType] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formContent, setFormContent] = useState("");

  /* preview */
  const [previewTemplate, setPreviewTemplate] = useState<CaseTemplate | NoticeTemplate | null>(null);

  /* saving */
  const [saving, setSaving] = useState(false);

  /* ─── fetch ─── */

  const fetchCaseTemplates = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (categoryFilter && activeTab === "case") params.set("category", categoryFilter);
      const res = await fetch(`/api/case-templates?${params}`);
      const text = await res.text();
      if (!text) {
        setCaseTemplates([]);
      } else {
        const data = JSON.parse(text);
        setCaseTemplates(data.templates || (Array.isArray(data) ? data : []));
      }
    } catch (err) {
      console.error("Failed to fetch case templates:", err);
      setCaseTemplates([]);
    }
  }, [categoryFilter, activeTab]);

  const fetchNoticeTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/notices/templates");
      const text = await res.text();
      if (!text) {
        setNoticeTemplates([]);
      } else {
        const data = JSON.parse(text);
        setNoticeTemplates(Array.isArray(data) ? data : data.templates || []);
      }
    } catch (err) {
      console.error("Failed to fetch notice templates:", err);
      setNoticeTemplates([]);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchCaseTemplates(), fetchNoticeTemplates()]);
    setLoading(false);
  }, [fetchCaseTemplates, fetchNoticeTemplates]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  /* ─── derived ─── */

  const extractedVariables = useMemo(() => extractVariables(formContent), [formContent]);

  const filteredCaseTemplates = useMemo(() => {
    let list = caseTemplates;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          (t.description || "").toLowerCase().includes(q) ||
          (t.documentType || "").toLowerCase().includes(q)
      );
    }
    if (categoryFilter) {
      list = list.filter((t) => t.category === categoryFilter);
    }
    return list;
  }, [caseTemplates, search, categoryFilter]);

  const filteredNoticeTemplates = useMemo(() => {
    let list = noticeTemplates;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          (t.description || "").toLowerCase().includes(q) ||
          (t.category || "").toLowerCase().includes(q)
      );
    }
    if (categoryFilter) {
      list = list.filter((t) => t.category === categoryFilter);
    }
    return list;
  }, [noticeTemplates, search, categoryFilter]);

  /* ─── form helpers ─── */

  const resetForm = () => {
    setEditingId(null);
    setFormName("");
    setFormCategory("");
    setFormDocumentType("");
    setFormCourtType("");
    setFormDescription("");
    setFormContent("");
  };

  const openCreateDialog = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEditDialog = (template: CaseTemplate | NoticeTemplate) => {
    setEditingId(template.id);
    setFormName(template.name);
    setFormDescription(template.description || "");
    setFormContent(template.content);

    if (activeTab === "case") {
      const ct = template as CaseTemplate;
      setFormCategory(ct.category || "");
      setFormDocumentType(ct.documentType || "");
      setFormCourtType(ct.courtType || "");
    } else {
      const nt = template as NoticeTemplate;
      setFormCategory(nt.category || "");
      setFormDocumentType("");
      setFormCourtType("");
    }

    setFormOpen(true);
  };

  const openPreview = (template: CaseTemplate | NoticeTemplate) => {
    setPreviewTemplate(template);
    setPreviewOpen(true);
  };

  const copyContent = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Template content copied to clipboard");
  };

  /* ─── CRUD ─── */

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error("Template name is required");
      return;
    }
    if (!formContent.trim()) {
      toast.error("Template content is required");
      return;
    }
    if (!formCategory) {
      toast.error("Category is required");
      return;
    }

    setSaving(true);

    try {
      if (activeTab === "case") {
        const body: Record<string, any> = {
          name: formName.trim(),
          category: formCategory,
          content: formContent,
          description: formDescription.trim() || undefined,
          documentType: formDocumentType || undefined,
          courtType: formCourtType || undefined,
          variables: extractedVariables.length > 0 ? JSON.stringify(extractedVariables) : undefined,
        };

        const url = editingId ? `/api/case-templates/${editingId}` : "/api/case-templates";
        const method = editingId ? "PUT" : "POST";

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (res.ok) {
          toast.success(editingId ? "Template updated" : "Template created");
          setFormOpen(false);
          resetForm();
          fetchCaseTemplates();
        } else {
          let errorMsg = `Failed (${res.status})`;
          try {
            const err = await res.json();
            errorMsg = err.error || errorMsg;
          } catch {}
          toast.error(errorMsg);
        }
      } else {
        const body: Record<string, any> = {
          name: formName.trim(),
          content: formContent,
          description: formDescription.trim() || undefined,
          category: formCategory || undefined,
          variables: extractedVariables.length > 0 ? JSON.stringify(extractedVariables) : undefined,
        };

        const url = editingId ? `/api/notices/templates/${editingId}` : "/api/notices/templates";
        const method = editingId ? "PUT" : "POST";

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (res.ok) {
          toast.success(editingId ? "Template updated" : "Template created");
          setFormOpen(false);
          resetForm();
          fetchNoticeTemplates();
        } else {
          let errorMsg = `Failed (${res.status})`;
          try {
            const err = await res.json();
            errorMsg = err.error || errorMsg;
          } catch {}
          toast.error(errorMsg);
        }
      }
    } catch (e) {
      console.error("Save error:", e);
      toast.error("Save failed — network error");
    }

    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template? This action cannot be undone.")) return;

    try {
      const url =
        activeTab === "case" ? `/api/case-templates/${id}` : `/api/notices/templates/${id}`;
      const res = await fetch(url, { method: "DELETE" });

      if (res.ok) {
        toast.success("Template deleted");
        if (activeTab === "case") {
          setCaseTemplates((prev) => prev.filter((t) => t.id !== id));
        } else {
          setNoticeTemplates((prev) => prev.filter((t) => t.id !== id));
        }
      } else {
        let errorMsg = `Delete failed (${res.status})`;
        try {
          const err = await res.json();
          errorMsg = err.error || errorMsg;
        } catch {}
        toast.error(errorMsg);
      }
    } catch {
      toast.error("Delete failed — network error");
    }
  };

  /* ─── tab change ─── */

  const handleTabChange = (val: string) => {
    setActiveTab(val as TemplateKind);
    setCategoryFilter("");
    setSearch("");
  };

  /* ─── template card renderer ─── */

  const renderTemplateCard = (template: CaseTemplate | NoticeTemplate) => {
    const variables = extractVariables(template.content);
    const category =
      activeTab === "case"
        ? (template as CaseTemplate).category
        : (template as NoticeTemplate).category || "GENERAL";

    return (
      <Card key={template.id} className="group hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-semibold truncate">
                {template.name}
              </CardTitle>
              {template.description && (
                <CardDescription className="mt-1 line-clamp-2">
                  {template.description}
                </CardDescription>
              )}
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openPreview(template)}>
                <Eye className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyContent(template.content)}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(template)}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(template.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {getCategoryLabel(category, activeTab)}
            </Badge>
            {activeTab === "case" && (template as CaseTemplate).documentType && (
              <Badge variant="outline">
                {(template as CaseTemplate).documentType}
              </Badge>
            )}
            {activeTab === "case" && (template as CaseTemplate).courtType && (
              <Badge variant="outline">
                {(template as CaseTemplate).courtType!.replace(/_/g, " ")}
              </Badge>
            )}
            {variables.length > 0 && (
              <span className="text-xs text-muted-foreground ml-auto">
                {variables.length} variable{variables.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          {/* Content preview */}
          <div className="mt-3 p-2 bg-muted/50 rounded text-xs text-muted-foreground line-clamp-3 font-mono whitespace-pre-wrap">
            {template.content.slice(0, 200)}
            {template.content.length > 200 ? "…" : ""}
          </div>
        </CardContent>
      </Card>
    );
  };

  /* ─── render ─── */

  const currentCategories = activeTab === "case" ? CASE_TEMPLATE_CATEGORIES : NOTICE_TEMPLATE_CATEGORIES;
  const currentFiltered = activeTab === "case" ? filteredCaseTemplates : filteredNoticeTemplates;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Template Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage case filing and notice templates for your organisation
          </p>
        </div>
        <Dialog
          open={formOpen}
          onOpenChange={(v) => {
            setFormOpen(v);
            if (!v) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" /> New Template
            </Button>
          </DialogTrigger>

          {/* ─── Create / Edit Dialog ─── */}
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit Template" : "Create New Template"}{" "}
                <span className="text-muted-foreground font-normal">
                  ({activeTab === "case" ? "Case Template" : "Notice Template"})
                </span>
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Row 1: Name */}
              <div className="space-y-2">
                <Label>Template Name *</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Civil Suit Plaint Template"
                />
              </div>

              {/* Row 2: Category + type fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select value={formCategory} onValueChange={(v: any) => setFormCategory(v || "")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category…" />
                    </SelectTrigger>
                    <SelectContent>
                      {currentCategories.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {activeTab === "case" && (
                  <div className="space-y-2">
                    <Label>Document Type</Label>
                    <Input
                      value={formDocumentType}
                      onChange={(e) => setFormDocumentType(e.target.value)}
                      placeholder="e.g., PLAINT, VAKALATNAMA"
                    />
                  </div>
                )}

                {activeTab === "notice" && (
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Brief description"
                    />
                  </div>
                )}
              </div>

              {/* Row 3: Court type + description (case only) */}
              {activeTab === "case" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Court Type</Label>
                    <Select value={formCourtType} onValueChange={(v: any) => setFormCourtType(v || "")}>
                      <SelectTrigger>
                        <SelectValue placeholder="Any court…" />
                      </SelectTrigger>
                      <SelectContent>
                        {COURT_TYPES.map((ct) => (
                          <SelectItem key={ct} value={ct}>
                            {ct.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Brief description"
                    />
                  </div>
                </div>
              )}

              {/* Row 4: Content editor + variables panel */}
              <div className="space-y-2">
                <Label>
                  Template Content *{" "}
                  <span className="text-xs text-muted-foreground font-normal">
                    — use {"{{variableName}}"} for placeholders
                  </span>
                </Label>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <Textarea
                      value={formContent}
                      onChange={(e) => setFormContent(e.target.value)}
                      placeholder={`IN THE COURT OF {{courtName}}\n\n{{caseType}} No. {{caseNumber}} of {{year}}\n\n{{petitionerName}} …Petitioner\n  vs.\n{{respondentName}} …Respondent\n\nMost Respectfully Showeth:\n\n1. That the {{petitionerName}} is…`}
                      rows={16}
                      className="font-mono text-sm resize-none"
                    />
                  </div>
                  <div className="col-span-1">
                    <Card className="h-full">
                      <CardHeader className="py-3 px-4">
                        <CardTitle className="text-sm font-medium">
                          Extracted Variables
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        {extractedVariables.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            No variables detected. Use {"{{variableName}}"} syntax in your content.
                          </p>
                        ) : (
                          <div className="space-y-1.5">
                            {extractedVariables.map((v) => (
                              <div
                                key={v}
                                className="flex items-center gap-2 px-2 py-1.5 bg-yellow-50 dark:bg-yellow-900/20 rounded text-sm font-mono"
                              >
                                <span className="text-yellow-700 dark:text-yellow-300">
                                  {`{{${v}}}`}
                                </span>
                              </div>
                            ))}
                            <p className="text-xs text-muted-foreground mt-2">
                              {extractedVariables.length} variable{extractedVariables.length !== 1 ? "s" : ""} found
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>Saving…</>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {editingId ? "Update Template" : "Create Template"}
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="case">
            <FileText className="mr-2 h-4 w-4" />
            Case Templates
            {caseTemplates.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {caseTemplates.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="notice">
            <FileText className="mr-2 h-4 w-4" />
            Notice Templates
            {noticeTemplates.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {noticeTemplates.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Search / Filter Bar */}
        <div className="flex items-center gap-3 mt-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates…"
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={(v: any) => setCategoryFilter(v || "")}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All categories</SelectItem>
              {currentCategories.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {categoryFilter && categoryFilter !== "ALL" && (
            <Button variant="ghost" size="sm" onClick={() => setCategoryFilter("")}>
              Clear filter
            </Button>
          )}
        </div>

        {/* Case Templates Tab */}
        <TabsContent value="case" className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-3" />
              Loading templates…
            </div>
          ) : filteredCaseTemplates.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <FileText className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <h3 className="text-lg font-medium mb-1">No case templates found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {search || categoryFilter
                    ? "Try adjusting your search or filter criteria."
                    : "Create your first case template to get started."}
                </p>
                {!search && !categoryFilter && (
                  <Button onClick={openCreateDialog}>
                    <Plus className="mr-2 h-4 w-4" /> Create Template
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCaseTemplates.map(renderTemplateCard)}
            </div>
          )}
        </TabsContent>

        {/* Notice Templates Tab */}
        <TabsContent value="notice" className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-3" />
              Loading templates…
            </div>
          ) : filteredNoticeTemplates.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <FileText className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <h3 className="text-lg font-medium mb-1">No notice templates found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {search || categoryFilter
                    ? "Try adjusting your search or filter criteria."
                    : "Create your first notice template to get started."}
                </p>
                {!search && !categoryFilter && (
                  <Button onClick={openCreateDialog}>
                    <Plus className="mr-2 h-4 w-4" /> Create Template
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredNoticeTemplates.map(renderTemplateCard)}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              {previewTemplate?.name || "Template Preview"}
            </DialogTitle>
          </DialogHeader>
          {previewTemplate && (
            <div className="flex-1 overflow-y-auto space-y-4">
              {/* Meta info */}
              <div className="flex flex-wrap gap-2">
                {activeTab === "case" && (previewTemplate as CaseTemplate).category && (
                  <Badge variant="secondary">
                    {getCategoryLabel((previewTemplate as CaseTemplate).category, "case")}
                  </Badge>
                )}
                {activeTab === "notice" && (previewTemplate as NoticeTemplate).category && (
                  <Badge variant="secondary">
                    {getCategoryLabel((previewTemplate as NoticeTemplate).category!, "notice")}
                  </Badge>
                )}
                {activeTab === "case" && (previewTemplate as CaseTemplate).documentType && (
                  <Badge variant="outline">{(previewTemplate as CaseTemplate).documentType}</Badge>
                )}
                {activeTab === "case" && (previewTemplate as CaseTemplate).courtType && (
                  <Badge variant="outline">
                    {(previewTemplate as CaseTemplate).courtType!.replace(/_/g, " ")}
                  </Badge>
                )}
              </div>

              {previewTemplate.description && (
                <p className="text-sm text-muted-foreground">{previewTemplate.description}</p>
              )}

              {/* Variable list */}
              {(() => {
                const vars = extractVariables(previewTemplate.content);
                return vars.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground mr-1">Variables:</span>
                    {vars.map((v) => (
                      <Badge key={v} variant="outline" className="font-mono text-xs bg-yellow-50 dark:bg-yellow-900/20">
                        {`{{${v}}}`}
                      </Badge>
                    ))}
                  </div>
                ) : null;
              })()}

              {/* Content with highlighted variables */}
              <Card>
                <CardContent className="p-4">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {highlightVariables(previewTemplate.content)}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => previewTemplate && copyContent(previewTemplate.content)}>
              <Copy className="mr-2 h-4 w-4" /> Copy Content
            </Button>
            <Button
              onClick={() => {
                if (previewTemplate) {
                  setPreviewOpen(false);
                  openEditDialog(previewTemplate);
                }
              }}
            >
              <Edit className="mr-2 h-4 w-4" /> Edit Template
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
