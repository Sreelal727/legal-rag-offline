"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Download,
  RefreshCw,
  Scale,
  Loader2,
  ExternalLink,
  Calendar,
  User,
  FileText,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const COURTS = [
  { key: "PALAKKAD_DISTRICT", label: "Palakkad District Court" },
  { key: "KERALA_HIGH_COURT", label: "Kerala High Court" },
];

const CASE_TYPES_DISTRICT = [
  "CS", "CC", "SC", "OS", "AS", "EP", "MC", "OP", "WP", "CMP", "Crl.A", "MCA",
];

interface CaseStatus {
  cnrNumber: string;
  caseNumber: string;
  caseType: string;
  filingDate: string;
  courtName: string;
  judge: string;
  status: string;
  nextHearingDate: string | null;
  petitioner: string;
  respondent: string;
  petitionerAdvocate: string;
  respondentAdvocate: string;
  acts: string[];
  hearingHistory: { date: string; judge: string; businessOnDate: string; purpose: string }[];
  orders: { date: string; description: string }[];
}

interface SearchResult {
  cnrNumber: string;
  caseNumber: string;
  caseType: string;
  year: string;
  petitioner: string;
  respondent: string;
  status: string;
  court: string;
}

export default function ECourtsPage() {
  const [cnrInput, setCnrInput] = useState("");
  const [caseStatus, setCaseStatus] = useState<CaseStatus | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [causeList, setCauseList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  // Search form state
  const [selectedCourt, setSelectedCourt] = useState("PALAKKAD_DISTRICT");
  const [searchType, setSearchType] = useState("caseNumber");
  const [searchCaseType, setSearchCaseType] = useState("CS");
  const [searchCaseNumber, setSearchCaseNumber] = useState("");
  const [searchYear, setSearchYear] = useState(new Date().getFullYear().toString());
  const [searchPartyName, setSearchPartyName] = useState("");
  const [searchAdvocateName, setSearchAdvocateName] = useState("");
  const [causeListDate, setCauseListDate] = useState("");

  const handleCNRLookup = async () => {
    if (!cnrInput.trim()) return;
    setLoading(true);
    setCaseStatus(null);
    try {
      const res = await fetch("/api/ecourts/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cnrNumber: cnrInput.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setCaseStatus(data);
      } else {
        toast.error(data.error || "Lookup failed");
      }
    } catch {
      toast.error("Failed to connect to eCourts");
    }
    setLoading(false);
  };

  const handleSearch = async () => {
    setLoading(true);
    setSearchResults([]);
    try {
      const body: any = { searchType, court: selectedCourt, year: searchYear };
      if (searchType === "caseNumber") {
        body.caseType = searchCaseType;
        body.caseNumber = searchCaseNumber;
      } else if (searchType === "partyName") {
        body.partyName = searchPartyName;
      } else if (searchType === "advocateName") {
        body.advocateName = searchAdvocateName;
      }

      const res = await fetch("/api/ecourts/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
      if (Array.isArray(data) && data.length === 0) {
        toast.info("No results found");
      }
    } catch {
      toast.error("Search failed");
    }
    setLoading(false);
  };

  const handleCauseList = async () => {
    if (!causeListDate) return;
    setLoading(true);
    setCauseList([]);
    try {
      // Convert YYYY-MM-DD to DD-MM-YYYY
      const [y, m, d] = causeListDate.split("-");
      const formattedDate = `${d}-${m}-${y}`;

      const res = await fetch("/api/ecourts/cause-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ court: selectedCourt, date: formattedDate }),
      });
      const data = await res.json();
      setCauseList(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to fetch cause list");
    }
    setLoading(false);
  };

  const handleImport = async (cnrNumber: string) => {
    setImporting(true);
    try {
      const res = await fetch("/api/ecourts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cnrNumber }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Case imported successfully");
      } else if (res.status === 409) {
        toast.info("Case already exists in system");
      } else {
        toast.error(data.error || "Import failed");
      }
    } catch {
      toast.error("Import failed");
    }
    setImporting(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Scale className="h-8 w-8" /> eCourts / DCMS
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Search and import cases from District Court Management System
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
        <AlertCircle className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          Connected to: <strong>Palakkad District Court</strong> &amp; <strong>Kerala High Court</strong> (ecourts.gov.in)
        </span>
      </div>

      <Tabs defaultValue="cnr">
        <TabsList>
          <TabsTrigger value="cnr">CNR Lookup</TabsTrigger>
          <TabsTrigger value="search">Case Search</TabsTrigger>
          <TabsTrigger value="causelist">Cause List</TabsTrigger>
        </TabsList>

        {/* CNR Lookup */}
        <TabsContent value="cnr" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lookup by CNR Number</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter CNR Number (e.g., KLPK010000012024)"
                  value={cnrInput}
                  onChange={(e) => setCnrInput(e.target.value.toUpperCase())}
                  className="font-mono"
                />
                <Button onClick={handleCNRLookup} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                CNR (Case Number Record) is a unique 16-character identifier assigned by eCourts
              </p>
            </CardContent>
          </Card>

          {caseStatus && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {caseStatus.caseNumber || caseStatus.cnrNumber}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge>{caseStatus.status || "N/A"}</Badge>
                    <Button
                      size="sm"
                      onClick={() => handleImport(caseStatus.cnrNumber)}
                      disabled={importing}
                    >
                      {importing ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <Download className="mr-1 h-3 w-3" />
                      )}
                      Import to System
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Case Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm"><strong>CNR:</strong> <span className="font-mono">{caseStatus.cnrNumber}</span></p>
                    <p className="text-sm"><strong>Case Type:</strong> {caseStatus.caseType}</p>
                    <p className="text-sm"><strong>Filing Date:</strong> {caseStatus.filingDate || "N/A"}</p>
                    <p className="text-sm"><strong>Court:</strong> {caseStatus.courtName}</p>
                    <p className="text-sm"><strong>Judge:</strong> {caseStatus.judge || "N/A"}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm">
                      <strong>Next Hearing:</strong>{" "}
                      {caseStatus.nextHearingDate ? (
                        <Badge variant="outline">
                          <Calendar className="mr-1 h-3 w-3" />
                          {caseStatus.nextHearingDate}
                        </Badge>
                      ) : "N/A"}
                    </p>
                    {caseStatus.acts.length > 0 && (
                      <div className="text-sm">
                        <strong>Acts:</strong>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {caseStatus.acts.map((act, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">{act}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Parties */}
                <div className="border-t pt-3 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">PETITIONER</p>
                    <p className="text-sm flex items-center gap-1"><User className="h-3 w-3" /> {caseStatus.petitioner || "N/A"}</p>
                    {caseStatus.petitionerAdvocate && (
                      <p className="text-xs text-muted-foreground">Adv. {caseStatus.petitionerAdvocate}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">RESPONDENT</p>
                    <p className="text-sm flex items-center gap-1"><User className="h-3 w-3" /> {caseStatus.respondent || "N/A"}</p>
                    {caseStatus.respondentAdvocate && (
                      <p className="text-xs text-muted-foreground">Adv. {caseStatus.respondentAdvocate}</p>
                    )}
                  </div>
                </div>

                {/* Hearing History */}
                {caseStatus.hearingHistory.length > 0 && (
                  <div className="border-t pt-3">
                    <h4 className="text-sm font-medium mb-2">Hearing History</h4>
                    <div className="space-y-1 max-h-60 overflow-y-auto">
                      {caseStatus.hearingHistory.map((h, i) => (
                        <div key={i} className="flex items-center justify-between p-2 border rounded text-sm">
                          <div>
                            <span className="font-mono">{h.date}</span>
                            <span className="text-muted-foreground ml-2">{h.purpose}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{h.judge}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Orders */}
                {caseStatus.orders.length > 0 && (
                  <div className="border-t pt-3">
                    <h4 className="text-sm font-medium mb-2">Orders</h4>
                    <div className="space-y-1">
                      {caseStatus.orders.map((o, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 border rounded text-sm">
                          <FileText className="h-3 w-3 text-muted-foreground" />
                          <span className="font-mono">{o.date}</span>
                          <span>{o.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Case Search */}
        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Search Cases</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Court</Label>
                  <Select value={selectedCourt} onValueChange={(v: any) => setSelectedCourt(String(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COURTS.map((c) => (
                        <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Search By</Label>
                  <Select value={searchType} onValueChange={(v: any) => setSearchType(String(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="caseNumber">Case Number</SelectItem>
                      <SelectItem value="partyName">Party Name</SelectItem>
                      <SelectItem value="advocateName">Advocate Name</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {searchType === "caseNumber" && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Case Type</Label>
                    <Select value={searchCaseType} onValueChange={(v: any) => setSearchCaseType(String(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CASE_TYPES_DISTRICT.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Case Number</Label>
                    <Input value={searchCaseNumber} onChange={(e) => setSearchCaseNumber(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Year</Label>
                    <Input value={searchYear} onChange={(e) => setSearchYear(e.target.value)} />
                  </div>
                </div>
              )}

              {searchType === "partyName" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Party Name</Label>
                    <Input
                      value={searchPartyName}
                      onChange={(e) => setSearchPartyName(e.target.value)}
                      placeholder="Enter petitioner or respondent name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Year (optional)</Label>
                    <Input value={searchYear} onChange={(e) => setSearchYear(e.target.value)} />
                  </div>
                </div>
              )}

              {searchType === "advocateName" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Advocate Name</Label>
                    <Input
                      value={searchAdvocateName}
                      onChange={(e) => setSearchAdvocateName(e.target.value)}
                      placeholder="Enter advocate name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Year (optional)</Label>
                    <Input value={searchYear} onChange={(e) => setSearchYear(e.target.value)} />
                  </div>
                </div>
              )}

              <Button onClick={handleSearch} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                Search eCourts
              </Button>
            </CardContent>
          </Card>

          {searchResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Results ({searchResults.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {searchResults.map((result, i) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded hover:bg-muted/50">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-medium">{result.caseNumber}</span>
                          <Badge variant="outline">{result.caseType}</Badge>
                          {result.status && <Badge variant="secondary">{result.status}</Badge>}
                        </div>
                        <p className="text-sm">
                          {result.petitioner} vs {result.respondent}
                        </p>
                        {result.cnrNumber && (
                          <p className="text-xs text-muted-foreground font-mono">CNR: {result.cnrNumber}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {result.cnrNumber && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setCnrInput(result.cnrNumber);
                                handleCNRLookup();
                              }}
                            >
                              <Search className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleImport(result.cnrNumber)}
                              disabled={importing}
                            >
                              <Download className="mr-1 h-3 w-3" /> Import
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Cause List */}
        <TabsContent value="causelist" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Daily Cause List</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-end">
                <div className="space-y-2">
                  <Label>Court</Label>
                  <Select value={selectedCourt} onValueChange={(v: any) => setSelectedCourt(String(v))}>
                    <SelectTrigger className="w-60"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COURTS.map((c) => (
                        <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={causeListDate} onChange={(e) => setCauseListDate(e.target.value)} />
                </div>
                <Button onClick={handleCauseList} disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calendar className="mr-2 h-4 w-4" />}
                  Fetch Cause List
                </Button>
              </div>
            </CardContent>
          </Card>

          {causeList.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cause List ({causeList.length} items)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {causeList.map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{item.serialNumber || i + 1}</Badge>
                          <span className="font-mono text-sm font-medium">{item.caseNumber}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{item.parties}</p>
                      </div>
                      <div className="text-right text-sm">
                        {item.purpose && <Badge variant="secondary">{item.purpose}</Badge>}
                        {item.courtRoom && <p className="text-xs text-muted-foreground mt-1">{item.courtRoom}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
