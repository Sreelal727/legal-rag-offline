"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Phone, Mail, Building2, User, Upload, FileCheck, Loader2, PenLine, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { RoleGate } from "@/components/role-gate";
import Link from "next/link";
import { WhatsAppMessageDialog } from "@/components/whatsapp-message-dialog";

const CLIENT_TYPES = ["INDIVIDUAL", "COMPANY", "GOVERNMENT", "OTHER"];

const CLIENT_TYPE_COLORS: Record<string, string> = {
  INDIVIDUAL: "bg-blue-500 text-white",
  COMPANY: "bg-emerald-500 text-white",
  GOVERNMENT: "bg-amber-500 text-white",
  OTHER: "bg-purple-500 text-white",
};

const DESIGNATIONS = ["S/o", "D/o", "W/o", "R/o"];

interface Client {
  id: string;
  name: string;
  fatherHusbandName: string | null;
  designation: string | null;
  email: string | null;
  phone: string | null;
  alternatePhone: string | null;
  address: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  pincode: string | null;
  clientType: string;
  occupation: string | null;
  dob: string | null;
  age: number | null;
  panNumber: string | null;
  aadharNumber: string | null;
  gstNumber: string | null;
  companyName: string | null;
  cinNumber: string | null;
  notes: string | null;
  isActive: boolean;
  _count: { caseClients: number };
}

interface FormState {
  name: string;
  fatherHusbandName: string;
  designation: string;
  clientType: string;
  email: string;
  phone: string;
  alternatePhone: string;
  address: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  occupation: string;
  dob: string;
  age: string;
  panNumber: string;
  aadharNumber: string;
  gstNumber: string;
  companyName: string;
  cinNumber: string;
  notes: string;
}

