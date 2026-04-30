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
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Clock, AlertTriangle, AlertCircle, CheckCircle, XCircle, Timer, Search,
} from "lucide-react";
import { toast } from "sonner";
import { RoleGate } from "@/components/role-gate";
import { format, differenceInDays } from "date-fns";
import { LIMITATION_PERIODS, LIMITATION_CATEGORIES, type LimitationPeriod } from "@/lib/indian-law/limitation-periods";
import { clientLabel, selectedClientLabel } from "@/lib/client-label";

interface Tracker {
  id: string;
  title: string;
  description: string | null;
  category: string;
  accrualDate: string;
  limitationDays: number;
  deadlineDate: string;
  extensionDays: number;
  extensionReason: string | null;
  status: string;
  alertDays: number;
  notes: string | null;
  case: { id: string; caseNumber: string; title: string } | null;
  client: { id: string; name: string } | null;
}

function getUrgency(deadlineDate: string) {
  const days = differenceInDays(new Date(deadlineDate), new Date());
  if (days < 0) return { level: "expired", color: "bg-red-600 text-white", icon: XCircle, label: `Expired ${Math.abs(days)}d ago` };
  if (days <= 7) return { level: "critical", color: "bg-red-100 text-red-800", icon: AlertCircle, label: `${days}d left` };
  if (days <= 30) return { level: "warning", color: "bg-orange-100 text-orange-800", icon: AlertTriangle, label: `${days}d left` };
  return { level: "safe", color: "bg-green-100 text-green-800", icon: CheckCircle, label: `${days}d left` };
}

