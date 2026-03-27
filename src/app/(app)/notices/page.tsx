"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, FileSignature, Loader2, Sparkles, Eye, CheckCircle, XCircle, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { RoleGate } from "@/components/role-gate";
import { format } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "secondary",
  PENDING_APPROVAL: "outline",
  APPROVED: "default",
  SENT: "default",
  REJECTED: "destructive",
};

interface NoticeItem {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  template: { name: string; category: string } | null;
  case: { id: string; caseNumber: string } | null;
  client: { id: string; name: string } | null;
  drafter: { id: string; name: string };
}

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  content: string;
  variables: string;
}

interface FormatSample {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
}

export default function NoticesPage() {
  const router = useRouter();
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [formatSamples, setFormatSamples] = useState<FormatSample[]>([]);
  const [selectedFormatId, setSelectedFormatId] = useState("");
  const [clients, setClients] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [draftContent, setDraftContent] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftCaseId, setDraftCaseId] = useState("");
  const [draftClientId, setDraftClientId] = useState("");
  const [draftNoticeType, setDraftNoticeType] = useState("");
  const [generating, setGenerating] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<any>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [approveComment, setApproveComment] = useState("");

  const fetchNotices = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/notices");
    const data = await res.json();
    setNotices(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNotices();
    fetch("/api/notices/templates").then((r) => r.json()).then((d) => setTemplates(Array.isArray(d) ? d : []));
    fetch("/api/format-library").then((r) => r.text()).then((t) => { try { const d = JSON.parse(t); setFormatSamples(Array.isArray(d) ? d : []); } catch { setFormatSamples([]); } });
    fetch("/api/clients?limit=100").then((r) => r.json()).then((d) => setClients(d.clients || []));
    fetch("/api/cases?limit=100").then((r) => r.json()).then((d) => setCases(d.cases || []));
  }, [fetchNotices]);

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setSelectedTemplate(template);
      setDraftContent(template.content);
      setDraftTitle(template.name);
    }
  };

  const handleGenerate = async () => {
    if (!selectedTemplate && !selectedFormatId) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/notices/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateContent: selectedTemplate?.content || "",
          variables: {},
          instructions: "Please complete this notice with appropriate legal language.",
          formatSampleId: selectedFormatId || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setDraftContent(data.content);
        toast.success("Notice generated with AI");
      } else {
        toast.error(data.error || "Generation failed");
      }
    } catch {
      toast.error("Generation failed");
    }
    setGenerating(false);
  };

  const handleCreate = async () => {
    if (!draftTitle || !draftContent) {
      toast.error("Title and content are required");
      return;
    }

    const res = await fetch("/api/notices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: draftTitle,
        content: draftContent,
        templateId: selectedTemplate?.id,
        caseId: draftCaseId || undefined,
        clientId: draftClientId || undefined,
        noticeType: draftNoticeType || undefined,
      }),
    });

    if (res.ok) {
      toast.success("Notice created");
      setOpen(false);
      setSelectedTemplate(null);
      setSelectedFormatId("");
      setDraftContent("");
      setDraftTitle("");
      setDraftCaseId("");
      setDraftClientId("");
      setDraftNoticeType("");
      fetchNotices();
    } else {
      toast.error("Failed to create notice");
    }
  };

  const handleViewNotice = (id: string) => {
    router.push(`/notices/${id}`);
  };

  const handleApproval = async (action: string) => {
    if (!selectedNotice) return;
    const res = await fetch(`/api/notices/${selectedNotice.id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, comments: approveComment }),
    });
    if (res.ok) {
      toast.success(`Notice ${action.toLowerCase()}`);
      setViewOpen(false);
      setApproveComment("");
      fetchNotices();
    } else {
      toast.error("Action failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Legal Notices</h1>
        <RoleGate permission="notices:draft">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Draft Notice</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Draft Legal Notice</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Template</Label>
                  <Select onValueChange={(v: any) => v && handleTemplateSelect(String(v))}>
                    <SelectTrigger><SelectValue placeholder="Choose a template" /></SelectTrigger>
                    <SelectContent>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} ({t.category})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {formatSamples.length > 0 && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5" /> Format Sample (Style Reference)
                    </Label>
                    <Select value={selectedFormatId} onValueChange={(v: any) => setSelectedFormatId(v === "none" ? "" : String(v || ""))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a format sample for AI to follow..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No format reference</SelectItem>
                        {formatSamples.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.name} ({f.category.replace(/_/g, " ")})
                            {f.subcategory ? ` — ${f.subcategory}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      AI will follow the exact structure and style of the selected format sample
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>Notice Type</Label>
                    <Select value={draftNoticeType} onValueChange={(v: any) => setDraftNoticeType(v === "none" ? "" : String(v || ""))}>
                      <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not specified</SelectItem>
                        <SelectItem value="LEGAL_NOTICE">Legal Notice</SelectItem>
                        <SelectItem value="DEMAND_NOTICE">Demand Notice</SelectItem>
                        <SelectItem value="EVICTION_NOTICE">Eviction Notice</SelectItem>
                        <SelectItem value="RECOVERY_NOTICE">Recovery Notice</SelectItem>
                        <SelectItem value="GENERAL">General</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Link to Case</Label>
                    <Select value={draftCaseId} onValueChange={(v: any) => setDraftCaseId(v === "none" ? "" : String(v || ""))}>
                      <SelectTrigger><SelectValue placeholder="Select case" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {cases.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>{c.caseNumber} - {c.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Link to Client</Label>
                    <Select value={draftClientId} onValueChange={(v: any) => setDraftClientId(v === "none" ? "" : String(v || ""))}>
                      <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {clients.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="draftTitle">Title</Label>
                  <Input
                    id="draftTitle"
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Content</Label>
                    {(selectedTemplate || selectedFormatId) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleGenerate}
                        disabled={generating}
                      >
                        {generating ? (
                          <><Loader2 className="mr-1 h-3 w-3 animate-spin" /> Generating...</>
                        ) : (
                          <><Sparkles className="mr-1 h-3 w-3" /> AI Polish</>
                        )}
                      </Button>
                    )}
                  </div>
                  <Textarea
                    value={draftContent}
                    onChange={(e) => setDraftContent(e.target.value)}
                    rows={15}
                    className="font-mono text-sm"
                  />
                </div>
                <Button onClick={handleCreate} className="w-full">Save Draft</Button>
              </div>
            </DialogContent>
          </Dialog>
        </RoleGate>
      </div>

      {/* View/Approve Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedNotice?.title}</DialogTitle>
          </DialogHeader>
          {selectedNotice && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant={statusColors[selectedNotice.status]}>{selectedNotice.status}</Badge>
                <span className="text-sm text-muted-foreground">
                  Drafted by {selectedNotice.drafter?.name}
                </span>
              </div>
              <div className="border rounded p-4 whitespace-pre-wrap font-mono text-sm bg-muted/30">
                {selectedNotice.content}
              </div>
              {selectedNotice.approvals?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Approval History</h4>
                  {selectedNotice.approvals.map((a: any) => (
                    <div key={a.id} className="flex items-center gap-2 text-sm p-2 border rounded mb-1">
                      <Badge variant={a.action === "APPROVED" ? "default" : "destructive"}>{a.action}</Badge>
                      <span>{a.user.name}</span>
                      {a.comments && <span className="text-muted-foreground">- {a.comments}</span>}
                    </div>
                  ))}
                </div>
              )}
              <RoleGate permission="notices:approve">
                {selectedNotice.status === "PENDING_APPROVAL" && (
                  <div className="space-y-3 border-t pt-3">
                    <Label>Comments</Label>
                    <Textarea
                      value={approveComment}
                      onChange={(e) => setApproveComment(e.target.value)}
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button onClick={() => handleApproval("APPROVED")} className="flex-1">
                        <CheckCircle className="mr-1 h-4 w-4" /> Approve
                      </Button>
                      <Button onClick={() => handleApproval("REVISION_REQUESTED")} variant="outline" className="flex-1">
                        Request Revision
                      </Button>
                      <Button onClick={() => handleApproval("REJECTED")} variant="destructive" className="flex-1">
                        <XCircle className="mr-1 h-4 w-4" /> Reject
                      </Button>
                    </div>
                  </div>
                )}
              </RoleGate>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="text-center py-10 text-muted-foreground">Loading...</div>
      ) : (
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="DRAFT">Drafts</TabsTrigger>
            <TabsTrigger value="PENDING_APPROVAL">Pending</TabsTrigger>
            <TabsTrigger value="APPROVED">Approved</TabsTrigger>
          </TabsList>
          {["all", "DRAFT", "PENDING_APPROVAL", "APPROVED"].map((tab) => (
            <TabsContent key={tab} value={tab}>
              <div className="space-y-3">
                {notices
                  .filter((n) => tab === "all" || n.status === tab)
                  .map((notice) => (
                    <Card
                      key={notice.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleViewNotice(notice.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <FileSignature className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{notice.title}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {notice.template && <Badge variant="outline">{notice.template.name}</Badge>}
                              {notice.client && <span>Client: {notice.client.name}</span>}
                              {notice.case && <span>Case: {notice.case.caseNumber}</span>}
                              <span>by {notice.drafter.name}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant={statusColors[notice.status]}>{notice.status.replace(/_/g, " ")}</Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(notice.createdAt), "dd MMM yyyy")}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                {notices.filter((n) => tab === "all" || n.status === tab).length === 0 && (
                  <p className="text-center py-10 text-muted-foreground">No notices found</p>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