const emptyForm: FormState = {
  name: "",
  fatherHusbandName: "",
  designation: "",
  clientType: "INDIVIDUAL",
  email: "",
  phone: "",
  alternatePhone: "",
  address: "",
  city: "",
  district: "",
  state: "",
  pincode: "",
  occupation: "",
  dob: "",
  age: "",
  panNumber: "",
  aadharNumber: "",
  gstNumber: "",
  companyName: "",
  cinNumber: "",
  notes: "",
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [form, setForm] = useState<FormState>({ ...emptyForm });
  const [scanResult, setScanResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handwrittenInputRef = useRef<HTMLInputElement>(null);
  const [scanningHandwritten, setScanningHandwritten] = useState(false);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/clients?search=${encodeURIComponent(search)}`);
    const data = await res.json();
    setClients(data.clients || []);
    setLoading(false);
  }, [search]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const updateField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleIDUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true);
    setScanResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 90000);

      const res = await fetch("/api/ocr/id-proof", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "OCR failed");
      }

      const data = await res.json();
      const ext = data.extracted;

      // Auto-fill form fields from extracted data
      if (ext.name) updateField("name", ext.name);
      if (ext.address) updateField("address", ext.address);
      if (ext.aadhaarNumber) updateField("aadharNumber", ext.aadhaarNumber);
      if (ext.panNumber) updateField("panNumber", ext.panNumber);

      const docType = ext.documentType === "UNKNOWN" ? "document" : ext.documentType.replace(/_/g, " ");
      const fields: string[] = [];
      if (ext.name) fields.push("Name");
      if (ext.aadhaarNumber) fields.push("Aadhaar");
      if (ext.panNumber) fields.push("PAN");
      if (ext.address) fields.push("Address");
      if (ext.voterIdNumber) fields.push("Voter ID");

      if (fields.length > 0) {
        setScanResult(`${docType} detected — extracted: ${fields.join(", ")}`);
        toast.success(`Extracted ${fields.length} field(s) from ${docType}`);
      } else {
        setScanResult("Could not extract fields. Try a clearer image.");
        toast.warning("No fields could be extracted. Please try a clearer photo.");
      }

      // Add extracted info to notes for reference
      const noteLines: string[] = [];
      if (ext.fatherName) noteLines.push(`Father's Name: ${ext.fatherName}`);
      if (ext.dob) noteLines.push(`DOB: ${ext.dob}`);
      if (ext.gender) noteLines.push(`Gender: ${ext.gender}`);
      if (ext.voterIdNumber) noteLines.push(`Voter ID: ${ext.voterIdNumber}`);
      if (noteLines.length > 0) {
        updateField("notes", noteLines.join("\n"));
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        toast.error("Scan timed out. Please try a smaller or clearer image.");
        setScanResult("Scan timed out — try a smaller image");
      } else {
        const message = err instanceof Error ? err.message : "Failed to process ID";
        toast.error(message);
        setScanResult("Scan failed — " + message);
      }
    } finally {
      setScanning(false);
      // Reset file input so same file can be re-uploaded
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleHandwrittenUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanningHandwritten(true);
    setScanResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 90000);

      const res = await fetch("/api/ocr/handwritten", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Handwritten scan failed");
      }

      const data = await res.json();
      const ext = data.extracted;

      // Auto-fill form fields
      const filled: string[] = [];
      if (ext.name) { updateField("name", ext.name); filled.push("Name"); }
      if (ext.email) { updateField("email", ext.email); filled.push("Email"); }
      if (ext.phone) { updateField("phone", ext.phone); filled.push("Phone"); }
      if (ext.address) { updateField("address", ext.address); filled.push("Address"); }
      if (ext.panNumber) { updateField("panNumber", ext.panNumber); filled.push("PAN"); }
      if (ext.aadharNumber) { updateField("aadharNumber", ext.aadharNumber); filled.push("Aadhaar"); }
      if (ext.gstNumber) { updateField("gstNumber", ext.gstNumber); filled.push("GST"); }

      // Put extra info in notes
      const noteLines: string[] = [];
      if (ext.fatherName) noteLines.push(`Father's Name: ${ext.fatherName}`);
      if (ext.dob) noteLines.push(`DOB: ${ext.dob}`);
      if (ext.gender) noteLines.push(`Gender: ${ext.gender}`);
      if (ext.occupation) noteLines.push(`Occupation: ${ext.occupation}`);
      if (ext.notes) noteLines.push(ext.notes);
      if (noteLines.length > 0) {
        updateField("notes", noteLines.join("\n"));
        filled.push("Notes");
      }

      if (filled.length > 0) {
        setScanResult(`Handwritten scan — extracted: ${filled.join(", ")}`);
        toast.success(`Extracted ${filled.length} field(s) from handwritten note`);
      } else {
        setScanResult("Could not extract fields. Try a clearer image with larger writing.");
        toast.warning("No fields could be extracted. Please try a clearer photo.");
      }

      if (data.warning) {
        setScanResult((prev) => prev + " (partial extraction)");
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        toast.error("Scan timed out. Please try a smaller or clearer image.");
        setScanResult("Scan timed out — try a smaller image");
      } else {
        const message = err instanceof Error ? err.message : "Failed to process image";
        toast.error(message);
        setScanResult("Scan failed — " + message);
      }
    } finally {
      setScanningHandwritten(false);
      if (handwrittenInputRef.current) handwrittenInputRef.current.value = "";
    }
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      toast.success("Client created successfully");
      setOpen(false);
      setForm({ ...emptyForm });
      setScanResult(null);
      fetchClients();
    } else {
      toast.error("Failed to create client");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Clients</h1>
        <RoleGate permission="clients:write">
          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v) {
                setForm({ ...emptyForm });
                setScanResult(null);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Add Client
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Client</DialogTitle>
              </DialogHeader>

              {/* Smart Scan Section */}
              <div className="grid grid-cols-2 gap-6">
                {/* ID Proof — hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/bmp,image/tiff"
                  onChange={handleIDUpload}
                  className="hidden"
                />

                {/* Handwritten — hidden file input */}
                <input
                  ref={handwrittenInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/bmp,image/tiff"
                  onChange={handleHandwrittenUpload}
                  className="hidden"
                />

                {/* ID Proof Card */}
                <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-3 text-center space-y-2">
                  <FileCheck className="h-5 w-5 mx-auto text-muted-foreground" />
                  <p className="text-sm font-medium">Scan ID Proof</p>
                  <p className="text-xs text-muted-foreground">
                    Aadhaar, PAN, Voter ID
                  </p>
                  {scanning ? (
                    <div className="flex items-center justify-center gap-2 py-1 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Scanning...
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={scanning || scanningHandwritten}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload ID
                    </Button>
                  )}
                </div>

                {/* Handwritten Notes Card */}
                <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-3 text-center space-y-2">
                  <PenLine className="h-5 w-5 mx-auto text-muted-foreground" />
                  <p className="text-sm font-medium">Scan Handwritten</p>
                  <p className="text-xs text-muted-foreground">
                    Notes, forms, slips
                  </p>
                  {scanningHandwritten ? (
                    <div className="flex items-center justify-center gap-2 py-1 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Reading...
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={scanning || scanningHandwritten}
                      onClick={() => handwrittenInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Image
                    </Button>
                  )}
                </div>
              </div>

              {scanResult && (
                <p className="text-xs text-muted-foreground text-center">{scanResult}</p>
              )}

              <form onSubmit={handleCreate} className="space-y-4">
                {/* Section: Basic Info */}
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Basic Information</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => updateField("name", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clientType">Type</Label>
                    <Select
                      value={form.clientType}
                      onValueChange={(v) => updateField("clientType", v ?? "INDIVIDUAL")}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CLIENT_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="designation">Relation</Label>
                    <Select
                      value={form.designation}
                      onValueChange={(v) => updateField("designation", v ?? "")}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="S/o, D/o, W/o..." />
                      </SelectTrigger>
                      <SelectContent>
                        {DESIGNATIONS.map((d) => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="fatherHusbandName">Father / Husband Name</Label>
                    <Input
                      id="fatherHusbandName"
                      value={form.fatherHusbandName}
                      onChange={(e) => updateField("fatherHusbandName", e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="occupation">Occupation</Label>
                    <Input
                      id="occupation"
                      value={form.occupation}
                      onChange={(e) => updateField("occupation", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dob">Date of Birth</Label>
                    <Input
                      id="dob"
                      type="date"
                      value={form.dob}
                      onChange={(e) => updateField("dob", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="age">Age</Label>
                    <Input
                      id="age"
                      type="number"
                      value={form.age}
                      onChange={(e) => updateField("age", e.target.value)}
                    />
                  </div>
                </div>

                {/* Company fields — shown only for COMPANY type */}
                {form.clientType === "COMPANY" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Company Name</Label>
                      <Input
                        id="companyName"
                        value={form.companyName}
                        onChange={(e) => updateField("companyName", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cinNumber">CIN Number</Label>
                      <Input
                        id="cinNumber"
                        value={form.cinNumber}
                        onChange={(e) => updateField("cinNumber", e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Section: Contact */}
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">Contact Details</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={form.phone}
                      onChange={(e) => updateField("phone", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="alternatePhone">Alternate Phone</Label>
                    <Input
                      id="alternatePhone"
                      value={form.alternatePhone}
                      onChange={(e) => updateField("alternatePhone", e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                  />
                </div>

                {/* Section: Address */}
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">Address</p>
                <div className="space-y-2">
                  <Label htmlFor="address">Street Address</Label>
                  <Textarea
                    id="address"
                    rows={2}
                    value={form.address}
                    onChange={(e) => updateField("address", e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={form.city}
                      onChange={(e) => updateField("city", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="district">District</Label>
                    <Input
                      id="district"
                      value={form.district}
                      onChange={(e) => updateField("district", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={form.state}
                      onChange={(e) => updateField("state", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pincode">Pincode</Label>
                    <Input
                      id="pincode"
                      value={form.pincode}
                      onChange={(e) => updateField("pincode", e.target.value)}
                    />
                  </div>
                </div>

                {/* Section: ID & Tax */}
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">Identification</p>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="panNumber">PAN</Label>
                    <Input
                      id="panNumber"
                      value={form.panNumber}
                      onChange={(e) => updateField("panNumber", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="aadharNumber">Aadhar</Label>
                    <Input
                      id="aadharNumber"
                      value={form.aadharNumber}
                      onChange={(e) => updateField("aadharNumber", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gstNumber">GST</Label>
                    <Input
                      id="gstNumber"
                      value={form.gstNumber}
                      onChange={(e) => updateField("gstNumber", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    rows={2}
                    value={form.notes}
                    onChange={(e) => updateField("notes", e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full">
                  Create Client
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </RoleGate>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="text-center py-10 text-muted-foreground">Loading...</div>
      ) : clients.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">No clients found</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <Link key={client.id} href={`/clients/${client.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer overflow-hidden p-0">
                <CardHeader className={`pb-3 px-6 pt-6 ${CLIENT_TYPE_COLORS[client.clientType] || "bg-gray-500/15"}`}>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{client.name}</CardTitle>
                    <Badge variant="secondary">
                      {client.clientType === "INDIVIDUAL" ? (
                        <User className="h-3 w-3 mr-1" />
                      ) : (
                        <Building2 className="h-3 w-3 mr-1" />
                      )}
                      {client.clientType}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  {client.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3" /> {client.email}
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3" /> {client.phone}
                    </div>
                  )}
                  <div className="pt-2 border-t flex items-center justify-between">
                    <span className="font-medium text-foreground">
                      {client._count.caseClients} case(s)
                    </span>
                    {client.phone && (
                      <WhatsAppMessageDialog
                        clientId={client.id}
                        clientName={client.name}
                        clientPhone={client.phone}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
