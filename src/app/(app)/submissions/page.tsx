"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Plus,
  GripVertical,
  Calendar,
  User,
  Briefcase,
  Trash2,
  ArrowRight,
  ArrowLeft,
  FileCheck,
} from "lucide-react";
import { toast } from "sonner";
import { RoleGate } from "@/components/role-gate";
import { format } from "date-fns";

const COLUMNS = [
  { id: "TODO", label: "To Do", color: "bg-slate-100 border-slate-300" },
  { id: "IN_PROGRESS", label: "In Progress", color: "bg-blue-50 border-blue-300" },
  { id: "REVIEW", label: "Under Review", color: "bg-amber-50 border-amber-300" },
  { id: "SUBMITTED", label: "Submitted", color: "bg-green-50 border-green-300" },
];

const DOC_TYPES = [
  "PLEADING",
  "AFFIDAVIT",
  "APPLICATION",
  "WRITTEN_STATEMENT",
  "EVIDENCE",
  "PETITION",
  "MEMO",
  "VAKALATNAMA",
  "COURT_FEE",
  "CERTIFIED_COPY",
  "OTHER",
];

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

const priorityColors: Record<string, string> = {
  LOW: "bg-gray-200 text-gray-800",
  MEDIUM: "bg-blue-200 text-blue-800",
  HIGH: "bg-orange-200 text-orange-800",
  URGENT: "bg-red-200 text-red-800",
};

interface Submission {
  id: string;
  title: string;
  description: string | null;
  documentType: string;
  status: string;
  priority: string;
  dueDate: string | null;
  courtName: string | null;
  remarks: string | null;
  sortOrder: number;
  case: { id: string; caseNumber: string; title: string } | null;
  client: { id: string; name: string } | null;
  assignee: { id: string; name: string; role: string } | null;
  creator: { id: string; name: string };
}

interface ClientOption {
  id: string;
  name: string;
  role: string; // role in the case (PETITIONER, RESPONDENT, etc.)
}

interface CaseOption {
  id: string;
  caseNumber: string;
  title: string;
  courtName: string | null;
  clients: ClientOption[];
}

