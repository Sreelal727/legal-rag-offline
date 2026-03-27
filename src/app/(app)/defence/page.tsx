"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Shield, Sparkles, Loader2, Copy, Download, Printer, FileText,
  AlertTriangle, Lightbulb, Scale, ChevronRight, Save,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const TASK_OPTIONS = [
  {
    value: "analyze",
    label: "Analyze Plaint & Strategy",
    description: "Identify weaknesses, defence grounds, and strategy",
    icon: "🔍",
    color: "bg-blue-50 border-blue-200",
  },
  {
    value: "suggest_grounds",
    label: "Suggest Defence Grounds",
    description: "Get specific legal grounds, sections & case laws",
    icon: "⚖️",
    color: "bg-purple-50 border-purple-200",
  },
  {
    value: "draft_ws",
    label: "Draft Written Statement",
    description: "Generate full Written Statement under Order VIII CPC",
    icon: "📄",
    color: "bg-green-50 border-green-200",
  },
  {
    value: "draft_counter",
    label: "Draft Counter Statement",
    description: "Generate Counter Statement / Counter for petitions",
    icon: "📝",
    color: "bg-orange-50 border-orange-200",
  },
];

interface SavedDoc {
  id: string;
  documentType: string;
  title: string;
  content: string;
  status: string;
  createdAt: string;
  case: { caseNumber: string } | null;
}

