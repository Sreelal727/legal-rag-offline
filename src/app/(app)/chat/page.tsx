"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageSquare, Plus, FileText, Loader2, Bot, User } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Message {
  id: string;
  role: string;
  content: string;
  sources?: string;
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
            createdAt: new Date().toISOString(),
          },
        ]);
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
          <span className="text-xs text-muted-foreground">Powered by DeepSeek + RAG</span>
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
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
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
