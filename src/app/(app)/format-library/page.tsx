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
  DialogTrigger,
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
import { Plus, Search, FileText, Trash2, Eye, Upload, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { RoleGate } from "@/components/role-gate";

const CATEGORIES = [
  { value: "LEGAL_NOTICE", label: "Legal Notice" },
  { value: "BANK_SCRUTINY_REPORT", label: "Bank Scrutiny Report" },
  { value: "SUIT_FORMAT", label: "Suit Format" },
  { value: "FAMILY_COURT_PETITION", label: "Family Court Petition" },
  { value: "COUNTER_STATEMENT", label: "Counter Statement" },
  { value: "AFFIDAVIT", label: "Affidavit" },
  { value: "MACT_WRITTEN_STATEMENT", label: "MACT Written Statement" },
  { value: "INTERLOCUTORY_APPLICATION", label: "Interlocutory Application" },
  { value: "DLSA_PETITION", label: "DLSA Petition" },
  { value: "EXECUTION_PETITION", label: "Execution Petition" },
  { value: "COMMERCIAL_SUIT", label: "Commercial Suit" },
  { value: "OTHER", label: "Other" },
];

interface FormatSample {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  description: string | null;
  textContent: string;
  fileName: string;
  fileSize: number;
  isActive: boolean;
  createdAt: string;
}

export default function FormatLibraryPage() {
  const [samples, setSamples] = useState<FormatSample[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewSample, setPreviewSample] = useState<FormatSample | null>(null);
  const [uploading, setUploading] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload form state
  const [uploadName, setUploadName] = useState("");
  const [uploadCategory, setUploadCategory] = useState("");
  const [uploadCustomCategory, setUploadCustomCategory] = useState("");
  const [uploadSubcategory, setUploadSubcategory] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const fetchSamples = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoryFilter) params.set("category", categoryFilter);
      params.set("active", "false");
      const res = await fetch(`/api/format-library?${params}`);
      const text = await res.text();
      if (!text) {
        setSamples([]);
      } else {
        const data = JSON.parse(text);
        setSamples(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to fetch format samples:", err);
      setSamples([]);
    }
    setLoading(false);
  }, [categoryFilter]);

  useEffect(() => {
    fetchSamples();
  }, [fetchSamples]);

  const handleUpload = async () => {
    const finalCategory = uploadCategory === "OTHER" && uploadCustomCategory
      ? uploadCustomCategory.toUpperCase().replace(/\s+/g, "_")
      : uploadCategory;

    if (!uploadFile || !uploadName || !finalCategory) {
      toast.error("File, name, and category are required");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("name", uploadName);
    formData.append("category", finalCategory);
    if (uploadSubcategory) formData.append("subcategory", uploadSubcategory);
    if (uploadDescription) formData.append("description", uploadDescription);

    try {
      const res = await fetch("/api/format-library", { method: "POST", body: formData });
      if (res.ok) {
        toast.success("Format sample uploaded");
        setUploadOpen(false);
        resetUploadForm();
        fetchSamples();
      } else {
        // Safely parse error - Vercel may return HTML error pages
        let errorMsg = `Upload failed (${res.status})`;
        try {
          const text = await res.text();
          const err = JSON.parse(text);
          errorMsg = err.error || errorMsg;
        } catch {
          // Response was not JSON (e.g., Vercel HTML error page)
          if (res.status === 413) errorMsg = "File too large. Max ~4.5MB allowed.";
          else if (res.status === 504) errorMsg = "Upload timed out. Try a smaller file.";
        }
        toast.error(errorMsg);
      }
    } catch (e: any) {
      console.error("Upload error:", e);
      toast.error("Upload failed — network error");
    }
    setUploading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this format sample?")) return;
    const res = await fetch(`/api/format-library/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Deleted");
      fetchSamples();
    } else {
      toast.error("Delete failed");
    }
  };

  const handleReindex = async () => {
    setReindexing(true);
    try {
      const res = await fetch("/api/format-library/reindex", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Re-indexed ${data.indexed} formats (${data.details.reduce((s: number, d: any) => s + (d.chunks || 0), 0)} chunks)`);
      } else {
        toast.error("Re-index failed");
      }
    } catch {
      toast.error("Re-index failed");
    }
    setReindexing(false);
  };

  const resetUploadForm = () => {
    setUploadName("");
    setUploadCategory("");
    setUploadCustomCategory("");
    setUploadSubcategory("");
    setUploadDescription("");
    setUploadFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const filtered = samples.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.description || "").toLowerCase().includes(search.toLowerCase())
  );

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  };

  const getCategoryLabel = (value: string) =>
    CATEGORIES.find((c) => c.value === value)?.label || value;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Format Library</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload and manage document format samples for AI-powered drafting
          </p>
        </div>
        <RoleGate permission="settings:write">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleReindex}
              disabled={reindexing}
            >
              {reindexing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Re-indexing...</>
              ) : (
                <><RefreshCw className="mr-2 h-4 w-4" /> Re-index AI</>
              )}
            </Button>
          <Dialog
            open={uploadOpen}
            onOpenChange={(v) => {
              setUploadOpen(v);
              if (!v) resetUploadForm();
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Upload Format
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Upload Format Sample</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Document File (.doc / .docx / .pdf)</Label>
                  <div
                    className="relative flex items-center gap-3 rounded-md border border-input bg-background px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".doc,.docx,.pdf"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setUploadFile(file);
                          if (!uploadName) setUploadName(file.name.replace(/\.(docx?|DOC|pdf|PDF)$/, ""));
                        }
                      }}
                    />
                    <div className="inline-flex items-center rounded-md border bg-muted px-3 py-1 text-sm font-medium">
                      <Upload className="mr-1.5 h-3.5 w-3.5" /> Choose File
                    </div>
                    <span className="text-sm text-muted-foreground truncate">
                      {uploadFile ? uploadFile.name : "No file chosen"}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input
                    value={uploadName}
                    onChange={(e) => setUploadName(e.target.value)}
                    placeholder="e.g., Cheque Bounce Notice (S.138)"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category *</Label>
                    <Select value={uploadCategory} onValueChange={(v) => {
                      setUploadCategory(v || "");
                      if (v !== "OTHER") setUploadCustomCategory("");
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Subcategory</Label>
                    <Input
                      value={uploadSubcategory}
                      onChange={(e) => setUploadSubcategory(e.target.value)}
                      placeholder="e.g., Federal Bank"
                    />
                  </div>
                </div>
                {uploadCategory === "OTHER" && (
                  <div className="space-y-2">
                    <Label>Custom Category Name *</Label>
                    <Input
                      value={uploadCustomCategory}
                      onChange={(e) => setUploadCustomCategory(e.target.value)}
                      placeholder="e.g., Writ Petition, Bail Application"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    rows={2}
                    placeholder="When should this format be used?"
                  />
                </div>
                <Button onClick={handleUpload} disabled={uploading} className="w-full">
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" /> Upload
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </RoleGate>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search formats..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={(v: any) => setCategoryFilter(v === "all" ? "" : String(v || ""))}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-10 text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          {samples.length === 0 ? "No format samples uploaded yet. Upload your first format sample to get started." : "No formats match your search."}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((sample) => (
            <Card key={sample.id} className={`${!sample.isActive ? "opacity-50" : ""}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{sample.name}</CardTitle>
                    <div className="flex gap-1.5 flex-wrap">
                      <Badge variant="secondary">{getCategoryLabel(sample.category)}</Badge>
                      {sample.subcategory && (
                        <Badge variant="outline">{sample.subcategory}</Badge>
                      )}
                      {!sample.isActive && <Badge variant="destructive">Inactive</Badge>}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {sample.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{sample.description}</p>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FileText className="h-3 w-3" />
                  <span className="truncate">{sample.fileName}</span>
                  <span>({formatSize(sample.fileSize)})</span>
                </div>
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setPreviewSample(sample)}
                  >
                    <Eye className="mr-1.5 h-3.5 w-3.5" /> Preview
                  </Button>
                  <RoleGate permission="settings:write">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(sample.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </RoleGate>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewSample} onOpenChange={(v) => { if (!v) setPreviewSample(null); }}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{previewSample?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2 mb-3">
            <Badge variant="secondary">{previewSample && getCategoryLabel(previewSample.category)}</Badge>
            {previewSample?.subcategory && <Badge variant="outline">{previewSample.subcategory}</Badge>}
          </div>
          {previewSample?.description && (
            <p className="text-sm text-muted-foreground mb-3">{previewSample.description}</p>
          )}
          <div className="border rounded-md p-4 max-h-[55vh] overflow-y-auto bg-muted/30">
            <pre className="text-sm whitespace-pre-wrap font-mono">{previewSample?.textContent}</pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