export default function LimitationPage() {
  const [trackers, setTrackers] = useState<Tracker[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<LimitationPeriod | null>(null);
  const [searchTemplate, setSearchTemplate] = useState("");

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState("GENERAL");
  const [formAccrualDate, setFormAccrualDate] = useState("");
  const [formLimitationDays, setFormLimitationDays] = useState("");
  const [formCaseId, setFormCaseId] = useState("");
  const [formClientId, setFormClientId] = useState("");
  const [formAlertDays, setFormAlertDays] = useState("30");
  const [formNotes, setFormNotes] = useState("");

  const fetchTrackers = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/limitation?status=all");
    const data = await res.json();
    setTrackers(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTrackers();
    fetch("/api/cases?limit=100").then((r) => r.json()).then((d) => setCases(d.cases || []));
    fetch("/api/clients?limit=100").then((r) => r.json()).then((d) => setClients(d.clients || []));
  }, [fetchTrackers]);

  const handleSelectTemplate = (periodId: string) => {
    const period = LIMITATION_PERIODS.find((p) => p.id === periodId);
    if (period) {
      setSelectedPeriod(period);
      setFormTitle(`${period.article} - ${period.description}`);
      setFormDescription(`${period.act}\nAccrual: ${period.accrualEvent}`);
      setFormCategory(period.category);
      setFormLimitationDays(String(period.period));
    }
  };

  const handleCreate = async () => {
    if (!formTitle || !formAccrualDate || !formLimitationDays) {
      toast.error("Title, accrual date, and limitation period are required");
      return;
    }

    const res = await fetch("/api/limitation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: formTitle,
        description: formDescription,
        category: formCategory,
        accrualDate: formAccrualDate,
        limitationDays: Number(formLimitationDays),
        caseId: formCaseId || null,
        clientId: formClientId || null,
        alertDays: Number(formAlertDays),
        notes: formNotes,
      }),
    });

    if (res.ok) {
      toast.success("Limitation tracker created");
      setOpen(false);
      resetForm();
      fetchTrackers();
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to create");
    }
  };

  const resetForm = () => {
    setSelectedPeriod(null);
    setFormTitle("");
    setFormDescription("");
    setFormCategory("GENERAL");
    setFormAccrualDate("");
    setFormLimitationDays("");
    setFormCaseId("");
    setFormClientId("");
    setFormAlertDays("30");
    setFormNotes("");
  };

  const handleMarkFiled = async (id: string) => {
    const res = await fetch(`/api/limitation/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "FILED" }),
    });
    if (res.ok) {
      toast.success("Marked as filed");
      fetchTrackers();
    }
  };

  // Compute deadline from accrual date
  const computedDeadline = formAccrualDate && formLimitationDays
    ? (() => {
        const d = new Date(formAccrualDate);
        d.setDate(d.getDate() + Number(formLimitationDays));
        return d;
      })()
    : null;

  // Separate trackers by urgency
  const active = trackers.filter((t) => t.status === "ACTIVE");
  const expired = active.filter((t) => differenceInDays(new Date(t.deadlineDate), new Date()) < 0);
  const critical = active.filter((t) => {
    const d = differenceInDays(new Date(t.deadlineDate), new Date());
    return d >= 0 && d <= 7;
  });
  const warning = active.filter((t) => {
    const d = differenceInDays(new Date(t.deadlineDate), new Date());
    return d > 7 && d <= 30;
  });

  const filteredTemplates = LIMITATION_PERIODS.filter((p) =>
    searchTemplate === "" ||
    p.description.toLowerCase().includes(searchTemplate.toLowerCase()) ||
    p.article.toLowerCase().includes(searchTemplate.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTemplate.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Timer className="h-8 w-8" /> Limitation Tracker
          </h1>
          <p className="text-sm text-muted-foreground">Track statutory deadlines under Indian limitation laws</p>
        </div>
        <RoleGate permission="cases:write">
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Track Deadline</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New Limitation Tracker</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Template selector */}
                <div className="space-y-2">
                  <Label>Quick Select from Limitation Act</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search articles... (e.g., breach of contract, cheque bounce)"
                      value={searchTemplate}
                      onChange={(e) => setSearchTemplate(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {searchTemplate && (
                    <div className="max-h-40 overflow-y-auto border rounded-md">
                      {filteredTemplates.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => { handleSelectTemplate(p.id); setSearchTemplate(""); }}
                          className="w-full text-left p-2 hover:bg-muted text-sm border-b last:border-0"
                        >
                          <span className="font-medium">{p.article}</span> - {p.description}
                          <span className="text-muted-foreground ml-2">
                            ({p.period > 0 ? `${p.period} days` : "No fixed period"})
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedPeriod && (
                    <div className="p-2 bg-muted/50 rounded text-sm">
                      <strong>{selectedPeriod.article}</strong> - {selectedPeriod.act}
                      <br />
                      <span className="text-muted-foreground">Accrual: {selectedPeriod.accrualEvent}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} rows={2} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={formCategory} onValueChange={(v: any) => setFormCategory(String(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {LIMITATION_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Alert Before (days)</Label>
                    <Input type="number" value={formAlertDays} onChange={(e) => setFormAlertDays(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date of Accrual (cause of action) *</Label>
                    <Input type="date" value={formAccrualDate} onChange={(e) => setFormAccrualDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Limitation Period (days) *</Label>
                    <Input type="number" value={formLimitationDays} onChange={(e) => setFormLimitationDays(e.target.value)} />
                  </div>
                </div>

                {computedDeadline && (
                  <div className="p-3 bg-primary/5 border rounded-md">
                    <p className="text-sm font-medium">
                      Computed Deadline: <strong>{format(computedDeadline, "dd MMMM yyyy (EEEE)")}</strong>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {differenceInDays(computedDeadline, new Date())} days from today
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Link to Case</Label>
                    <Select value={formCaseId} onValueChange={(v: any) => setFormCaseId(String(v))}>
                      <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        {cases.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>{c.caseNumber}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Link to Client</Label>
                    <Select value={formClientId} onValueChange={(v: any) => setFormClientId(String(v))}>
                      <SelectTrigger>
                        <SelectValue placeholder="None">
                          {selectedClientLabel(formClientId, clients) || undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>{clientLabel(c, clients)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={2} />
                </div>
                <Button onClick={handleCreate} className="w-full">Create Tracker</Button>
              </div>
            </DialogContent>
          </Dialog>
        </RoleGate>
      </div>

      {/* Alert Summary */}
      {(expired.length > 0 || critical.length > 0) && (
        <div className="grid gap-4 md:grid-cols-3">
          {expired.length > 0 && (
            <Card className="border-red-300 bg-red-50">
              <CardContent className="p-4 flex items-center gap-3">
                <XCircle className="h-8 w-8 text-red-600" />
                <div>
                  <p className="text-2xl font-bold text-red-600">{expired.length}</p>
                  <p className="text-sm text-red-800">Expired Deadlines</p>
                </div>
              </CardContent>
            </Card>
          )}
          {critical.length > 0 && (
            <Card className="border-orange-300 bg-orange-50">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertCircle className="h-8 w-8 text-orange-600" />
                <div>
                  <p className="text-2xl font-bold text-orange-600">{critical.length}</p>
                  <p className="text-sm text-orange-800">Critical ({"<"}7 days)</p>
                </div>
              </CardContent>
            </Card>
          )}
          {warning.length > 0 && (
            <Card className="border-yellow-300 bg-yellow-50">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-yellow-600" />
                <div>
                  <p className="text-2xl font-bold text-yellow-600">{warning.length}</p>
                  <p className="text-sm text-yellow-800">Warning ({"<"}30 days)</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Tracker List */}
      {loading ? (
        <div className="text-center py-10 text-muted-foreground">Loading...</div>
      ) : trackers.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <Timer className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No limitation trackers yet</p>
          <p className="text-sm">Create one to start tracking statutory deadlines</p>
        </div>
      ) : (
        <div className="space-y-3">
          {trackers
            .sort((a, b) => new Date(a.deadlineDate).getTime() - new Date(b.deadlineDate).getTime())
            .map((tracker) => {
              const urgency = getUrgency(tracker.deadlineDate);
              const UrgencyIcon = urgency.icon;
              return (
                <Card key={tracker.id} className={tracker.status === "FILED" ? "opacity-60" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <UrgencyIcon className={`h-5 w-5 ${
                          urgency.level === "expired" ? "text-red-600" :
                          urgency.level === "critical" ? "text-red-500" :
                          urgency.level === "warning" ? "text-orange-500" : "text-green-500"
                        }`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{tracker.title}</p>
                            {tracker.status === "FILED" && <Badge variant="secondary">Filed</Badge>}
                            <Badge className={urgency.color}>{urgency.label}</Badge>
                            <Badge variant="outline">{tracker.category}</Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                            <span>Accrual: {format(new Date(tracker.accrualDate), "dd MMM yyyy")}</span>
                            <span>Period: {tracker.limitationDays} days</span>
                            <span className="font-medium">Deadline: {format(new Date(tracker.deadlineDate), "dd MMM yyyy")}</span>
                            {tracker.case && <Badge variant="outline" className="text-[10px]">{tracker.case.caseNumber}</Badge>}
                            {tracker.client && <span>Client: {tracker.client.name}</span>}
                          </div>
                          {tracker.description && (
                            <p className="text-xs text-muted-foreground mt-1">{tracker.description}</p>
                          )}
                        </div>
                      </div>
                      {tracker.status === "ACTIVE" && (
                        <Button size="sm" variant="outline" onClick={() => handleMarkFiled(tracker.id)}>
                          <CheckCircle className="mr-1 h-3 w-3" /> Mark Filed
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      )}
    </div>
  );
}