interface UserOption {
  id: string;
  name: string;
  role: string;
}

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [cases, setCases] = useState<CaseOption[]>([]);
  const [allClients, setAllClients] = useState<{ id: string; name: string }[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dragItem, setDragItem] = useState<string | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [autoCourtName, setAutoCourtName] = useState<string>("");

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/document-submissions");
    const data = await res.json();
    setSubmissions(data.submissions || []);
    setLoading(false);
  }, []);

  const fetchCasesAndUsers = useCallback(async () => {
    const [casesRes, usersRes, clientsRes] = await Promise.all([
      fetch("/api/cases?limit=100"),
      fetch("/api/users"),
      fetch("/api/clients?limit=100"),
    ]);
    const casesData = await casesRes.json();
    const usersData = await usersRes.json();
    const clientsData = await clientsRes.json();
    setCases(
      (casesData.cases || []).map((c: any) => ({
        id: c.id,
        caseNumber: c.caseNumber,
        title: c.title,
        courtName: c.courtName || null,
        clients: (c.caseClients || []).map((cc: any) => ({
          id: cc.client.id,
          name: cc.client.name,
          role: cc.role,
        })),
      }))
    );
    setAllClients(
      (clientsData.clients || []).map((c: any) => ({
        id: c.id,
        name: c.name,
      }))
    );
    setUsers(
      (usersData.users || usersData || []).map((u: any) => ({
        id: u.id,
        name: u.name,
        role: u.role,
      }))
    );
  }, []);

  useEffect(() => {
    fetchSubmissions();
    fetchCasesAndUsers();
  }, [fetchSubmissions, fetchCasesAndUsers]);

  // When case changes, auto-fill client and court
  const handleCaseChange = (caseId: string) => {
    setSelectedCaseId(caseId);
    const selectedCase = cases.find((c) => c.id === caseId);
    if (selectedCase) {
      // Auto-fill court name
      if (selectedCase.courtName) setAutoCourtName(selectedCase.courtName);
      // Auto-select first client of the case
      if (selectedCase.clients.length > 0) {
        setSelectedClientId(selectedCase.clients[0].id);
      } else {
        setSelectedClientId("");
      }
    } else {
      setAutoCourtName("");
      setSelectedClientId("");
    }
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const body: Record<string, any> = Object.fromEntries(formData.entries());

    // Add select-based fields that aren't in native form data
    if (selectedCaseId) body.caseId = selectedCaseId;
    if (selectedClientId) body.clientId = selectedClientId;

    const res = await fetch("/api/document-submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      toast.success("Document submission created");
      setOpen(false);
      setSelectedCaseId("");
      setSelectedClientId("");
      setAutoCourtName("");
      fetchSubmissions();
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to create");
    }
  };

  const moveCard = async (id: string, newStatus: string) => {
    // Optimistic update
    setSubmissions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: newStatus } : s))
    );

    const res = await fetch("/api/document-submissions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: newStatus }),
    });

    if (!res.ok) {
      toast.error("Failed to update status");
      fetchSubmissions();
    }
  };

  const deleteCard = async (id: string) => {
    const res = await fetch("/api/document-submissions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (res.ok) {
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
      toast.success("Deleted");
    } else {
      toast.error("Failed to delete");
    }
  };

  const getColumnItems = (status: string) =>
    submissions.filter((s) => s.status === status);

  const getNextStatus = (current: string) => {
    const idx = COLUMNS.findIndex((c) => c.id === current);
    return idx < COLUMNS.length - 1 ? COLUMNS[idx + 1].id : null;
  };

  const getPrevStatus = (current: string) => {
    const idx = COLUMNS.findIndex((c) => c.id === current);
    return idx > 0 ? COLUMNS[idx - 1].id : null;
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDragItem(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    if (dragItem) {
      moveCard(dragItem, status);
      setDragItem(null);
    }
  };

  const isDueSoon = (dueDate: string | null) => {
    if (!dueDate) return false;
    const days = Math.ceil(
      (new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return days <= 3 && days >= 0;
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileCheck className="h-8 w-8" />
            Documents to Submit
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track court document submissions across cases
          </p>
        </div>
        <RoleGate permission="cases:write">
          <Dialog open={open} onOpenChange={(v) => {
              setOpen(v);
              if (!v) {
                setSelectedCaseId("");
                setSelectedClientId("");
                setAutoCourtName("");
              }
            }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Add Document
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>New Document Submission</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Document Title *</Label>
                  <Input
                    id="title"
                    name="title"
                    placeholder="e.g., Written Statement in CS/123/2024"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="documentType">Document Type</Label>
                    <Select name="documentType" defaultValue="PLEADING">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DOC_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select name="priority" defaultValue="MEDIUM">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    rows={2}
                    placeholder="Details about the document..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Case</Label>
                  <Select
                    value={selectedCaseId}
                    onValueChange={(v) => handleCaseChange(v ?? "")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select case" />
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Client</Label>
                    <Select
                      value={selectedClientId}
                      onValueChange={(v) => setSelectedClientId(v ?? "")}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={selectedCaseId ? "Select client" : "Select case first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedCaseId ? (
                          // Show clients linked to the selected case
                          (() => {
                            const selectedCase = cases.find((c) => c.id === selectedCaseId);
                            const caseClients = selectedCase?.clients || [];
                            if (caseClients.length === 0) {
                              return (
                                <SelectItem value="__none" disabled>
                                  No clients linked to this case
                                </SelectItem>
                              );
                            }
                            return caseClients.map((cl) => (
                              <SelectItem key={cl.id} value={cl.id}>
                                {cl.name} ({cl.role})
                              </SelectItem>
                            ));
                          })()
                        ) : (
                          // Show all clients when no case selected
                          allClients.map((cl) => (
                            <SelectItem key={cl.id} value={cl.id}>
                              {cl.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Assign To</Label>
                    <Select name="assignedTo">
                      <SelectTrigger>
                        <SelectValue placeholder="Select person" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name} ({u.role.replace(/_/g, " ")})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input id="dueDate" name="dueDate" type="date" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="courtName">Court</Label>
                    <Input
                      id="courtName"
                      name="courtName"
                      placeholder="Court name"
                      value={autoCourtName}
                      onChange={(e) => setAutoCourtName(e.target.value)}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full">
                  Create
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </RoleGate>
      </div>

      {loading ? (
        <div className="text-center py-10 text-muted-foreground">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {COLUMNS.map((col) => {
            const items = getColumnItems(col.id);
            return (
              <div
                key={col.id}
                className={`rounded-lg border-2 ${col.color} p-3 min-h-[400px]`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm text-gray-900">{col.label}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {items.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {items.map((item) => (
                    <Card
                      key={item.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, item.id)}
                      className={`cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
                        isOverdue(item.dueDate) && item.status !== "SUBMITTED"
                          ? "border-red-400 border-2"
                          : isDueSoon(item.dueDate) && item.status !== "SUBMITTED"
                          ? "border-orange-400 border-2"
                          : ""
                      }`}
                    >
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-start justify-between gap-1">
                          <div className="flex items-start gap-1">
                            <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                            <p className="font-medium text-sm leading-tight">
                              {item.title}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1">
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              priorityColors[item.priority]
                            }`}
                          >
                            {item.priority}
                          </span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {item.documentType.replace(/_/g, " ")}
                          </Badge>
                        </div>

                        {item.case && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Briefcase className="h-3 w-3" />
                            {item.case.caseNumber}
                          </div>
                        )}

                        {item.client && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            {item.client.name}
                          </div>
                        )}

                        {item.assignee && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            {item.assignee.name}
                          </div>
                        )}

                        {item.dueDate && (
                          <div
                            className={`flex items-center gap-1 text-xs ${
                              isOverdue(item.dueDate) && item.status !== "SUBMITTED"
                                ? "text-red-600 font-semibold"
                                : isDueSoon(item.dueDate) && item.status !== "SUBMITTED"
                                ? "text-orange-600 font-semibold"
                                : "text-muted-foreground"
                            }`}
                          >
                            <Calendar className="h-3 w-3" />
                            {format(new Date(item.dueDate), "dd MMM yyyy")}
                            {isOverdue(item.dueDate) && item.status !== "SUBMITTED" && " (Overdue)"}
                          </div>
                        )}

                        {item.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {item.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between pt-1 border-t">
                          <div className="flex gap-1">
                            {getPrevStatus(item.status) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() =>
                                  moveCard(item.id, getPrevStatus(item.status)!)
                                }
                              >
                                <ArrowLeft className="h-3 w-3" />
                              </Button>
                            )}
                            {getNextStatus(item.status) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() =>
                                  moveCard(item.id, getNextStatus(item.status)!)
                                }
                              >
                                <ArrowRight className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-red-500 hover:text-red-700"
                            onClick={() => deleteCard(item.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
