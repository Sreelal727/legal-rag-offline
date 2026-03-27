"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import {
  ArrowLeft, Mail, Phone, MapPin, User, Building2, Briefcase,
  Calendar, CreditCard, Save, X, Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { WhatsAppMessageDialog } from "@/components/whatsapp-message-dialog";

const CLIENT_TYPES = ["INDIVIDUAL", "COMPANY", "GOVERNMENT", "OTHER"];
const DESIGNATIONS = ["S/o", "D/o", "W/o", "R/o"];

interface ClientData {
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
  caseClients: Array<{
    id: string;
    role: string;
    case: {
      id: string;
      caseNumber: string;
      title: string;
      status: string;
      caseType: string;
      caseSubType: string | null;
    };
  }>;
  notices: Array<{
    id: string;
    title: string;
    status: string;
    createdAt: string;
  }>;
}

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-1.5 border-b border-muted/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right max-w-[60%]">{value}</span>
    </div>
  );
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const fetchClient = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/clients/${id}`);
    if (res.ok) {
      const data = await res.json();
      setClient(data);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchClient();
  }, [fetchClient]);

  const startEdit = () => {
    if (!client) return;
    setForm({
      name: client.name || "",
      fatherHusbandName: client.fatherHusbandName || "",
      designation: client.designation || "",
      clientType: client.clientType || "INDIVIDUAL",
      email: client.email || "",
      phone: client.phone || "",
      alternatePhone: client.alternatePhone || "",
      address: client.address || "",
      city: client.city || "",
      district: client.district || "",
      state: client.state || "",
      pincode: client.pincode || "",
      occupation: client.occupation || "",
      dob: client.dob || "",
      age: client.age?.toString() || "",
      panNumber: client.panNumber || "",
      aadharNumber: client.aadharNumber || "",
      gstNumber: client.gstNumber || "",
      companyName: client.companyName || "",
      cinNumber: client.cinNumber || "",
      notes: client.notes || "",
    });
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setForm({});
  };

  const saveEdit = async () => {
    setSaving(true);
    const payload: Record<string, unknown> = { ...form };
    payload.age = form.age ? parseInt(form.age) : null;
    // Convert empty strings to null for optional fields
    for (const key of Object.keys(payload)) {
      if (payload[key] === "") payload[key] = null;
    }
    // name is required
    if (!payload.name) {
      toast.error("Name is required");
      setSaving(false);
      return;
    }

    const res = await fetch(`/api/clients/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      toast.success("Client updated");
      setEditing(false);
      fetchClient();
    } else {
      toast.error("Failed to update client");
    }
    setSaving(false);
  };

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return <div className="text-center py-10 text-muted-foreground">Loading...</div>;
  }

  if (!client) {
    return <div className="text-center py-10 text-muted-foreground">Client not found</div>;
  }

  const fullName = [
    client.name,
    client.designation && client.fatherHusbandName
      ? `${client.designation} ${client.fatherHusbandName}`
      : null,
  ]
    .filter(Boolean)
    .join(", ");

  const fullAddress = [client.address, client.city, client.district, client.state, client.pincode]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/clients">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{client.name}</h1>
            {client.designation && client.fatherHusbandName && (
              <p className="text-sm text-muted-foreground">
                {client.designation} {client.fatherHusbandName}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">{client.clientType}</Badge>
              {client.occupation && (
                <Badge variant="outline">{client.occupation}</Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {client.phone && (
            <WhatsAppMessageDialog
              clientId={client.id}
              clientName={client.name}
              clientPhone={client.phone}
            />
          )}
          {!editing ? (
            <Button variant="outline" onClick={startEdit}>
              <Pencil className="h-4 w-4 mr-2" /> Edit
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={cancelEdit} disabled={saving}>
                <X className="h-4 w-4 mr-2" /> Cancel
              </Button>
              <Button onClick={saveEdit} disabled={saving}>
                <Save className="h-4 w-4 mr-2" /> {saving ? "Saving..." : "Save"}
              </Button>
            </>
          )}
        </div>
      </div>

      {editing ? (
        /* ===== EDIT MODE ===== */
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input value={form.name} onChange={(e) => updateField("name", e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={form.clientType} onValueChange={(v) => updateField("clientType", v ?? "INDIVIDUAL")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CLIENT_TYPES.map((t) => (
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
                      {DESIGNATIONS.map((d) => (
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
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Occupation</Label>
                  <Input value={form.occupation} onChange={(e) => updateField("occupation", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>DOB</Label>
                  <Input type="date" value={form.dob} onChange={(e) => updateField("dob", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Age</Label>
                  <Input type="number" value={form.age} onChange={(e) => updateField("age", e.target.value)} />
                </div>
              </div>
              {form.clientType === "COMPANY" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Company Name</Label>
                    <Input value={form.companyName} onChange={(e) => updateField("companyName", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>CIN Number</Label>
                    <Input value={form.cinNumber} onChange={(e) => updateField("cinNumber", e.target.value)} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact & Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={(e) => updateField("phone", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Alternate Phone</Label>
                  <Input value={form.alternatePhone} onChange={(e) => updateField("alternatePhone", e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Street Address</Label>
                <Textarea rows={2} value={form.address} onChange={(e) => updateField("address", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input value={form.city} onChange={(e) => updateField("city", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>District</Label>
                  <Input value={form.district} onChange={(e) => updateField("district", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input value={form.state} onChange={(e) => updateField("state", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Pincode</Label>
                  <Input value={form.pincode} onChange={(e) => updateField("pincode", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>PAN</Label>
                  <Input value={form.panNumber} onChange={(e) => updateField("panNumber", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Aadhar</Label>
                  <Input value={form.aadharNumber} onChange={(e) => updateField("aadharNumber", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>GST</Label>
                  <Input value={form.gstNumber} onChange={(e) => updateField("gstNumber", e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea rows={2} value={form.notes} onChange={(e) => updateField("notes", e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* ===== VIEW MODE ===== */
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-4 w-4" /> Personal Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <InfoRow label="Full Name" value={fullName} />
              <InfoRow label="Occupation" value={client.occupation} />
              <InfoRow label="Date of Birth" value={client.dob} />
              <InfoRow label="Age" value={client.age} />
              {client.clientType === "COMPANY" && (
                <>
                  <InfoRow label="Company Name" value={client.companyName} />
                  <InfoRow label="CIN" value={client.cinNumber} />
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-4 w-4" /> Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <InfoRow label="Phone" value={client.phone} />
              <InfoRow label="Alternate Phone" value={client.alternatePhone} />
              <InfoRow label="Email" value={client.email} />
              <InfoRow label="Address" value={fullAddress || null} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" /> Identification
              </CardTitle>
            </CardHeader>
            <CardContent>
              <InfoRow label="PAN" value={client.panNumber} />
              <InfoRow label="Aadhar" value={client.aadharNumber} />
              <InfoRow label="GST" value={client.gstNumber} />
              {client.notes && (
                <div className="pt-3 mt-3 border-t">
                  <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Notes</p>
                  <p className="text-sm whitespace-pre-wrap">{client.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" /> Associated Cases
              </CardTitle>
            </CardHeader>
            <CardContent>
              {client.caseClients.length === 0 ? (
                <p className="text-sm text-muted-foreground">No cases linked</p>
              ) : (
                <div className="space-y-3">
                  {client.caseClients.map((cc) => (
                    <Link
                      key={cc.id}
                      href={`/cases/${cc.case.id}`}
                      className="flex items-center justify-between p-3 rounded-md border hover:bg-muted/50"
                    >
                      <div>
                        <p className="font-medium text-sm">{cc.case.caseNumber}</p>
                        <p className="text-xs text-muted-foreground">{cc.case.title}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant={cc.case.status === "ACTIVE" ? "default" : "secondary"}>
                          {cc.case.status}
                        </Badge>
                        {cc.case.caseSubType && (
                          <p className="text-xs text-muted-foreground mt-1">{cc.case.caseSubType}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-0.5">{cc.role}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
