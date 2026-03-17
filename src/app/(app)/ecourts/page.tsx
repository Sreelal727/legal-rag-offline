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
  CheckCircle2,
  XCircle,
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

interface MyCasesResult {
  cnrNumber: string;
  caseNumber: string;
  caseType: string;
  year: string;
  petitioner: string;
  respondent: string;
  status: string;
  court: string;
  alreadyImported: boolean;
}

interface MyCasesResponse {
  advocateName: string;
  court: string;
  results: MyCasesResult[];
  total: number;
  alreadyImported: number;
  newCases: number;
}

interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  failed: number;
  total: number;
}

export default function ECourtsPage() {
  const [cnrInput, setCnrInput] = useState("");
  const [caseStatus, setCaseStatus] = useState<CaseStatus | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [causeList, setCauseList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  // My Cases state
  const [myCasesLoading, setMyCasesLoading] = useState(false);
  const [myCasesImporting, setMyCasesImporting] = useState(false);
  const [myCasesData, setMyCasesData] = useState<MyCasesResponse | null>(null);
  const [myCasesImportResult, setMyCasesImportResult] = useState<ImportResult | null>(null);
  const [myCasesCourt, setMyCasesCourt] = useState("PALAKKAD_DISTRICT");
  const [myCasesAdvName, setMyCasesAdvName] = useState("");
  const [myCasesYear, setMyCasesYear] = useState("");
  const [selectedCnrs, setSelectedCnrs] = useState<Set<string>>(new Set());

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

  const handleFetchMyCases = async () => {
    if (!myCasesAdvName.trim()) {
      toast.error("Please enter advocate name");
      return;
    }
    setMyCasesLoading(true);
    setMyCasesData(null);
    setMyCasesImportResult(null);
    setSelectedCnrs(new Set());
    try {
      const res = await fetch("/api/ecourts/my-cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          court: myCasesCourt,
          advocateName: myCasesAdvName.trim(),
          year: myCasesYear || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMyCasesData(data);
        // Auto-select all new cases
        const newCnrs = (data.results || [])
          .filter((r: MyCasesResult) => !r.alreadyImported && r.cnrNumber)
          .map((r: MyCasesResult) => r.cnrNumber);
        setSelectedCnrs(new Set(newCnrs));
        if (data.total === 0) {
          toast.info("No cases found in DCMS for this advocate name");
        }
      } else {
        toast.error(data.error || "Failed to fetch cases from DCMS");
      }
    } catch {
      toast.error("Failed to connect to eCourts");
    }
    setMyCasesLoading(false);
  };

  const toggleCnrSelection = (cnr: string) => {
    setSelectedCnrs((prev) => {
      const next = new Set(prev);
      if (next.has(cnr)) {
        next.delete(cnr);
      } else {
        next.add(cnr);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!myCasesData) return;
    const newCnrs = myCasesData.results
      .filter((r) => !r.alreadyImported && r.cnrNumber)
      .map((r) => r.cnrNumber);
    if (selectedCnrs.size === newCnrs.length) {
      setSelectedCnrs(new Set());
    } else {
      setSelectedCnrs(new Set(newCnrs));
    }
  };

  const handleImportSelected = async () => {
    if (selectedCnrs.size === 0) {
      toast.error("Please select at least one case to import");
      return;
    }
    setMyCasesImporting(true);
    setMyCasesImportResult(null);
    try {
      const res = await fetch("/api/ecourts/my-cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          court: myCasesCourt,
          advocateName: myCasesAdvName.trim(),
          year: myCasesYear || undefined,
          importCnrs: Array.from(selectedCnrs),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMyCasesImportResult(data);
        toast.success(`Imported ${data.imported} cases successfully`);
        // Refresh the preview
        handleFetchMyCases();
      } else {
        toast.error(data.error || "Import failed");
      }
    } catch {
      toast.error("Import failed");
    }
    setMyCasesImporting(false);
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

      <Tabs defaultValue="mycases">
        <TabsList>
          <TabsTrigger value="mycases">My Cases</TabsTrigger>
          <TabsTrigger value="cnr">CNR Lookup</TabsTrigger>
          <TabsTrigger value="search">Case Search</TabsTrigger>
          <TabsTrigger value="causelist">Cause List</TabsTrigger>
        </TabsList>

        {/* My Cases */}
        <TabsContent value="mycases" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Find My Cases in DCMS
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Search eCourts/DCMS by your advocate name to find all your cases. Review the results and select which ones to import.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-2">
                  <Label>Advocate Name <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="Name as registered in Bar Council"
                    value={myCasesAdvName}
                    onChange={(e) => setMyCasesAdvName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Court</Label>
                  <Select value={myCasesCourt} onValueChange={(v: any) => setMyCasesCourt(String(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COURTS.map((c) => (
                        <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Year <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input
                    placeholder="e.g., 2024"
                    value={myCasesYear}
                    onChange={(e) => setMyCasesYear(e.target.value)}
                    type="number"
                    min="1990"
                    max={new Date().getFullYear()}
                  />
                </div>
                <Button onClick={handleFetchMyCases} disabled={myCasesLoading || !myCasesAdvName.trim()}>
                  {myCasesLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="mr-2 h-4 w-4" />
                  )}
                  {myCasesLoading ? "Searching DCMS..." : "Search DCMS"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Use your full name as registered with the Bar Council. Adding a year narrows results to cases filed in that year.
              </p>
            </CardContent>
          </Card>

          {myCasesData && (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      Cases for Adv. {myCasesData.advocateName}
                    </CardTitle>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">{myCasesData.total} Total</Badge>
                      <Badge variant="outline" className="text-green-600 border-green-300">
                        {myCasesData.newCases} New
                      </Badge>
                      <Badge variant="outline" className="text-muted-foreground">
                        {myCasesData.alreadyImported} Already Imported
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {myCasesData.newCases > 0 && (
                    <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950 rounded-lg mb-4">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedCnrs.size > 0 && selectedCnrs.size === myCasesData.results.filter((r) => !r.alreadyImported && r.cnrNumber).length}
                          onChange={toggleSelectAll}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <p className="text-sm">
                          <strong>{selectedCnrs.size}</strong> of {myCasesData.newCases} new cases selected
                        </p>
                      </div>
                      <Button onClick={handleImportSelected} disabled={myCasesImporting || selectedCnrs.size === 0}>
                        {myCasesImporting ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="mr-2 h-4 w-4" />
                        )}
                        {myCasesImporting ? "Importing..." : `Import ${selectedCnrs.size} Selected`}
                      </Button>
                    </div>
                  )}

                  {myCasesData.results.map((result, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-3 p-3 border rounded hover:bg-muted/50 ${
                        result.alreadyImported ? "opacity-60" : ""
                      }`}
                    >
                      {/* Checkbox for new cases */}
                      {!result.alreadyImported && result.cnrNumber ? (
                        <input
                          type="checkbox"
                          checked={selectedCnrs.has(result.cnrNumber)}
                          onChange={() => toggleCnrSelection(result.cnrNumber)}
                          className="h-4 w-4 rounded border-gray-300 shrink-0"
                        />
                      ) : (
                        <div className="w-4 shrink-0" />
                      )}
                      <div className="flex-1 space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-medium">
                            {result.caseNumber || result.cnrNumber}
                          </span>
                          {result.caseType && <Badge variant="outline">{result.caseType}</Badge>}
                          {result.status && <Badge variant="secondary">{result.status}</Badge>}
                          {result.alreadyImported ? (
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                              <CheckCircle2 className="mr-1 h-3 w-3" /> Imported
                            </Badge>
                          ) : (
                            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                              New
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm">
                          {result.petitioner || "Unknown"} vs {result.respondent || "Unknown"}
                        </p>
                        {result.cnrNumber && (
                          <p className="text-xs text-muted-foreground font-mono">
                            CNR: {result.cnrNumber}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {myCasesImportResult && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Import Complete
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-2xl font-bold">{myCasesImportResult.total}</p>
                        <p className="text-xs text-muted-foreground">Selected</p>
                      </div>
                      <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">{myCasesImportResult.imported}</p>
                        <p className="text-xs text-muted-foreground">Imported</p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-2xl font-bold">{myCasesImportResult.skipped}</p>
                        <p className="text-xs text-muted-foreground">Skipped</p>
                      </div>
                      <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                        <p className="text-2xl font-bold text-red-600">{myCasesImportResult.failed}</p>
                        <p className="text-xs text-muted-foreground">Failed</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

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
