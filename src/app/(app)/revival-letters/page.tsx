"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { RefreshCw, Plus, Trash2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { formatINR } from "@/lib/interest-calculator";

interface RevivalLetter {
  id: string;
  caseId: string;
  revivalDate: string;
  revivalType: string;
  amount: number | null;
  reference: string | null;
  newLimitationDate: string | null;
  notes: string | null;
  case: { id: string; caseNumber: string; title: string };
}

interface CaseOption {
  id: string;
  caseNumber: string;
  title: string;
}

const REVIVAL_TYPES = [
  { code: "LETTER", label: "Acknowledgment Letter (Sec 18)" },
  { code: "PART_PAYMENT", label: "Part Payment (Sec 19)" },
  { code: "ACKNOWLEDGMENT", label: "Written Acknowledgment" },
  { code: "BALANCE_CONFIRMATION", label: "Balance Confirmation" },
];

const today = () => new Date().toISOString().slice(0, 10);

export default function RevivalLettersPage() {
  const [letters, setLetters] = useState<RevivalLetter[]>([]);
  const [cases, setCases] = useState<CaseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    caseId: "",
    revivalDate: today(),
    revivalType: "LETTER",
    amount: "",
    reference: "",
    notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [lr, cr] = await Promise.all([
        fetch("/api/revival-letters"),
        fetch("/api/cases?limit=200"),
      ]);
      if (lr.ok) setLetters(await lr.json());
      if (cr.ok) {
        const d = await cr.json();
        setCases(
          (d.cases || []).map((c: any) => ({
            id: c.id,
            caseNumber: c.caseNumber,
            title: c.title,
          }))
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (!form.caseId || !form.revivalDate) {
      toast.error("Case and revival date are required");
      return;
    }
    setSaving(true);
    try {
      const r = await fetch("/api/revival-letters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (r.ok) {
        toast.success("Revival recorded — limitation extended to " +
          format(new Date(new Date(form.revivalDate).setFullYear(new Date(form.revivalDate).getFullYear() + 3)), "dd MMM yyyy")
        );
        setOpen(false);
        setForm({
          caseId: "",
          revivalDate: today(),
          revivalType: "LETTER",
          amount: "",
          reference: "",
          notes: "",
        });
        load();
      } else {
        const err = await r.json();
        toast.error(err.error || "Failed to save");
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this revival entry?")) return;
    const r = await fetch(`/api/revival-letters/${id}`, { method: "DELETE" });
    if (r.ok) {
      toast.success("Deleted");
      load();
    }
  };

  // Group by case
  const byCase = letters.reduce<Record<string, RevivalLetter[]>>((acc, l) => {
    (acc[l.caseId] = acc[l.caseId] || []).push(l);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <RefreshCw className="h-6 w-6" />
            Revival Letters &amp; Acknowledgments
          </h1>
          <p className="text-sm text-muted-foreground">
            Track borrower acknowledgments and part-payments that extend limitation under Sec 18 / 19 of the Limitation Act 1963.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Record Revival
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin inline" /> Loading...
        </div>
      ) : letters.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <RefreshCw className="h-10 w-10 mx-auto mb-2 opacity-30" />
            No revival entries yet. Click "Record Revival" to add one.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(byCase).map(([caseId, list]) => {
            const sorted = [...list].sort((a, b) =>
              b.revivalDate.localeCompare(a.revivalDate)
            );
            const latest = sorted[0];
            const newLimit = latest.newLimitationDate
              ? new Date(latest.newLimitationDate)
              : null;
            const daysToLimit = newLimit ? differenceInDays(newLimit, new Date()) : null;
            const expiringSoon = daysToLimit !== null && daysToLimit < 90 && daysToLimit > 0;
            const expired = daysToLimit !== null && daysToLimit <= 0;
            return (
              <Card key={caseId}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    <span>
                      {latest.case.caseNumber} — {latest.case.title}
                    </span>
                    {newLimit && (
                      <Badge
                        variant={
                          expired ? "destructive" : expiringSoon ? "outline" : "default"
                        }
                      >
                        {expired && <AlertCircle className="h-3 w-3 mr-1" />}
                        Limitation: {format(newLimit, "dd MMM yyyy")}
                        {daysToLimit !== null &&
                          ` (${daysToLimit > 0 ? daysToLimit + " days left" : "expired"})`}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {sorted.map((l) => (
                      <div
                        key={l.id}
                        className="flex items-center gap-3 text-sm border rounded px-3 py-2"
                      >
                        <span className="font-medium w-28">
                          {format(new Date(l.revivalDate), "dd MMM yyyy")}
                        </span>
                        <Badge variant="secondary">
                          {REVIVAL_TYPES.find((t) => t.code === l.revivalType)?.label ||
                            l.revivalType}
                        </Badge>
                        {l.amount && (
                          <span className="text-green-600 font-medium">
                            {formatINR(l.amount)}
                          </span>
                        )}
                        {l.reference && (
                          <span className="text-muted-foreground">Ref: {l.reference}</span>
                        )}
                        <span className="flex-1 truncate text-muted-foreground">
                          {l.notes || ""}
                        </span>
                        <Button size="sm" variant="ghost" onClick={() => remove(l.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Revival / Acknowledgment</DialogTitle>
            <DialogDescription>
              The new limitation date will be auto-computed as 3 years from the revival date.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Case *</Label>
              <Select value={form.caseId} onValueChange={(v) => setForm({ ...form, caseId: v || "" })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a case" />
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
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Revival Date *</Label>
                <Input
                  type="date"
                  value={form.revivalDate}
                  onChange={(e) => setForm({ ...form, revivalDate: e.target.value })}
                />
              </div>
              <div>
                <Label>Type</Label>
                <Select
                  value={form.revivalType}
                  onValueChange={(v) => setForm({ ...form, revivalType: v || "LETTER" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REVIVAL_TYPES.map((t) => (
                      <SelectItem key={t.code} value={t.code}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Amount (₹)</Label>
                <Input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="If part payment / balance"
                />
              </div>
              <div>
                <Label>Reference</Label>
                <Input
                  value={form.reference}
                  onChange={(e) => setForm({ ...form, reference: e.target.value })}
                  placeholder="Letter / Receipt no."
                />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Revival
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