export default function DefencePage() {
  const [cases, setCases] = useState<any[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [selectedTask, setSelectedTask] = useState("analyze");
  const [plaintContent, setPlaintContent] = useState("");
  const [additionalFacts, setAdditionalFacts] = useState("");
  const [defencePoints, setDefencePoints] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState("");
  const [savedDocId, setSavedDocId] = useState("");
  const [savedDocs, setSavedDocs] = useState<SavedDoc[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editDoc, setEditDoc] = useState<SavedDoc | null>(null);
  const [editContent, setEditContent] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/cases?limit=200").then((r) => r.json()).then((d) => setCases(d.cases || [])),
      fetchSavedDocs(),
    ]).then(() => setLoading(false));
  }, []);

  const fetchSavedDocs = async () => {
    const res = await fetch("/api/case-documents");
    if (res.ok) {
      const data = await res.json();
      const docs = (data.documents || []).filter((d: any) =>
        ["WRITTEN_STATEMENT", "COUNTER_STATEMENT", "COUNTER_CLAIM", "OBJECTION"].includes(d.documentType)
      );
      setSavedDocs(docs);
    }
  };

  const handleGenerate = async () => {
    if (!plaintContent && selectedTask !== "suggest_grounds") {
      toast.error("Please provide the plaint/complaint content or facts");
      return;
    }

    setGenerating(true);
    setResult("");
    setSavedDocId("");

    try {
      const res = await fetch("/api/defence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: selectedCaseId || undefined,
          task: selectedTask,
          plaintContent,
          additionalFacts,
          existingDefencePoints: defencePoints,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setResult(data.content);
        if (data.savedDocId) {
          setSavedDocId(data.savedDocId);
          toast.success("Document auto-saved to case files");
          fetchSavedDocs();
        } else {
          toast.success("Analysis complete");
        }
      } else {
        toast.error(data.error || "AI generation failed");
      }
    } catch {
      toast.error("Connection failed");
    }

    setGenerating(false);
  };

  const handleSaveResult = async () => {
    if (!result || !selectedCaseId) {
      toast.error("Select a case to save this document");
      return;
    }

    const docTypeMap: Record<string, string> = {
      draft_ws: "WRITTEN_STATEMENT",
      draft_counter: "COUNTER_STATEMENT",
      analyze: "WRITTEN_STATEMENT",
      suggest_grounds: "WRITTEN_STATEMENT",
    };

    const res = await fetch("/api/case-documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caseId: selectedCaseId,
        documentType: docTypeMap[selectedTask] || "WRITTEN_STATEMENT",
        title: `AI Defence - ${TASK_OPTIONS.find((t) => t.value === selectedTask)?.label || selectedTask}`,
        content: result,
        status: "DRAFT",
      }),
    });

    if (res.ok) {
      toast.success("Saved to case documents");
      fetchSavedDocs();
    } else {
      toast.error("Save failed");
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    toast.success("Copied to clipboard");
  };

  const handlePrint = (content: string, title: string) => {
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(`<html><head><title>${title}</title>
        <style>body{font-family:'Times New Roman',serif;margin:2cm;line-height:1.6;}
        pre{white-space:pre-wrap;font-family:inherit;}@media print{.no-print{display:none;}}</style></head>
        <body><button class="no-print" onclick="window.print()" style="padding:8px;margin-bottom:1cm;cursor:pointer;">Print</button>
        <pre>${content}</pre></body></html>`);
      w.document.close();
    }
  };

  const handleSaveEdit = async () => {
    if (!editDoc) return;
    const res = await fetch(`/api/case-documents/${editDoc.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editContent }),
    });
    if (res.ok) {
      toast.success("Saved");
      setEditOpen(false);
      fetchSavedDocs();
    } else {
      toast.error("Save failed");
    }
  };

  const selectedTaskInfo = TASK_OPTIONS.find((t) => t.value === selectedTask);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" /> AI Defence Module
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            AI-powered defence drafting: Written Statement, Counter Statement, Legal Strategy
          </p>
        </div>
      </div>

      <Tabs defaultValue="draft">
        <TabsList>
          <TabsTrigger value="draft">Draft & Analyze</TabsTrigger>
          <TabsTrigger value="saved">Saved Drafts ({savedDocs.length})</TabsTrigger>
        </TabsList>

        {/* Draft Tab */}
        <TabsContent value="draft">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Input Panel */}
            <div className="space-y-5">
              {/* Task Selection */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Select Task</Label>
                <div className="grid grid-cols-2 gap-2">
                  {TASK_OPTIONS.map((task) => (
                    <button
                      key={task.value}
                      onClick={() => setSelectedTask(task.value)}
                      className={`p-3 border-2 rounded-lg text-left transition-all ${
                        selectedTask === task.value
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="text-lg mb-1">{task.icon}</div>
                      <p className="font-medium text-sm">{task.label}</p>
                      <p className="text-xs text-muted-foreground">{task.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Case Selection */}
              <div>
                <Label>Link to Case (Optional)</Label>
                <Select value={selectedCaseId} onValueChange={(v: any) => setSelectedCaseId(v === "none" ? "" : String(v || ""))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select case (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No case link</SelectItem>
                    {cases.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.caseNumber} — {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  When linked, AI uses case details (parties, court, type)
                </p>
              </div>

              {/* Plaint Content */}
              <div>
                <Label className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  Plaint / Complaint / Petition Content
                </Label>
                <Textarea
                  value={plaintContent}
                  onChange={(e) => setPlaintContent(e.target.value)}
                  rows={8}
                  placeholder="Paste the plaint/complaint content here, or summarize the plaintiff's claims..."
                  className="font-mono text-sm"
                />
              </div>

              {/* Additional Facts */}
              <div>
                <Label className="flex items-center gap-1">
                  <Lightbulb className="h-4 w-4" />
                  {selectedTask === "analyze" ? "Additional Context" : "Defendant's Version of Facts"}
                </Label>
                <Textarea
                  value={additionalFacts}
                  onChange={(e) => setAdditionalFacts(e.target.value)}
                  rows={4}
                  placeholder="Enter your client's version of events, key facts to defend..."
                />
              </div>

              {/* Defence Points (for drafting) */}
              {(selectedTask === "draft_ws" || selectedTask === "draft_counter") && (
                <div>
                  <Label className="flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    Specific Defence Points to Include
                  </Label>
                  <Textarea
                    value={defencePoints}
                    onChange={(e) => setDefencePoints(e.target.value)}
                    rows={4}
                    placeholder="List specific grounds, arguments, or facts to incorporate in the draft..."
                  />
                </div>
              )}

              <Button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full"
                size="lg"
              >
                {generating ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating with AI...</>
                ) : (
                  <><Sparkles className="mr-2 h-5 w-5" /> {selectedTaskInfo?.label}</>
                )}
              </Button>

              {generating && (
                <div className="text-sm text-muted-foreground text-center">
                  AI is analyzing the plaint and generating response. This may take 20-60 seconds...
                </div>
              )}
            </div>

            {/* Right: Result Panel */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Scale className="h-5 w-5" />
                  {result ? selectedTaskInfo?.label : "Result will appear here"}
                </Label>
                {result && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={handleCopy} title="Copy">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handlePrint(result, selectedTaskInfo?.label || "Defence")} title="Print">
                      <Printer className="h-4 w-4" />
                    </Button>
                    {selectedCaseId && (
                      <Button variant="ghost" size="icon" onClick={handleSaveResult} title="Save to case">
                        <Save className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {result ? (
                <div className="space-y-3">
                  <Textarea
                    value={result}
                    onChange={(e) => setResult(e.target.value)}
                    rows={32}
                    className="font-mono text-sm"
                  />
                  {savedDocId && (
                    <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded">
                      <FileText className="h-4 w-4" />
                      Auto-saved to case documents
                    </div>
                  )}
                  {selectedCaseId && !savedDocId && (
                    <Button onClick={handleSaveResult} variant="outline" className="w-full">
                      <Save className="mr-2 h-4 w-4" /> Save to Case Documents
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg text-muted-foreground">
                  <div className="text-center space-y-2">
                    <Shield className="h-12 w-12 mx-auto opacity-30" />
                    <p className="text-sm">Configure your task on the left and click Generate</p>
                    <p className="text-xs">AI will analyze the plaint and generate defence content</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Saved Drafts Tab */}
        <TabsContent value="saved">
          {savedDocs.length === 0 ? (
            <p className="text-center py-10 text-muted-foreground">No defence drafts saved yet</p>
          ) : (
            <div className="space-y-3">
              {savedDocs.map((doc) => (
                <Card key={doc.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{doc.title}</span>
                          <Badge variant={doc.status === "FINALIZED" ? "default" : "secondary"}>
                            {doc.status}
                          </Badge>
                          <Badge variant="outline">
                            {doc.documentType.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground flex gap-3">
                          {doc.case && <span>Case: {doc.case.caseNumber}</span>}
                          <span>{format(new Date(doc.createdAt), "dd MMM yyyy")}</span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => {
                            setEditDoc(doc);
                            setEditContent(doc.content);
                            setEditOpen(true);
                          }}
                        >
                          Edit & Print
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

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
            <Button onClick={handleSaveEdit} className="flex-1">Save</Button>
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(editContent);
                toast.success("Copied");
              }}
            >
              <Copy className="mr-2 h-4 w-4" /> Copy
            </Button>
            <Button
              variant="outline"
              onClick={() => editDoc && handlePrint(editContent, editDoc.title)}
            >
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
