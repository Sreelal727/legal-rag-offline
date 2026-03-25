"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Upload, Loader2, FileText, CheckCircle2, XCircle, AlertTriangle,
  ArrowDown, Play, Download, Eye, ChevronDown, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { RoleGate } from "@/components/role-gate";
import { format } from "date-fns";

interface PropertyDoc {
  id: string;
  documentType: string;
  classification: string | null;
  extractedText: string | null;
  extractedFields: string | null;
  language: string | null;
  ocrRequired: boolean;
  ocrCompleted: boolean;
  verificationStatus: string | null;
  verificationNotes: string | null;
  fileName: string | null;
  filePath: string | null;
  pageRange: string | null;
  notes: string | null;
  sortOrder: number;
}

interface DeedNode {
  id: string;
  documentNumber: string | null;
  registrationYear: number | null;
  sroName: string | null;
  executionDate: string | null;
  registrationDate: string | null;
  deedType: string | null;
  grantor: string | null;
  grantee: string | null;
  surveyNumbers: string | null;
  area: number | null;
  areaUnit: string | null;
  areaOriginal: string | null;
  consideration: number | null;
  isMissing: boolean;
  isLatest: boolean;
  chainDepth: number;
  parentNodeIds: string | null;
  verificationFlags: string | null;
  notes: string | null;
}

interface ScrutinyReport {
  id: string;
  title: string;
  referenceNumber: string | null;
  bankName: string | null;
  branchName: string | null;
  borrowerName: string | null;
  propertyAddress: string | null;
  surveyNumbers: string | null;
  status: string;
  processingStatus: string | null;
  reportContent: string | null;
  reportNotes: string | null;
  verificationData: string | null;
  createdAt: string;
  updatedAt: string;
  creator: { id: string; name: string; role: string };
  case: { id: string; caseNumber: string; title: string } | null;
  client: { id: string; name: string } | null;
  propertyDocuments: PropertyDoc[];
  deedChainNodes: DeedNode[];
}

const TABS = ["Overview", "Documents", "Deed Chain", "Verification", "Area Tracking", "Report"];

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-500",
  PROCESSING: "bg-blue-500",
  REVIEW: "bg-yellow-500",
  APPROVED: "bg-green-500",
  EXPORTED: "bg-purple-500",
};

const verificationStatusIcon: Record<string, React.ReactNode> = {
  PASS: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  FAIL: <XCircle className="h-4 w-4 text-red-500" />,
  WARNING: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
  MANUAL_CHECK: <Eye className="h-4 w-4 text-blue-500" />,
};

