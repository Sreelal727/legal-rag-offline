"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageSquare, Plus, FileText, Loader2, Bot, User, Download } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface DocumentItem {
  id: string;
  title: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
  case?: { caseNumber: string; title: string } | null;
}

interface Message {
  id: string;
  role: string;
  content: string;
  sources?: string;
  formatSampleId?: string;
  documents?: DocumentItem[];
  createdAt: string;
}

interface ChatSessionItem {
  id: string;
  title: string;
  updatedAt: string;
  _count: { messages: number };
}

export default function ChatPage() {
  const [sessions, setSessions] = useState<ChatSessionItem[]>([]);
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchSessions = useCallback(async () => {
    const res = await fetch("/api/chat/sessions");
    const data = await res.json();
    setSessions(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const loadSession = async (id: string) => {
    setCurrentSession(id);
    const res = await fetch(`/api/chat/sessions/${id}`);
    const data = await res.json();
    setMessages(data.messages || []);
  };

  const startNewChat = () => {
    setCurrentSession(null);
    setMessages([]);
  };

  const handleSend = async () => {
    if (!input.trim() || sending) return;

    const userMessage = input;
    setInput("");
    setSending(true);

    // Optimistic update
    setMessages((prev) => [
      ...prev,
      { id: `temp-${Date.now()}`, role: "USER", content: userMessage, createdAt: new Date().toISOString() },
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          sessionId: currentSession,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        if (!currentSession) {
          setCurrentSession(data.sessionId);
          fetchSessions();
        }
        setMessages((prev) => [
          ...prev.filter((m) => !m.id.startsWith("temp-")),
          { id: `user-${Date.now()}`, role: "USER", content: userMessage, createdAt: new Date().toISOString() },
          {
            id: `assistant-${Date.now()}`,
            role: "ASSISTANT",
            content: data.message,
            sources: data.sources ? JSON.stringify(data.sources) : undefined,
            formatSampleId: data.formatSampleId || undefined,
            documents: data.documents || undefined,
            createdAt: new Date().toISOString(),
          },
        ]);
        if (data.actionResult?.success) {
          toast.success(data.actionResult.message);
        } else if (data.actionResult && !data.actionResult.success) {
          toast.error(data.actionResult.message);
        }
      } else {
        toast.error(data.error || "Failed to get response");
        setMessages((prev) => prev.filter((m) => !m.id.startsWith("temp-")));
      }
    } catch {
      toast.error("Failed to send message");
      setMessages((prev) => prev.filter((m) => !m.id.startsWith("temp-")));
    }

    setSending(false);
  };

  const handleExport = async (content: string, format: "docx" | "pdf", formatSampleId?: string) => {
    try {
      const res = await fetch("/api/chat/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, format, formatSampleId }),
      });

      if (!res.ok) {
        toast.error("Export failed");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `legal-document.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Export failed");
    }
  };

  const handleDocDownload = async (docId: string, fileName: string) => {
    try {
      const res = await fetch(`/api/documents/${docId}/download`);
      if (!res.ok) {
        toast.error("Download failed");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Download failed");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes("pdf")) return "PDF";
    if (fileType.includes("word") || fileType.includes("docx")) return "DOCX";
    if (fileType.includes("text")) return "TXT";
    return "FILE";
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex h-[calc(100vh-5rem)] gap-4">
      {/* Sessions sidebar */}
      <div className="w-64 border rounded-lg flex flex-col">
        <div className="p-3 border-b">
          <Button onClick={startNewChat} className="w-full" size="sm">
            <Plus className="mr-2 h-4 w-4" /> New Chat
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => loadSession(s.id)}
                className={`w-full text-left p-2 rounded text-sm hover:bg-muted transition-colors ${
                  currentSession === s.id ? "bg-muted" : ""
                }`}
              >
                <p className="font-medium truncate">{s.title}</p>
                <p className="text-xs text-muted-foreground">
                  {s._count.messages} messages
                </p>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Chat area */}
      <div className="flex-1 border rounded-lg flex flex-col">
        <div className="p-3 border-b flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          <h2 className="font-semibold">AI Legal Assistant</h2>
          <span className="text-xs text-muted-foreground">Powered by Qwen + RAG</span>
        </div>

        <ScrollArea className="flex-1 p-4">
          {messages.length === 0 ? (
            <div className="text-center py-20">
              <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">AI Legal Assistant</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Ask questions about your uploaded legal documents. The AI will search through your
                documents and provide answers with citations.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.role === "USER" ? "justify-end" : ""}`}
                >
                  {msg.role !== "USER" && (
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      msg.role === "USER"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    {msg.role === "USER" ? (
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <div className="text-sm prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    )}
                    {msg.role === "ASSISTANT" && msg.content.length > 300 && (
                      <div className="mt-2 pt-2 border-t border-border/50 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Export:</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExport(msg.content, "docx", msg.formatSampleId);
                          }}
                        >
                          <Download className="mr-1 h-3 w-3" /> DOCX
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExport(msg.content, "pdf", msg.formatSampleId);
                          }}
                        >
                          <Download className="mr-1 h-3 w-3" /> PDF
                        </Button>
                        {msg.formatSampleId && (
                          <Badge variant="outline" className="text-[10px] h-5">
                            Format applied
                          </Badge>
                        )}
                      </div>
                    )}
                    {msg.documents && msg.documents.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border/50">
                        <p className="text-xs font-medium mb-2">Documents available for download:</p>
                        <div className="space-y-1.5">
                          {msg.documents.map((doc) => (
                            <div
                              key={doc.id}
                              className="flex items-center justify-between gap-2 p-2 rounded-md bg-background border text-xs"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="flex-shrink-0 w-9 h-9 rounded bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                                  {getFileIcon(doc.fileType)}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium truncate">{doc.title}</p>
                                  <p className="text-muted-foreground truncate">
                                    {doc.fileName} &middot; {formatFileSize(doc.fileSize)}
                                    {doc.case && ` · ${doc.case.caseNumber}`}
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs flex-shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDocDownload(doc.id, doc.fileName);
                                }}
                              >
                                <Download className="mr-1 h-3 w-3" /> Download
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {msg.sources && (
                      <div className="mt-2 pt-2 border-t border-border/50">
                        <p className="text-xs font-medium mb-1">Sources:</p>
                        {JSON.parse(msg.sources).map((s: any, i: number) => (
                          <div key={i} className="flex items-center gap-1 text-xs opacity-80">
                            <FileText className="h-3 w-3" />
                            <span>{s.document}</span>
                            <Badge variant="outline" className="text-[10px] h-4">
                              {s.relevance}%
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {msg.role === "USER" && (
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        <div className="p-3 border-t">
          <div className="flex gap-2">
            <Input
              placeholder="Ask about your legal documents..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              disabled={sending}
            />
            <Button onClick={handleSend} disabled={sending || !input.trim()}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
