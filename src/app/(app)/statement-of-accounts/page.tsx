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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Calculator, Plus, Trash2, Save, Printer, Loader2, FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import { REST_PERIODS } from "@/lib/loan-types";
import { formatINR } from "@/lib/interest-calculator";
import { format } from "date-fns";

interface Transaction {
  date: string;
  type: "DEBIT" | "CREDIT" | "CHARGE";
  amount: number;
  description?: string;
}

interface PeriodRow {
  fromDate: string;
  toDate: string;
  days: number;
  openingBalance: number;
  interestRate: number;
  interestAmount: number;
  penalInterestAmount: number;
  transactions: Transaction[];
  transactionsTotal: number;
  closingBalance: number;
}

interface CalcResult {
  principal: number;
  totalInterest: number;
  totalPenalInterest: number;
  totalDue: number;
  periods: PeriodRow[];
  summary: { days: number; effectiveRate: number; compoundingsPerYear: number };
}

interface CaseOption {
  id: string;
  caseNumber: string;
  title: string;
  principalAmount?: number | null;
  interestRate?: number | null;
  penalInterestRate?: number | null;
  interestRests?: string | null;
  loanDisbursementDate?: string | null;
}

interface SavedStatement {
  id: string;
  title: string;
  asOnDate: string;
  principalAmount: number;
  interestRate: number;
  rests: string;
  totalInterest: number;
  totalPenalInterest: number;
  totalDue: number;
  case?: { id: string; caseNumber: string; title: string } | null;
  createdAt: string;
}

const today = () => new Date().toISOString().slice(0, 10);

