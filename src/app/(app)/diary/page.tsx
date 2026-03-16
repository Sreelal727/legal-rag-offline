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
import { Plus, BookOpen, Calendar } from "lucide-react";
import { toast } from "sonner";
import { RoleGate } from "@/components/role-gate";
import { format } from "date-fns";

interface DiaryEntry {
  id: string;
  date: string;
  courtName: string | null;
  caseNumber: string | null;
  description: string | null;
  stage: string | null;
  nextDate: string | null;
  notes: string | null;
  case: { id: string; caseNumber: string; title: string };
}

interface CaseOption {
  id: string;
  caseNumber: string;
  title: string;
}

export default function DiaryPage() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [cases, setCases] = useState<CaseOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/diary");
    const data = await res.json();
    setEntries(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  const fetchCases = useCallback(async () => {
    const res = await fetch("/api/cases?limit=100");
    const data = await res.json();
    setCases((data.cases || []).map((c: any) => ({ id: c.id, caseNumber: c.caseNumber, title: c.title })));
  }, []);

  useEffect(() => {
    fetchEntries();
    fetchCases();
  }, [fetchEntries, fetchCases]);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const body: any = Object.fromEntries(formData.entries());

    const selectedCase = cases.find((c) => c.id === body.caseId);
    if (selectedCase) body.caseNumber = selectedCase.caseNumber;

    const res = await fetch("/api/diary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      toast.success("Diary entry created");
      setOpen(false);
      fetchEntries();
    } else {
      toast.error("Failed to create entry");
    }
  };

  // Group entries by date
  const grouped = entries.reduce((acc, entry) => {
    const dateKey = format(new Date(entry.date), "yyyy-MM-dd");
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(entry);
    return acc;
  }, {} as Record<string, DiaryEntry[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Court Diary</h1>
        <RoleGate permission="diary:write">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Add Entry</Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>New Diary Entry</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Case *</Label>
                  <Select name="caseId" required>
                    <SelectTrigger><SelectValue placeholder="Select case" /></SelectTrigger>
                    <SelectContent>
                      {cases.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.caseNumber} - {c.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date *</Label>
                    <Input id="date" name="date" type="date" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stage">Stage</Label>
                    <Input id="stage" name="stage" placeholder="e.g., Arguments, Evidence" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="courtName">Court Name</Label>
                  <Input id="courtName" name="courtName" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" name="description" rows={2} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nextDate">Next Date</Label>
                  <Input id="nextDate" name="nextDate" type="date" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" name="notes" rows={2} />
                </div>
                <Button type="submit" className="w-full">Create Entry</Button>
              </form>
            </DialogContent>
          </Dialog>
        </RoleGate>
      </div>

      {loading ? (
        <div className="text-center py-10 text-muted-foreground">Loading...</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">No diary entries</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([dateKey, dayEntries]) => (
              <div key={dateKey}>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <h2 className="font-semibold">{format(new Date(dateKey), "EEEE, dd MMMM yyyy")}</h2>
                  <Badge variant="secondary">{dayEntries.length}</Badge>
                </div>
                <div className="space-y-2 ml-6">
                  {dayEntries.map((entry) => (
                    <Card key={entry.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-medium">{entry.caseNumber}</span>
                              {entry.stage && <Badge variant="outline">{entry.stage}</Badge>}
                            </div>
                            <p className="text-sm">{entry.description}</p>
                            {entry.courtName && (
                              <p className="text-xs text-muted-foreground">{entry.courtName}</p>
                            )}
                            {entry.notes && (
                              <p className="text-xs text-muted-foreground italic">{entry.notes}</p>
                            )}
                          </div>
                          {entry.nextDate && (
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">Next Date</p>
                              <p className="text-sm font-medium">{format(new Date(entry.nextDate), "dd MMM yyyy")}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
