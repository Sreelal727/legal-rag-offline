"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Calendar, FileText, Users, BookOpen, Scale, RefreshCw, Loader2 } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";

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
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{caseData.caseNumber}</h1>
            <Badge>{caseData.status}</Badge>
            <Badge variant="outline">{caseData.priority}</Badge>
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
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-2">
            <p className="text-sm"><strong>Documents:</strong> {caseData.documents?.length || 0}</p>
            <p className="text-sm"><strong>Events:</strong> {caseData.caseEvents?.length || 0}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="parties">
        <TabsList>
          <TabsTrigger value="parties">Parties & Team</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="diary">Diary</TabsTrigger>
        </TabsList>

        <TabsContent value="parties" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Parties</CardTitle></CardHeader>
              <CardContent>
                {caseData.caseClients?.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No parties linked</p>
                ) : (
                  <div className="space-y-2">
                    {caseData.caseClients?.map((cc: any) => (
                      <div key={cc.id} className="flex justify-between items-center p-2 border rounded">
                        <Link href={`/clients/${cc.client.id}`} className="text-sm font-medium hover:underline">{cc.client.name}</Link>
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
