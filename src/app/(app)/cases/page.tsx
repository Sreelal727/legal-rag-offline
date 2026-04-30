"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Plus, Search, Briefcase, Scale, Users, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { RoleGate } from "@/components/role-gate";
import Link from "next/link";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const CASE_TYPES = ["CIVIL", "CRIMINAL", "WRIT", "APPEAL", "REVISION", "EXECUTION", "ARBITRATION", "OTHER"];
const COURT_TYPES = ["SUPREME_COURT", "HIGH_COURT", "DISTRICT_COURT", "TRIBUNAL", "CONSUMER_FORUM", "OTHER"];
const STATUSES = ["ACTIVE", "PENDING", "CLOSED", "DISPOSED", "TRANSFERRED"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

const priorityColors: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-800",
  MEDIUM: "bg-blue-100 text-blue-800",
  HIGH: "bg-orange-100 text-orange-800",
  URGENT: "bg-red-100 text-red-800",
};

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ACTIVE: "default",
  PENDING: "secondary",
  CLOSED: "outline",
  DISPOSED: "outline",
  TRANSFERRED: "secondary",
};

interface CaseItem {
  id: string;
  caseNumber: string;
  title: string;
  caseType: string;
  courtName: string | null;
  courtType: string;
  status: string;
  priority: string;
  nextHearingDate: string | null;
  caseClients: { client: { name: string }; role: string }[];
  caseAssignments: { user: { name: string; role: string } }[];
  _count: { documents: number; caseEvents: number };
}

interface ExistingClient {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  clientType: string;
}

