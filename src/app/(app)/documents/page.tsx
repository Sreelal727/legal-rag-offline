"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Upload, Search, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { RoleGate } from "@/components/role-gate";
import { format } from "date-fns";

interface Doc {
  id: string;
  title: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  isProcessed: boolean;
  createdAt: string;
  case: { id: string; caseNumber: string; title: string } | null;
  _count: { chunks: number };
}

interface SearchResult {
  content: string;
  metadata: Record<string, string>;
  distance: number;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [semanticQuery, setSemanticQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/documents?search=${encodeURIComponent(search)}`);
    const data = await res.json();
    setDocuments(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [search]);

  const fetchCases = useCallback(async () => {
    const res = await fetch("/api/cases?limit=100");
    const data = await res.json();
    setCases(data.cases || []);
  }, []);

  useEffect(() => {
    fetchDocuments();
    fetchCases();
  }, [fetchDocuments, fetchCases]);

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const res = await fetch("/api/documents", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      toast.success("Document uploaded");
      setOpen(false);
      fetchDocuments();
    } else {
      toast.error("Upload failed");
    }
  };

  const handleProcess = async (id: string) => {
    setProcessing(id);
    try {
      const res = await fetch(`/api/documents/${id}/process`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Processed: ${data.chunks} chunks created`);
        fetchDocuments();
      } else {
        const err = await res.json();
        toast.error(err.error || "Processing failed");
      }
    } catch {
      toast.error("Processing failed");
    }
    setProcessing(null);
  };

  const handleSemanticSearch = async () => {
    if (!semanticQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: semanticQuery, limit: 10 }),
      });
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Search failed");
    }
    setSearching(false);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Documents</h1>
        <RoleGate permission="documents:upload">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Upload className="mr-2 h-4 w-4" /> Upload</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
              <form onSubmit={handleUpload} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input id="title" name="title" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="file">File *</Label>
                  <Input id="file" name="file" type="file" accept=".pdf,.docx,.txt" required />
                </div>
                <div className="space-y-2">
                  <Label>Link to Case (optional)</Label>
                  <Select name="caseId">
                    <SelectTrigger><SelectValue placeholder="No case" /></SelectTrigger>
                    <SelectContent>
                      {cases.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.caseNumber}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full">Upload</Button>
              </form>
            </DialogContent>
          </Dialog>
        </RoleGate>
      </div>

      {/* Semantic Search */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Search className="h-4 w-4" /> AI Document Search</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Ask a question about your documents..."
              value={semanticQuery}
              onChange={(e) => setSemanticQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSemanticSearch()}
            />
            <Button onClick={handleSemanticSearch} disabled={searching}>
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
            </Button>
          </div>
          {searchResults.length > 0 && (
            <div className="mt-4 space-y-3">
              <h3 className="text-sm font-medium">Results:</h3>
              {searchResults.map((result, i) => (
                <div key={i} className="p-3 border rounded-md">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline">{result.metadata.documentTitle || "Unknown"}</Badge>
                    <span className="text-xs text-muted-foreground">
                      Relevance: {((1 - result.distance) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-sm">{result.content.substring(0, 300)}...</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document List */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Filter documents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="text-center py-10 text-muted-foreground">Loading...</div>
      ) : documents.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">No documents found</div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <Card key={doc.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{doc.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{doc.fileName}</span>
                        <span>{formatSize(doc.fileSize)}</span>
                        <span>{format(new Date(doc.createdAt), "dd MMM yyyy")}</span>
                        {doc.case && <Badge variant="outline">{doc.case.caseNumber}</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {doc.isProcessed ? (
                      <Badge>Processed ({doc._count.chunks} chunks)</Badge>
                    ) : (
                      <RoleGate permission="documents:upload">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleProcess(doc.id)}
                          disabled={processing === doc.id}
                        >
                          {processing === doc.id ? (
                            <><Loader2 className="mr-1 h-3 w-3 animate-spin" /> Processing...</>
                          ) : (
                            "Process"
                          )}
                        </Button>
                      </RoleGate>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