export default function StatementOfAccountsPage() {
  const [cases, setCases] = useState<CaseOption[]>([]);
  const [savedStatements, setSavedStatements] = useState<SavedStatement[]>([]);

  // Form state
  const [caseId, setCaseId] = useState("");
  const [title, setTitle] = useState("Statement of Accounts");
  const [principalAmount, setPrincipalAmount] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [penalRate, setPenalRate] = useState("");
  const [rests, setRests] = useState("QUARTERLY");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState(today());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notes, setNotes] = useState("");

  // Live calc
  const [calc, setCalc] = useState<CalcResult | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);

  const [txDialogOpen, setTxDialogOpen] = useState(false);
  const [newTx, setNewTx] = useState<Transaction>({
    date: today(),
    type: "CREDIT",
    amount: 0,
    description: "",
  });

  // Load cases & statements
  const loadCases = useCallback(async () => {
    const r = await fetch("/api/cases?limit=200");
    const d = await r.json();
    setCases(
      (d.cases || []).map((c: any) => ({
        id: c.id,
        caseNumber: c.caseNumber,
        title: c.title,
        principalAmount: c.principalAmount,
        interestRate: c.interestRate,
        penalInterestRate: c.penalInterestRate,
        interestRests: c.interestRests,
        loanDisbursementDate: c.loanDisbursementDate,
      }))
    );
  }, []);

  const loadSaved = useCallback(async () => {
    const r = await fetch("/api/account-statements");
    if (r.ok) setSavedStatements(await r.json());
  }, []);

  useEffect(() => {
    loadCases();
    loadSaved();
  }, [loadCases, loadSaved]);

  // When a case is selected, prefill loan fields
  useEffect(() => {
    if (!caseId) return;
    const c = cases.find((x) => x.id === caseId);
    if (!c) return;
    if (c.principalAmount && !principalAmount) setPrincipalAmount(String(c.principalAmount));
    if (c.interestRate && !interestRate) setInterestRate(String(c.interestRate));
    if (c.penalInterestRate && !penalRate) setPenalRate(String(c.penalInterestRate));
    if (c.interestRests) setRests(c.interestRests);
    if (c.loanDisbursementDate && !fromDate) {
      setFromDate(c.loanDisbursementDate.slice(0, 10));
    }
  }, [caseId, cases]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live calculate
  const recalculate = useCallback(async () => {
    if (!principalAmount || !interestRate || !fromDate || !toDate) {
      setCalc(null);
      return;
    }
    setCalculating(true);
    try {
      const r = await fetch("/api/account-statements/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          principalAmount,
          interestRate,
          penalRate: penalRate || 0,
          rests,
          fromDate,
          toDate,
          transactions,
        }),
      });
      if (r.ok) {
        const d = await r.json();
        setCalc(d);
      } else {
        const err = await r.json();
        toast.error(err.error || "Calculation failed");
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCalculating(false);
    }
  }, [principalAmount, interestRate, penalRate, rests, fromDate, toDate, transactions]);

  // Auto-recalculate on form change (debounced)
  useEffect(() => {
    const t = setTimeout(recalculate, 400);
    return () => clearTimeout(t);
  }, [recalculate]);

  const addTransaction = () => {
    if (!newTx.date || !newTx.amount) {
      toast.error("Date and amount are required");
      return;
    }
    setTransactions((prev) =>
      [...prev, { ...newTx, amount: Number(newTx.amount) }].sort((a, b) =>
        a.date.localeCompare(b.date)
      )
    );
    setNewTx({ date: today(), type: "CREDIT", amount: 0, description: "" });
    setTxDialogOpen(false);
  };

  const removeTransaction = (idx: number) => {
    setTransactions((prev) => prev.filter((_, i) => i !== idx));
  };

  const saveStatement = async () => {
    if (!caseId) {
      toast.error("Please select a case to save the statement");
      return;
    }
    if (!calc) {
      toast.error("Please complete the calculation first");
      return;
    }
    setSaving(true);
    try {
      const r = await fetch("/api/account-statements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId,
          title,
          asOnDate: toDate,
          principalAmount,
          interestRate,
          penalRate,
          rests,
          fromDate,
          toDate,
          transactions,
          notes,
        }),
      });
      if (r.ok) {
        toast.success("Statement saved");
        loadSaved();
      } else {
        const err = await r.json();
        toast.error(err.error || "Failed to save");
      }
    } finally {
      setSaving(false);
    }
  };

  const printStatement = () => window.print();

  const restLabel = REST_PERIODS.find((r) => r.code === rests)?.label || rests;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calculator className="h-6 w-6" />
            Statement of Accounts
          </h1>
          <p className="text-sm text-muted-foreground">
            Compute compound interest for EP / SARFAESI / NI Act / Money recovery cases.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={printStatement} disabled={!calc}>
            <Printer className="h-4 w-4 mr-2" /> Print
          </Button>
          <Button onClick={saveStatement} disabled={!calc || saving || !caseId}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 print:hidden">
        {/* Inputs */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Loan Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Case</Label>
              <Select value={caseId} onValueChange={(v) => setCaseId(v || "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a case (optional for ad-hoc calc)" />
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
            <div>
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Principal (₹)</Label>
                <Input
                  type="number"
                  value={principalAmount}
                  onChange={(e) => setPrincipalAmount(e.target.value)}
                  placeholder="500000"
                />
              </div>
              <div>
                <Label>Interest %</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  placeholder="12"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Penal %</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={penalRate}
                  onChange={(e) => setPenalRate(e.target.value)}
                  placeholder="2"
                />
              </div>
              <div>
                <Label>Rests</Label>
                <Select value={rests} onValueChange={(v) => setRests(v || "QUARTERLY")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REST_PERIODS.map((r) => (
                      <SelectItem key={r.code} value={r.code}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>From Date</Label>
                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div>
                <Label>To Date</Label>
                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Computed for execution petition"
              />
            </div>
          </CardContent>
        </Card>

        {/* Transactions */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Transactions ({transactions.length})</CardTitle>
            <Button size="sm" onClick={() => setTxDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No transactions added. Add credits (repayments) or debits (additional disbursals/charges).
              </p>
            ) : (
              <div className="space-y-1 max-h-72 overflow-y-auto">
                {transactions.map((tx, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 text-sm border rounded px-3 py-2"
                  >
                    <span className="text-muted-foreground w-24">{tx.date}</span>
                    <Badge
                      variant={
                        tx.type === "CREDIT" ? "default" : tx.type === "CHARGE" ? "destructive" : "secondary"
                      }
                    >
                      {tx.type}
                    </Badge>
                    <span className="flex-1 truncate">{tx.description || "—"}</span>
                    <span className={tx.type === "CREDIT" ? "text-green-600" : "text-red-600"}>
                      {tx.type === "CREDIT" ? "-" : "+"}
                      {formatINR(tx.amount)}
                    </span>
                    <Button size="sm" variant="ghost" onClick={() => removeTransaction(i)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      {calc && (
        <Card className="print:shadow-none print:border-0">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{title}</span>
              {calculating && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {restLabel} • {calc.summary.days} days • {fromDate} to {toDate}
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <Stat label="Principal" value={formatINR(calc.principal)} />
              <Stat label="Interest" value={formatINR(calc.totalInterest)} />
              <Stat
                label="Penal Interest"
                value={formatINR(calc.totalPenalInterest)}
                muted={calc.totalPenalInterest === 0}
              />
              <Stat label="Total Due" value={formatINR(calc.totalDue)} highlight />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-muted">
                    <th className="border px-2 py-1 text-left">From</th>
                    <th className="border px-2 py-1 text-left">To</th>
                    <th className="border px-2 py-1 text-right">Days</th>
                    <th className="border px-2 py-1 text-right">Opening</th>
                    <th className="border px-2 py-1 text-right">Tx Net</th>
                    <th className="border px-2 py-1 text-right">Interest</th>
                    <th className="border px-2 py-1 text-right">Penal</th>
                    <th className="border px-2 py-1 text-right">Closing</th>
                  </tr>
                </thead>
                <tbody>
                  {calc.periods.map((p, i) => (
                    <tr key={i} className="hover:bg-muted/50">
                      <td className="border px-2 py-1">{p.fromDate}</td>
                      <td className="border px-2 py-1">{p.toDate}</td>
                      <td className="border px-2 py-1 text-right">{p.days}</td>
                      <td className="border px-2 py-1 text-right">{formatINR(p.openingBalance)}</td>
                      <td
                        className={
                          "border px-2 py-1 text-right " +
                          (p.transactionsTotal < 0
                            ? "text-green-600"
                            : p.transactionsTotal > 0
                            ? "text-red-600"
                            : "text-muted-foreground")
                        }
                      >
                        {p.transactionsTotal === 0 ? "—" : formatINR(p.transactionsTotal)}
                      </td>
                      <td className="border px-2 py-1 text-right">{formatINR(p.interestAmount)}</td>
                      <td className="border px-2 py-1 text-right">
                        {p.penalInterestAmount > 0 ? formatINR(p.penalInterestAmount) : "—"}
                      </td>
                      <td className="border px-2 py-1 text-right font-medium">
                        {formatINR(p.closingBalance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted font-medium">
                    <td className="border px-2 py-1" colSpan={5}>
                      Totals
                    </td>
                    <td className="border px-2 py-1 text-right">{formatINR(calc.totalInterest)}</td>
                    <td className="border px-2 py-1 text-right">
                      {formatINR(calc.totalPenalInterest)}
                    </td>
                    <td className="border px-2 py-1 text-right">{formatINR(calc.totalDue)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {notes && (
              <div className="mt-6 text-sm">
                <strong>Notes:</strong>
                <p className="text-muted-foreground whitespace-pre-wrap">{notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Saved statements list */}
      {savedStatements.length > 0 && (
        <Card className="print:hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Saved Statements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              {savedStatements.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 border rounded px-3 py-2"
                >
                  <span className="font-medium">{s.title}</span>
                  {s.case && (
                    <Badge variant="outline">
                      {s.case.caseNumber}
                    </Badge>
                  )}
                  <span className="text-muted-foreground">
                    as on {format(new Date(s.asOnDate), "dd MMM yyyy")}
                  </span>
                  <span className="ml-auto font-medium">{formatINR(s.totalDue)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add transaction dialog */}
      <Dialog open={txDialogOpen} onOpenChange={setTxDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={newTx.date}
                  onChange={(e) => setNewTx({ ...newTx, date: e.target.value })}
                />
              </div>
              <div>
                <Label>Type</Label>
                <Select
                  value={newTx.type}
                  onValueChange={(v) => setNewTx({ ...newTx, type: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CREDIT">Credit (Repayment)</SelectItem>
                    <SelectItem value="DEBIT">Debit (Disbursal)</SelectItem>
                    <SelectItem value="CHARGE">Charge (Penal/Other)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Amount (₹)</Label>
              <Input
                type="number"
                value={newTx.amount || ""}
                onChange={(e) => setNewTx({ ...newTx, amount: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={newTx.description}
                onChange={(e) => setNewTx({ ...newTx, description: e.target.value })}
                placeholder="e.g., Cheque No. 12345 received"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTxDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addTransaction}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
  muted,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={
        "rounded-lg border p-3 " +
        (highlight ? "bg-primary/10 border-primary" : muted ? "opacity-60" : "")
      }
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