export default function CasesPage() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [existingClients, setExistingClients] = useState<ExistingClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedClient, setSelectedClient] = useState<ExistingClient | null>(null);

  const fetchCases = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    if (priorityFilter) params.set("priority", priorityFilter);
    const res = await fetch(`/api/cases?${params.toString()}`);
    const data = await res.json();
    setCases(data.cases || []);
    setLoading(false);
  }, [search, statusFilter, priorityFilter]);

  const updateCaseField = async (caseId: string, field: string, value: string) => {
    const res = await fetch(`/api/cases/${caseId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    if (res.ok) {
      setCases((prev) => prev.map((c) => c.id === caseId ? { ...c, [field]: value } : c));
      toast.success(`${field.charAt(0).toUpperCase() + field.slice(1)} updated to ${value}`);
    } else {
      toast.error(`Failed to update ${field}`);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const fetchExistingClients = useCallback(async () => {
    const res = await fetch("/api/clients?limit=100");
    const data = await res.json();
    setExistingClients(data.clients || []);
  }, []);

  useEffect(() => {
    if (open) fetchExistingClients();
  }, [open, fetchExistingClients]);

  const handleClientSelect = (clientId: string | null) => {
    if (!clientId || clientId === "new") {
      setSelectedClientId("new");
      setSelectedClient(null);
      return;
    }
    setSelectedClientId(clientId);
    const client = existingClients.find((c) => c.id === clientId) || null;
    setSelectedClient(client);
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const body: Record<string, any> = Object.fromEntries(formData.entries());

    if (selectedClient) {
      body.existingClientId = selectedClient.id;
      body.clientName = selectedClient.name;
    }

    const res = await fetch("/api/cases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      toast.success("Case created successfully");
      setOpen(false);
      fetchCases();
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to create case");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Cases</h1>
        <RoleGate permission="cases:write">
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setSelectedClientId(""); setSelectedClient(null); } }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> New Case
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Case</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Case Details</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="caseNumber">Case Number *</Label>
                    <Input id="caseNumber" name="caseNumber" placeholder="CS/XXX/2024" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="caseType">Case Type</Label>
                    <Select name="caseType" defaultValue="CIVIL">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CASE_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input id="title" name="title" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" name="description" rows={2} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="courtName">Court Name</Label>
                    <Input id="courtName" name="courtName" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="courtType">Court Type</Label>
                    <Select name="courtType" defaultValue="DISTRICT_COURT">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {COURT_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="judge">Judge</Label>
                    <Input id="judge" name="judge" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="filingDate">Filing Date</Label>
                    <Input id="filingDate" name="filingDate" type="date" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select name="priority" defaultValue="MEDIUM">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select name="status" defaultValue="ACTIVE">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <hr className="my-2" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Client Details</p>
                <div className="space-y-2">
                  <Label>Select Client</Label>
                  <Select value={selectedClientId} onValueChange={handleClientSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose existing or new...">
                        {selectedClientId === "new"
                          ? "+ New Client"
                          : (() => { const c = existingClients.find((x: any) => x.id === selectedClientId); return c ? `${c.name}${c.phone ? ` (${c.phone})` : ""}` : undefined; })() || undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">+ New Client</SelectItem>
                      {existingClients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} {c.phone ? `(${c.phone})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedClient && (
                  <div className="text-xs text-muted-foreground bg-muted rounded-md p-2 space-y-0.5">
                    <p><strong>{selectedClient.name}</strong> — {selectedClient.clientType}</p>
                    {selectedClient.email && <p>Email: {selectedClient.email}</p>}
                    {selectedClient.phone && <p>Phone: {selectedClient.phone}</p>}
                    {selectedClient.address && <p>Address: {selectedClient.address}</p>}
                  </div>
                )}
                {(!selectedClient) && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="clientName">Client Name *</Label>
                        <Input id="clientName" name="clientName" placeholder="Full name" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="clientType">Client Type</Label>
                        <Select name="clientType" defaultValue="INDIVIDUAL">
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                            <SelectItem value="COMPANY">Company</SelectItem>
                            <SelectItem value="GOVERNMENT">Government</SelectItem>
                            <SelectItem value="NGO">NGO</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="clientEmail">Email</Label>
                        <Input id="clientEmail" name="clientEmail" type="email" placeholder="client@example.com" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="clientPhone">Phone</Label>
                        <Input id="clientPhone" name="clientPhone" placeholder="+91-XXXXXXXXXX" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="clientAddress">Address</Label>
                      <Input id="clientAddress" name="clientAddress" placeholder="Full address" />
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <Label htmlFor="clientRole">Role in Case</Label>
                  <Select name="clientRole" defaultValue="PETITIONER">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PETITIONER">Petitioner</SelectItem>
                      <SelectItem value="RESPONDENT">Respondent</SelectItem>
                      <SelectItem value="APPELLANT">Appellant</SelectItem>
                      <SelectItem value="COMPLAINANT">Complainant</SelectItem>
                      <SelectItem value="ACCUSED">Accused</SelectItem>
                      <SelectItem value="PLAINTIFF">Plaintiff</SelectItem>
                      <SelectItem value="DEFENDANT">Defendant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" className="w-full">Create Case</Button>
              </form>
            </DialogContent>
          </Dialog>
        </RoleGate>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search cases..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v === "all" ? "" : String(v || ""))}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={(v: any) => setPriorityFilter(v === "all" ? "" : String(v || ""))}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            {PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-10 text-muted-foreground">Loading...</div>
      ) : cases.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">No cases found</div>
      ) : (
        <div className="space-y-4">
          {cases.map((c) => (
            <Card key={c.id} className="hover:shadow-md transition-shadow mb-4">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/cases/${c.id}`} className="flex items-center gap-2 hover:underline">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono text-sm font-medium">{c.caseNumber}</span>
                      </Link>
                      {/* Status dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex items-center gap-1 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                            <Badge variant={statusColors[c.status] || "secondary"} className="cursor-pointer hover:opacity-80">
                              {c.status} <ChevronDown className="h-3 w-3 ml-0.5" />
                            </Badge>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          {STATUSES.map((s) => (
                            <DropdownMenuItem
                              key={s}
                              onClick={(e) => { e.stopPropagation(); updateCaseField(c.id, "status", s); }}
                              className={c.status === s ? "bg-accent font-medium" : ""}
                            >
                              {s}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      {/* Priority dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex items-center gap-1 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                            <span className={`text-xs px-2 py-0.5 rounded-full cursor-pointer hover:opacity-80 inline-flex items-center gap-1 ${priorityColors[c.priority] || ""}`}>
                              {c.priority} <ChevronDown className="h-3 w-3" />
                            </span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          {PRIORITIES.map((p) => (
                            <DropdownMenuItem
                              key={p}
                              onClick={(e) => { e.stopPropagation(); updateCaseField(c.id, "priority", p); }}
                              className={c.priority === p ? "bg-accent font-medium" : ""}
                            >
                              <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColors[p]}`}>{p}</span>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <Link href={`/cases/${c.id}`} className="block hover:underline">
                      <p className="font-medium">{c.title}</p>
                    </Link>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {c.courtName && (
                        <span className="flex items-center gap-1">
                          <Scale className="h-3 w-3" /> {c.courtName}
                        </span>
                      )}
                      {c.caseClients.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {c.caseClients.map((cc) => cc.client.name).join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    {c.nextHearingDate && (
                      <div>
                        <p className="text-xs text-muted-foreground">Next Hearing</p>
                        <p className="font-medium">{format(new Date(c.nextHearingDate), "dd MMM yyyy")}</p>
                      </div>
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
