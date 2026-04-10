"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Loader2, SearchCheck, Building2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { RoleGate } from "@/components/role-gate";
import { DistrictSelector } from "@/components/district-selector";
import { format } from "date-fns";

interface ScrutinyReport {
  id: string;
  title: string;
  referenceNumber: string | null;
  bankName: string | null;
  branchName: string | null;
  borrowerName: string | null;
  propertyAddress: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  creator: { id: string; name: string; role: string };
  case: { id: string; caseNumber: string; title: string } | null;
  client: { id: string; name: string } | null;
  _count: { propertyDocuments: number; deedChainNodes: number };
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-500",
  PROCESSING: "bg-blue-500",
  REVIEW: "bg-yellow-500",
  APPROVED: "bg-green-500",
  EXPORTED: "bg-purple-500",
};

export default function ScrutinyPage() {
  const router = useRouter();
  const [reports, setReports] = useState<ScrutinyReport[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: "",
    referenceNumber: "",
    bankName: "",
    branchName: "",
    borrowerName: "",
    propertyAddress: "",
  });
  const [district, setDistrict] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [policeStation, setPoliceStation] = useState("");

  const fetchReports = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/scrutiny?${params}`);
      const data = await res.json();
      setReports(data.reports || []);
    } catch {
      toast.error("Failed to fetch reports");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleCreate = async () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/scrutiny", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      const report = await res.json();
      toast.success("Report created");
      setOpen(false);
      setForm({ title: "", referenceNumber: "", bankName: "", branchName: "", borrowerName: "", propertyAddress: "" });
      setDistrict(""); setJurisdiction(""); setPoliceStation("");
      router.push(`/scrutiny/${report.id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create report");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Scrutiny Reports</h1>
          <p className="text-muted-foreground">Property title verification reports for banks</p>
        </div>
        <RoleGate permission="scrutiny:write">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> New Report</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Scrutiny Report</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Title *</Label>
                  <Input
                    placeholder="e.g., SBI Ernakulam - Rajan Property"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Bank Name</Label>
                    <Input
                      placeholder="e.g., State Bank of India"
                      value={form.bankName}
                      onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Branch</Label>
                    <Input
                      placeholder="e.g., Ernakulam Main"
                      value={form.branchName}
                      onChange={(e) => setForm({ ...form, branchName: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Reference Number</Label>
                    <Input
                      placeholder="Bank's ref / loan no."
                      value={form.referenceNumber}
                      onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Borrower Name</Label>
                    <Input
                      placeholder="Borrower / applicant"
                      value={form.borrowerName}
                      onChange={(e) => setForm({ ...form, borrowerName: e.target.value })}
                    />
                  </div>
                </div>
                <DistrictSelector
                  district={district}
                  jurisdiction={jurisdiction}
                  policeStation={policeStation}
                  onDistrictChange={setDistrict}
                  onJurisdictionChange={setJurisdiction}
                  onPoliceStationChange={setPoliceStation}
                />
                <div>
                  <Label>Property Address</Label>
                  <Input
                    placeholder="Full property address"
                    value={form.propertyAddress}
                    onChange={(e) => setForm({ ...form, propertyAddress: e.target.value })}
                  />
                </div>
                <Button onClick={handleCreate} disabled={creating} className="w-full">
                  {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Create Report
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </RoleGate>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search reports..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || "")}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="PROCESSING">Processing</SelectItem>
            <SelectItem value="REVIEW">Review</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="EXPORTED">Exported</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <SearchCheck className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No scrutiny reports yet</p>
            <p className="text-sm text-muted-foreground">Create your first report to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {reports.map((report) => (
            <Card
              key={report.id}
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => router.push(`/scrutiny/${report.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{report.title}</CardTitle>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {report.bankName && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" /> {report.bankName}
                          {report.branchName && ` - ${report.branchName}`}
                        </span>
                      )}
                      {report.propertyAddress && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {report.propertyAddress}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge className={statusColors[report.status] || "bg-gray-500"}>
                    {report.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  {report.borrowerName && <span>Borrower: {report.borrowerName}</span>}
                  {report.referenceNumber && <span>Ref: {report.referenceNumber}</span>}
                  <span>{report._count.propertyDocuments} documents</span>
                  <span>{report._count.deedChainNodes} deeds in chain</span>
                  <span>by {report.creator.name}</span>
                  <span>{format(new Date(report.updatedAt), "dd MMM yyyy")}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
