"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, Calendar, FileText, Users, BookOpen, Scale, RefreshCw, Loader2, Plus, Trash2, UserX, MapPin, Phone, ChevronDown } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";

const STATUSES = ["ACTIVE", "PENDING", "CLOSED", "DISPOSED", "TRANSFERRED"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const STAGES = ["PRE_FILING", "FILED", "NOTICE", "WRITTEN_STATEMENT", "TRIAL", "ARGUMENTS", "JUDGMENT", "EXECUTION"];
const PARTY_TYPES = ["RESPONDENT", "DEFENDANT", "OPPOSITE_PARTY", "ACCUSED"];

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

export default function CaseDetailPage() {
  const params = useParams();
  const [caseData, setCaseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [cnrInput, setCnrInput] = useState("");

  const fetchCase = () => {
    fetch(`/api/cases/${params.id}`)
      .then((r) => r.json())
      .then((d) => { setCaseData(d); setCnrInput(d.cnrNumber || ""); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchCase(); }, [params.id]);

  const handleSyncEcourts = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/ecourts/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: params.id }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Synced with eCourts successfully");
        fetchCase();
      } else {
        toast.error(data.error || "Sync failed");
      }
    } catch {
      toast.error("Sync failed");
    }
    setSyncing(false);
  };

  const updateField = async (field: string, value: string) => {
    try {
      const res = await fetch(`/api/cases/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (res.ok) {
        setCaseData((prev: any) => ({ ...prev, [field]: value }));
        toast.success(`${field.charAt(0).toUpperCase() + field.slice(1)} updated to ${value}`);
      } else {
        toast.error(`Failed to update ${field}`);
      }
    } catch {
      toast.error(`Failed to update ${field}`);
    }
  };

  const handleSaveCNR = async () => {
    if (!cnrInput.trim()) return;
    try {
      const res = await fetch(`/api/cases/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cnrNumber: cnrInput.trim().toUpperCase() }),
      });
      if (res.ok) {
        toast.success("CNR number saved");
        fetchCase();
      }
    } catch {
      toast.error("Failed to save CNR");
    }
  };

  if (loading) return <div className="text-center py-10">Loading...</div>;
  if (!caseData) return <div className="text-center py-10">Case not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/cases">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">{caseData.caseNumber}</h1>
            {/* Status dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center cursor-pointer">
                  <Badge variant={statusColors[caseData.status] || "secondary"} className="cursor-pointer hover:opacity-80">
                    {caseData.status} <ChevronDown className="h-3 w-3 ml-1" />
                  </Badge>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {STATUSES.map((s) => (
                  <DropdownMenuItem
                    key={s}
                    onClick={() => updateField("status", s)}
                    className={caseData.status === s ? "bg-accent font-medium" : ""}
                  >
                    {s}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {/* Priority dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center cursor-pointer">
                  <span className={`text-xs px-2 py-0.5 rounded-full cursor-pointer hover:opacity-80 inline-flex items-center gap-1 ${priorityColors[caseData.priority] || ""}`}>
                    {caseData.priority} <ChevronDown className="h-3 w-3" />
                  </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {PRIORITIES.map((p) => (
                  <DropdownMenuItem
                    key={p}
                    onClick={() => updateField("priority", p)}
                    className={caseData.priority === p ? "bg-accent font-medium" : ""}
                  >
                    <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColors[p]}`}>{p}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {/* Stage dropdown */}
            {caseData.stage && (
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex items-center cursor-pointer">
                    <Badge variant="outline" className="cursor-pointer hover:opacity-80">
                      {caseData.stage.replace(/_/g, " ")} <ChevronDown className="h-3 w-3 ml-1" />
                    </Badge>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {STAGES.map((s) => (
                    <DropdownMenuItem
                      key={s}
                      onClick={() => updateField("stage", s)}
                      className={caseData.stage === s ? "bg-accent font-medium" : ""}
                    >
                      {s.replace(/_/g, " ")}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <p className="text-muted-foreground">{caseData.title}</p>
        </div>
      </div>

      {/* eCourts Integration */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Scale className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">eCourts / DCMS</p>
                {caseData.cnrNumber ? (
                  <p className="text-xs text-muted-foreground font-mono">{caseData.cnrNumber}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">No CNR linked</p>
                )}
              </div>
              {caseData.lastSyncedAt && (
                <Badge variant="outline" className="text-xs">
                  Last synced: {format(new Date(caseData.lastSyncedAt), "dd MMM, HH:mm")}
                </Badge>
              )}
              {caseData.ecourtStatus && (
                <Badge variant="secondary">{caseData.ecourtStatus}</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!caseData.cnrNumber ? (
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter CNR Number"
                    value={cnrInput}
                    onChange={(e) => setCnrInput(e.target.value.toUpperCase())}
                    className="w-48 font-mono text-sm"
                  />
                  <Button size="sm" variant="outline" onClick={handleSaveCNR}>Link</Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={handleSyncEcourts} disabled={syncing}>
                  {syncing ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-1 h-3 w-3" />}
                  Sync from eCourts
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Scale className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Court:</span> {caseData.courtName || "N/A"}
            </div>
            <p className="text-sm"><strong>Type:</strong> {caseData.courtType?.replace(/_/g, " ")}</p>
            <p className="text-sm"><strong>Judge:</strong> {caseData.judge || "N/A"}</p>
            <p className="text-sm"><strong>Case Type:</strong> {caseData.caseType}</p>
            {caseData.caseSubType && <p className="text-sm"><strong>Sub Type:</strong> {caseData.caseSubType.replace(/_/g, " ")}</p>}
            {caseData.stage && <p className="text-sm"><strong>Stage:</strong> {caseData.stage.replace(/_/g, " ")}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Filing:</span>
              {caseData.filingDate ? format(new Date(caseData.filingDate), "dd MMM yyyy") : "N/A"}
            </div>
            <p className="text-sm">
              <strong>Next Hearing:</strong>{" "}
              {caseData.nextHearingDate ? format(new Date(caseData.nextHearingDate), "dd MMM yyyy") : "N/A"}
            </p>
            {caseData.suitValue != null && <p className="text-sm"><strong>Suit Value:</strong> Rs. {caseData.suitValue.toLocaleString("en-IN")}</p>}
            {caseData.courtFee != null && <p className="text-sm"><strong>Court Fee:</strong> Rs. {caseData.courtFee.toLocaleString("en-IN")}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-2">
            <p className="text-sm"><strong>Documents:</strong> {caseData.documents?.length || 0}</p>
            <p className="text-sm"><strong>Events:</strong> {caseData.caseEvents?.length || 0}</p>
            <p className="text-sm"><strong>Opposite Parties:</strong> {caseData.oppositeParties?.length || 0}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="parties">
        <TabsList>
          <TabsTrigger value="parties">Parties & Team</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="diary">Diary</TabsTrigger>
          <TabsTrigger value="banking">Banking / Loan</TabsTrigger>
          <TabsTrigger value="appeal">Appeal</TabsTrigger>
        </TabsList>

        <TabsContent value="parties" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Our Parties (Clients)</CardTitle></CardHeader>
              <CardContent>
                {caseData.caseClients?.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No parties linked</p>
                ) : (
                  <div className="space-y-2">
                    {caseData.caseClients?.map((cc: any) => (
                      <div key={cc.id} className="flex justify-between items-center p-2 border rounded">
                        <div>
                          <Link href={`/clients/${cc.client.id}`} className="text-sm font-medium hover:underline">{cc.client.name}</Link>
                          {cc.client.phone && <p className="text-xs text-muted-foreground">{cc.client.phone}</p>}
                        </div>
                        <Badge variant="outline">{cc.role}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Assigned Advocates</CardTitle></CardHeader>
              <CardContent>
                {caseData.caseAssignments?.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No assignments</p>
                ) : (
                  <div className="space-y-2">
                    {caseData.caseAssignments?.map((ca: any) => (
                      <div key={ca.id} className="flex justify-between items-center p-2 border rounded">
                        <div>
                          <p className="text-sm font-medium">{ca.user.name}</p>
                          <p className="text-xs text-muted-foreground">{ca.user.role?.replace(/_/g, " ")}</p>
                        </div>
                        <Badge variant="outline">{ca.role}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Opposite Parties */}
          <OppositePartiesSection caseId={params.id as string} parties={caseData.oppositeParties || []} onUpdate={fetchCase} />
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardContent className="p-4">
              {caseData.caseEvents?.length === 0 ? (
                <p className="text-sm text-muted-foreground">No events recorded</p>
              ) : (
                <div className="space-y-3">
                  {caseData.caseEvents?.map((event: any) => (
                    <div key={event.id} className="flex justify-between items-start p-3 border rounded">
                      <div>
                        <Badge variant="secondary" className="mb-1">{event.eventType}</Badge>
                        <p className="text-sm">{event.description}</p>
                        {event.outcome && <p className="text-xs text-muted-foreground mt-1">Outcome: {event.outcome}</p>}
                      </div>
                      <div className="text-right text-sm">
                        <p>{format(new Date(event.date), "dd MMM yyyy")}</p>
                        {event.nextDate && (
                          <p className="text-xs text-muted-foreground">Next: {format(new Date(event.nextDate), "dd MMM yyyy")}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardContent className="p-4">
              {caseData.documents?.length === 0 ? (
                <div className="text-center py-6">
                  <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No documents uploaded</p>
                  <Link href="/documents">
                    <Button variant="outline" size="sm" className="mt-2">Upload Documents</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {caseData.documents?.map((doc: any) => (
                    <div key={doc.id} className="flex justify-between items-center p-3 border rounded">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{doc.title}</p>
                          <p className="text-xs text-muted-foreground">{doc.fileName}</p>
                        </div>
                      </div>
                      <Badge variant={doc.isProcessed ? "default" : "secondary"}>
                        {doc.isProcessed ? "Processed" : "Pending"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="diary">
          <Card>
            <CardContent className="p-4">
              {caseData.diaryEntries?.length === 0 ? (
                <p className="text-sm text-muted-foreground">No diary entries</p>
              ) : (
                <div className="space-y-3">
                  {caseData.diaryEntries?.map((entry: any) => (
                    <div key={entry.id} className="flex justify-between items-start p-3 border rounded">
                      <div>
                        <p className="text-sm font-medium">{entry.description}</p>
                        <p className="text-xs text-muted-foreground">{entry.courtName} - {entry.stage}</p>
                      </div>
                      <div className="text-right text-sm">
                        <p>{format(new Date(entry.date), "dd MMM yyyy")}</p>
                        {entry.nextDate && (
                          <p className="text-xs text-muted-foreground">Next: {format(new Date(entry.nextDate), "dd MMM yyyy")}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="banking">
          <BankingLoanSection caseId={params.id as string} caseData={caseData} onUpdate={fetchCase} />
        </TabsContent>

        <TabsContent value="appeal">
          <AppealSection caseId={params.id as string} caseData={caseData} onUpdate={fetchCase} />
        </TabsContent>
      </Tabs>

      {caseData.description && (
        <Card>
          <CardHeader><CardTitle className="text-base">Description</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{caseData.description}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ===== Opposite Parties Section ===== */

interface OppositeParty {
  id: string;
  name: string;
  fatherHusbandName: string | null;
  designation: string | null;
  address: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  pincode: string | null;
  phone: string | null;
  email: string | null;
  partyType: string;
  advocateName: string | null;
  advocatePhone: string | null;
  notes: string | null;
}

function OppositePartiesSection({
  caseId,
  parties,
  onUpdate,
}: {
  caseId: string;
  parties: OppositeParty[];
  onUpdate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    fatherHusbandName: "",
    designation: "",
    address: "",
    city: "",
    district: "",
    state: "",
    pincode: "",
    phone: "",
    email: "",
    partyType: "RESPONDENT",
    advocateName: "",
    advocatePhone: "",
    notes: "",
  });

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = { caseId, ...form };
    for (const key of Object.keys(payload)) {
      if (payload[key] === "") payload[key] = null;
    }
    payload.name = form.name; // name is required

    const res = await fetch("/api/opposite-parties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      toast.success("Opposite party added");
      setOpen(false);
      setForm({
        name: "", fatherHusbandName: "", designation: "", address: "",
        city: "", district: "", state: "", pincode: "", phone: "", email: "",
        partyType: "RESPONDENT", advocateName: "", advocatePhone: "", notes: "",
      });
      onUpdate();
    } else {
      toast.error("Failed to add opposite party");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove ${name} from opposite parties?`)) return;
    const res = await fetch(`/api/opposite-parties/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Opposite party removed");
      onUpdate();
    } else {
      toast.error("Failed to remove");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <UserX className="h-4 w-4" /> Opposite Parties
          </CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" /> Add Party
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Opposite Party</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input value={form.name} onChange={(e) => updateField("name", e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Party Type</Label>
                    <Select value={form.partyType} onValueChange={(v) => updateField("partyType", v ?? "RESPONDENT")}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PARTY_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Relation</Label>
                    <Select value={form.designation} onValueChange={(v) => updateField("designation", v ?? "")}>
                      <SelectTrigger><SelectValue placeholder="S/o, D/o..." /></SelectTrigger>
                      <SelectContent>
                        {["S/o", "D/o", "W/o", "R/o"].map((d) => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Father / Husband Name</Label>
                    <Input value={form.fatherHusbandName} onChange={(e) => updateField("fatherHusbandName", e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Textarea rows={2} value={form.address} onChange={(e) => updateField("address", e.target.value)} />
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input value={form.city} onChange={(e) => updateField("city", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>District</Label>
                    <Input value={form.district} onChange={(e) => updateField("district", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>State</Label>
                    <Input value={form.state} onChange={(e) => updateField("state", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Pincode</Label>
                    <Input value={form.pincode} onChange={(e) => updateField("pincode", e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={form.phone} onChange={(e) => updateField("phone", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} />
                  </div>
                </div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-1">Their Advocate</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Advocate Name</Label>
                    <Input value={form.advocateName} onChange={(e) => updateField("advocateName", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Advocate Phone</Label>
                    <Input value={form.advocatePhone} onChange={(e) => updateField("advocatePhone", e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea rows={2} value={form.notes} onChange={(e) => updateField("notes", e.target.value)} />
                </div>
                <Button type="submit" className="w-full">Add Opposite Party</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {parties.length === 0 ? (
          <p className="text-sm text-muted-foreground">No opposite parties added</p>
        ) : (
          <div className="space-y-3">
            {parties.map((party) => {
              const addr = [party.address, party.city, party.district, party.state, party.pincode].filter(Boolean).join(", ");
              return (
                <div key={party.id} className="p-3 border rounded-md space-y-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{party.name}</p>
                        <Badge variant="outline" className="text-xs">{party.partyType.replace(/_/g, " ")}</Badge>
                      </div>
                      {party.designation && party.fatherHusbandName && (
                        <p className="text-xs text-muted-foreground">{party.designation} {party.fatherHusbandName}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(party.id, party.name)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {addr && (
                    <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 mt-0.5 shrink-0" /> {addr}
                    </div>
                  )}
                  {party.phone && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" /> {party.phone}
                    </div>
                  )}
                  {party.advocateName && (
                    <p className="text-xs text-muted-foreground">
                      Advocate: {party.advocateName} {party.advocatePhone ? `(${party.advocatePhone})` : ""}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// Banking / Loan section
// ============================================================
function BankingLoanSection({ caseId, caseData, onUpdate }: any) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    loanType: caseData.loanType || "",
    loanAccountNumber: caseData.loanAccountNumber || "",
    principalAmount: caseData.principalAmount?.toString() || "",
    interestRate: caseData.interestRate?.toString() || "",
    penalInterestRate: caseData.penalInterestRate?.toString() || "",
    interestRests: caseData.interestRests || "QUARTERLY",
    loanDisbursementDate: caseData.loanDisbursementDate?.slice(0, 10) || "",
    loanDueDate: caseData.loanDueDate?.slice(0, 10) || "",
    salaryDeductionApplicable: !!caseData.salaryDeductionApplicable,
    cheatingClauseApplicable: !!caseData.cheatingClauseApplicable,
  });

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success("Banking details saved");
        onUpdate();
      } else {
        const e = await res.json();
        toast.error(e.error || "Save failed");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Banking / Loan Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>Loan Type</Label>
            <Select
              value={form.loanType}
              onValueChange={(v) => setForm({ ...form, loanType: v })}
            >
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {["ATL","OD","CC","TL","HL","VL","PL","GL","EL","MSME","AGRI","KCC","SARFAESI","CREDIT_CARD","OTHER"].map((lt) => (
                  <SelectItem key={lt} value={lt}>{lt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Loan Account Number</Label>
            <Input value={form.loanAccountNumber} onChange={(e) => setForm({ ...form, loanAccountNumber: e.target.value })} />
          </div>
          <div>
            <Label>Principal (₹)</Label>
            <Input type="number" value={form.principalAmount} onChange={(e) => setForm({ ...form, principalAmount: e.target.value })} />
          </div>
          <div>
            <Label>Interest Rate (% p.a.)</Label>
            <Input type="number" step="0.01" value={form.interestRate} onChange={(e) => setForm({ ...form, interestRate: e.target.value })} />
          </div>
          <div>
            <Label>Penal Interest Rate (% p.a.)</Label>
            <Input type="number" step="0.01" value={form.penalInterestRate} onChange={(e) => setForm({ ...form, penalInterestRate: e.target.value })} />
          </div>
          <div>
            <Label>Interest Rests</Label>
            <Select value={form.interestRests} onValueChange={(v) => setForm({ ...form, interestRests: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="MONTHLY">Monthly</SelectItem>
                <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                <SelectItem value="HALF_YEARLY">Half-Yearly</SelectItem>
                <SelectItem value="YEARLY">Yearly</SelectItem>
                <SelectItem value="SIMPLE">Simple Interest</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Disbursement Date</Label>
            <Input type="date" value={form.loanDisbursementDate} onChange={(e) => setForm({ ...form, loanDisbursementDate: e.target.value })} />
          </div>
          <div>
            <Label>Due Date</Label>
            <Input type="date" value={form.loanDueDate} onChange={(e) => setForm({ ...form, loanDueDate: e.target.value })} />
          </div>
        </div>

        <div className="flex gap-6 pt-2 border-t">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.salaryDeductionApplicable}
              onChange={(e) => setForm({ ...form, salaryDeductionApplicable: e.target.checked })}
            />
            Salary Deduction Clause Applicable
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.cheatingClauseApplicable}
              onChange={(e) => setForm({ ...form, cheatingClauseApplicable: e.target.checked })}
            />
            Cheating / Fraud Clause Applicable (Sec 420 IPC / 318 BNS)
          </label>
        </div>

        <div className="flex gap-2 pt-2">
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Banking Details
          </Button>
          <Link href={`/statement-of-accounts?caseId=${caseId}`}>
            <Button variant="outline">Open Statement of A/c →</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Appeal section
// ============================================================
function AppealSection({ caseId, caseData, onUpdate }: any) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    appealStatus: caseData.appealStatus || "NONE",
    appealCourt: caseData.appealCourt || "",
    appealNumber: caseData.appealNumber || "",
    appealDate: caseData.appealDate?.slice(0, 10) || "",
    appealNotes: caseData.appealNotes || "",
  });

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success("Appeal details saved");
        onUpdate();
      } else {
        const e = await res.json();
        toast.error(e.error || "Save failed");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Appeal / Revision Tracking</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>Appeal Status</Label>
            <Select value={form.appealStatus} onValueChange={(v) => setForm({ ...form, appealStatus: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">None</SelectItem>
                <SelectItem value="CONTEMPLATED">Contemplated</SelectItem>
                <SelectItem value="FILED">Filed</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="ALLOWED">Allowed</SelectItem>
                <SelectItem value="DISMISSED">Dismissed</SelectItem>
                <SelectItem value="WITHDRAWN">Withdrawn</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Appellate Court</Label>
            <Input value={form.appealCourt} onChange={(e) => setForm({ ...form, appealCourt: e.target.value })} placeholder="e.g., High Court of Kerala" />
          </div>
          <div>
            <Label>Appeal Number</Label>
            <Input value={form.appealNumber} onChange={(e) => setForm({ ...form, appealNumber: e.target.value })} placeholder="e.g., RFA 123/2025" />
          </div>
          <div>
            <Label>Appeal Filing Date</Label>
            <Input type="date" value={form.appealDate} onChange={(e) => setForm({ ...form, appealDate: e.target.value })} />
          </div>
        </div>
        <div>
          <Label>Appeal Notes</Label>
          <Textarea rows={4} value={form.appealNotes} onChange={(e) => setForm({ ...form, appealNotes: e.target.value })} />
        </div>
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Appeal Details
        </Button>
      </CardContent>
    </Card>
  );
}