export default function ScrutinyDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [report, setReport] = useState<ScrutinyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Overview");
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<PropertyDoc | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchReport = useCallback(async () => {
    try {
      const res = await fetch(`/api/scrutiny/${id}`);
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      setReport(data);
    } catch {
      toast.error("Failed to load report");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchReport();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchReport]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }

    try {
      const res = await fetch(`/api/scrutiny/${id}/upload`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      const data = await res.json();
      toast.success(`${data.documents.length} document(s) uploaded`);
      fetchReport();
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleProcess = async () => {
    setProcessing(true);
    try {
      const res = await fetch(`/api/scrutiny/${id}/process`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      toast.success("Processing started");
      // Poll for status
      pollRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/scrutiny/${id}/status`);
          const status = await statusRes.json();
          setReport((prev) => prev ? { ...prev, processingStatus: JSON.stringify(status), status: status.currentStep === "completed" ? "REVIEW" : "PROCESSING" } : prev);
          if (status.currentStep === "completed" || status.error) {
            if (pollRef.current) clearInterval(pollRef.current);
            setProcessing(false);
            fetchReport();
            if (status.error) toast.error(`Processing failed: ${status.error}`);
            else toast.success("Processing complete!");
          }
        } catch {
          // continue polling
        }
      }, 3000);
    } catch (err: any) {
      toast.error(err.message || "Failed to start processing");
      setProcessing(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/scrutiny/${id}/generate`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      toast.success("Report generated");
      fetchReport();
    } catch (err: any) {
      toast.error(err.message || "Failed to generate report");
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = async (format: string) => {
    try {
      const res = await fetch(`/api/scrutiny/${id}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format }),
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `scrutiny-report-${id}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch {
      toast.error("Export failed");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!report) {
    return <div className="text-center py-12 text-muted-foreground">Report not found</div>;
  }

  const processingStatus = report.processingStatus ? JSON.parse(report.processingStatus) : null;
  const verificationData = report.verificationData ? JSON.parse(report.verificationData) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{report.title}</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
            {report.bankName && <span>{report.bankName}{report.branchName && ` - ${report.branchName}`}</span>}
            {report.borrowerName && <span>Borrower: {report.borrowerName}</span>}
            {report.referenceNumber && <span>Ref: {report.referenceNumber}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={statusColors[report.status] || "bg-gray-500"}>{report.status}</Badge>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "Overview" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-sm">Documents</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{report.propertyDocuments.length}</p>
              <p className="text-sm text-muted-foreground">uploaded documents</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Deed Chain</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{report.deedChainNodes.length}</p>
              <p className="text-sm text-muted-foreground">
                {report.deedChainNodes.filter((n) => n.isMissing).length} missing
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Verification</CardTitle></CardHeader>
            <CardContent>
              {verificationData ? (
                <>
                  <p className="text-3xl font-bold">
                    {verificationData.filter((v: any) => v.status === "PASS").length}/{verificationData.length}
                  </p>
                  <p className="text-sm text-muted-foreground">checks passed</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Not yet verified</p>
              )}
            </CardContent>
          </Card>

          {/* Processing progress */}
          {processingStatus && report.status === "PROCESSING" && (
            <Card className="col-span-full">
              <CardHeader><CardTitle className="text-sm">Processing Progress</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {processingStatus.steps?.map((step: any, i: number) => (
                    <div key={i} className="flex items-center gap-3">
                      {step.status === "completed" ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : step.status === "running" ? (
                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                      ) : step.status === "failed" ? (
                        <XCircle className="h-4 w-4 text-red-500" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-muted" />
                      )}
                      <span className={`text-sm ${step.status === "running" ? "font-medium" : ""}`}>
                        {step.step}
                      </span>
                      {step.status === "running" && (
                        <span className="text-xs text-muted-foreground">{step.message}</span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <Card className="col-span-full">
            <CardHeader><CardTitle className="text-sm">Actions</CardTitle></CardHeader>
            <CardContent className="flex gap-3">
              <RoleGate permission="scrutiny:write">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.docx,.doc,.jpg,.jpeg,.png,.tiff,.tif"
                  onChange={handleUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  Upload Documents
                </Button>
                <Button
                  onClick={handleProcess}
                  disabled={processing || report.propertyDocuments.length === 0}
                >
                  {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                  Process Bundle
                </Button>
              </RoleGate>
            </CardContent>
          </Card>

          {/* Report metadata */}
          <Card className="col-span-full">
            <CardHeader><CardTitle className="text-sm">Details</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><span className="text-muted-foreground">Property Address:</span><br />{report.propertyAddress || "—"}</div>
                <div><span className="text-muted-foreground">Survey Numbers:</span><br />{report.surveyNumbers ? JSON.parse(report.surveyNumbers).join(", ") : "—"}</div>
                <div><span className="text-muted-foreground">Created by:</span><br />{report.creator.name}</div>
                <div><span className="text-muted-foreground">Created:</span><br />{format(new Date(report.createdAt), "dd MMM yyyy")}</div>
                {report.case && <div><span className="text-muted-foreground">Case:</span><br />{report.case.caseNumber}</div>}
                {report.client && <div><span className="text-muted-foreground">Client:</span><br />{report.client.name}</div>}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "Documents" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {report.propertyDocuments.length} documents in bundle
            </p>
            <RoleGate permission="scrutiny:write">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.doc,.jpg,.jpeg,.png,.tiff,.tif"
                onChange={handleUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Upload More
              </Button>
            </RoleGate>
          </div>

          {report.propertyDocuments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No documents uploaded yet</p>
                <p className="text-sm text-muted-foreground">Upload the document bundle to get started</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {report.propertyDocuments.map((doc) => {
                const fields = doc.extractedFields ? JSON.parse(doc.extractedFields) : null;
                const isExpanded = selectedDoc?.id === doc.id;
                return (
                  <Card key={doc.id}>
                    <div
                      className="flex items-center gap-4 p-4 cursor-pointer"
                      onClick={() => setSelectedDoc(isExpanded ? null : doc)}
                    >
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{doc.fileName || `Document ${doc.sortOrder + 1}`}</p>
                        {doc.pageRange && <p className="text-xs text-muted-foreground">Pages: {doc.pageRange}</p>}
                      </div>
                      <Badge variant="outline" className="text-xs">{doc.documentType}</Badge>
                      {doc.language && doc.language !== "en" && (
                        <Badge variant="outline" className="text-xs">{doc.language === "ml" ? "Malayalam" : "Mixed"}</Badge>
                      )}
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          doc.verificationStatus === "VERIFIED" ? "border-green-500 text-green-500" :
                          doc.verificationStatus === "FLAGGED" ? "border-red-500 text-red-500" :
                          "border-muted"
                        }`}
                      >
                        {doc.verificationStatus || "PENDING"}
                      </Badge>
                    </div>
                    {isExpanded && (
                      <CardContent className="border-t pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {fields && (
                            <div>
                              <h4 className="text-sm font-medium mb-2">Extracted Fields</h4>
                              <div className="space-y-1 text-sm">
                                {fields.documentNumber && <div><span className="text-muted-foreground">Doc No:</span> {fields.documentNumber}</div>}
                                {fields.registrationYear && <div><span className="text-muted-foreground">Year:</span> {fields.registrationYear}</div>}
                                {fields.sroName && <div><span className="text-muted-foreground">SRO:</span> {fields.sroName}</div>}
                                {fields.deedType && <div><span className="text-muted-foreground">Type:</span> {fields.deedType}</div>}
                                {fields.grantor?.length > 0 && <div><span className="text-muted-foreground">Grantor:</span> {fields.grantor.join(", ")}</div>}
                                {fields.grantee?.length > 0 && <div><span className="text-muted-foreground">Grantee:</span> {fields.grantee.join(", ")}</div>}
                                {fields.area && <div><span className="text-muted-foreground">Area:</span> {fields.area.original}</div>}
                                {fields.consideration && <div><span className="text-muted-foreground">Consideration:</span> Rs. {fields.consideration.toLocaleString()}</div>}
                                {fields.surveyNumbers?.length > 0 && <div><span className="text-muted-foreground">Survey No:</span> {fields.surveyNumbers.join(", ")}</div>}
                              </div>
                            </div>
                          )}
                          <div>
                            <h4 className="text-sm font-medium mb-2">Extracted Text (preview)</h4>
                            <pre className="text-xs bg-muted p-3 rounded max-h-48 overflow-y-auto whitespace-pre-wrap">
                              {doc.extractedText?.substring(0, 1000) || "No text extracted"}
                            </pre>
                          </div>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "Deed Chain" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Title chain showing ownership flow from latest to earliest deed
          </p>
          {report.deedChainNodes.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ArrowDown className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No deed chain built yet</p>
                <p className="text-sm text-muted-foreground">Process the document bundle first</p>
              </CardContent>
            </Card>
          ) : (
            <div className="relative pl-8">
              {/* Vertical line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

              {report.deedChainNodes
                .sort((a, b) => a.chainDepth - b.chainDepth)
                .map((node, i) => {
                  const grantor = node.grantor ? JSON.parse(node.grantor) : [];
                  const grantee = node.grantee ? JSON.parse(node.grantee) : [];
                  const flags = node.verificationFlags ? JSON.parse(node.verificationFlags) : [];

                  return (
                    <div key={node.id} className="relative mb-6">
                      {/* Node dot */}
                      <div
                        className={`absolute -left-4 top-4 w-4 h-4 rounded-full border-2 ${
                          node.isMissing
                            ? "bg-red-500 border-red-600"
                            : node.isLatest
                            ? "bg-primary border-primary"
                            : flags.length > 0
                            ? "bg-yellow-500 border-yellow-600"
                            : "bg-green-500 border-green-600"
                        }`}
                      />

                      <Card className={node.isMissing ? "border-red-500/50 bg-red-500/5" : flags.length > 0 ? "border-yellow-500/50" : ""}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">
                                  {node.isMissing ? "MISSING DEED" : (node.deedType || "Unknown Type")}
                                </p>
                                {node.isLatest && <Badge className="bg-primary text-xs">Latest</Badge>}
                                {node.isMissing && <Badge className="bg-red-500 text-xs">Missing</Badge>}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {node.documentNumber && `Doc No. ${node.documentNumber}`}
                                {node.registrationYear && `/${node.registrationYear}`}
                                {node.sroName && ` of SRO ${node.sroName}`}
                              </p>
                            </div>
                            <div className="text-right text-sm text-muted-foreground">
                              {node.registrationDate && format(new Date(node.registrationDate), "dd MMM yyyy")}
                            </div>
                          </div>

                          {!node.isMissing && (
                            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                              {grantor.length > 0 && (
                                <div><span className="text-muted-foreground">From:</span> {grantor.join(", ")}</div>
                              )}
                              {grantee.length > 0 && (
                                <div><span className="text-muted-foreground">To:</span> {grantee.join(", ")}</div>
                              )}
                              {node.area && (
                                <div><span className="text-muted-foreground">Area:</span> {node.areaOriginal || `${node.area} ${node.areaUnit}`}</div>
                              )}
                              {node.consideration && (
                                <div><span className="text-muted-foreground">Rs.</span> {node.consideration.toLocaleString()}</div>
                              )}
                            </div>
                          )}

                          {flags.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {flags.map((flag: string, fi: number) => (
                                <p key={fi} className="text-xs text-yellow-600 flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" /> {flag}
                                </p>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {activeTab === "Verification" && (
        <div className="space-y-4">
          {!verificationData ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No verification results yet</p>
                <p className="text-sm text-muted-foreground">Process the document bundle to run verifications</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {verificationData.map((v: any) => (
                <Card key={v.id} className={
                  v.status === "FAIL" ? "border-red-500/50" :
                  v.status === "WARNING" ? "border-yellow-500/50" : ""
                }>
                  <CardContent className="flex items-start gap-3 p-4">
                    {verificationStatusIcon[v.status] || <Eye className="h-4 w-4" />}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{v.label}</p>
                        <Badge variant="outline" className="text-xs">{v.category}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{v.message}</p>
                    </div>
                    <Badge
                      className={
                        v.status === "PASS" ? "bg-green-500" :
                        v.status === "FAIL" ? "bg-red-500" :
                        v.status === "WARNING" ? "bg-yellow-500" :
                        "bg-blue-500"
                      }
                    >
                      {v.status}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "Area Tracking" && (
        <div className="space-y-4">
          {report.deedChainNodes.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground">No area data available yet</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3">Deed</th>
                      <th className="text-left p-3">Date</th>
                      <th className="text-left p-3">Type</th>
                      <th className="text-left p-3">From</th>
                      <th className="text-left p-3">To</th>
                      <th className="text-right p-3">Area (cents)</th>
                      <th className="text-left p-3">Flags</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.deedChainNodes
                      .filter((n) => !n.isMissing && n.area)
                      .sort((a, b) => {
                        const da = a.registrationDate ? new Date(a.registrationDate).getTime() : 0;
                        const db = b.registrationDate ? new Date(b.registrationDate).getTime() : 0;
                        return da - db;
                      })
                      .map((node) => {
                        const grantor = node.grantor ? JSON.parse(node.grantor) : [];
                        const grantee = node.grantee ? JSON.parse(node.grantee) : [];
                        const flags = node.verificationFlags ? JSON.parse(node.verificationFlags) : [];
                        const areaFlags = flags.filter((f: string) => f.includes("AREA") || f.includes("area"));

                        return (
                          <tr key={node.id} className={`border-b ${areaFlags.length > 0 ? "bg-red-500/5" : ""}`}>
                            <td className="p-3">{node.documentNumber || "—"}</td>
                            <td className="p-3">{node.registrationDate ? format(new Date(node.registrationDate), "dd/MM/yyyy") : "—"}</td>
                            <td className="p-3">{node.deedType || "—"}</td>
                            <td className="p-3">{grantor.join(", ") || "—"}</td>
                            <td className="p-3">{grantee.join(", ") || "—"}</td>
                            <td className="p-3 text-right font-mono">{node.area?.toFixed(2)}</td>
                            <td className="p-3">
                              {areaFlags.map((f: string, i: number) => (
                                <span key={i} className="text-xs text-red-600 flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" /> {f}
                                </span>
                              ))}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === "Report" && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <RoleGate permission="scrutiny:write">
              <Button onClick={handleGenerate} disabled={generating || report.deedChainNodes.length === 0}>
                {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {report.reportContent ? "Regenerate Report" : "Generate Report"}
              </Button>
            </RoleGate>
            {report.reportContent && (
              <>
                <Button variant="outline" onClick={() => handleExport("docx")}>
                  <Download className="mr-2 h-4 w-4" /> Export DOCX
                </Button>
                <Button variant="outline" onClick={() => handleExport("pdf")}>
                  <Download className="mr-2 h-4 w-4" /> Export PDF
                </Button>
              </>
            )}
            <RoleGate permission="scrutiny:approve">
              {report.status === "REVIEW" && (
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={async () => {
                    await fetch(`/api/scrutiny/${id}/approve`, { method: "POST" });
                    toast.success("Report approved");
                    fetchReport();
                  }}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
                </Button>
              )}
            </RoleGate>
          </div>

          {report.reportContent ? (
            <Card>
              <CardContent className="p-6">
                <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
                  {report.reportContent}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No report generated yet</p>
                <p className="text-sm text-muted-foreground">
                  Process the bundle and build the deed chain first, then generate the report
                </p>
              </CardContent>
            </Card>
          )}

          {/* Lawyer notes */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Lawyer Notes</CardTitle></CardHeader>
            <CardContent>
              <Textarea
                placeholder="Add notes or observations about this report..."
                value={report.reportNotes || ""}
                onChange={(e) => setReport({ ...report, reportNotes: e.target.value })}
                rows={4}
              />
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={async () => {
                  await fetch(`/api/scrutiny/${id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ reportNotes: report.reportNotes }),
                  });
                  toast.success("Notes saved");
                }}
              >
                Save Notes
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
