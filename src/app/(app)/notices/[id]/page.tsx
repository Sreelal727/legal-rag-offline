"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, Send, Printer, Upload, Plus, Trash2, CheckCircle, XCircle,
  MapPin, Phone, Mail, Package, FileText, MessageSquareReply, Users,
  Loader2, Eye,
} from "lucide-react";
import { toast } from "sonner";
import { RoleGate } from "@/components/role-gate";
import { format } from "date-fns";
import Link from "next/link";

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "secondary",
  PENDING_APPROVAL: "outline",
  APPROVED: "default",
  SENT: "default",
  REJECTED: "destructive",
};

const deliveryStatusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "secondary",
  SENT: "outline",
  IN_TRANSIT: "outline",
  DELIVERED: "default",
  RETURNED: "destructive",
  FAILED: "destructive",
};

const deliveryMethods = [
  { value: "REGISTERED_POST", label: "Registered Post" },
  { value: "SPEED_POST", label: "Speed Post" },
  { value: "RPAD", label: "RPAD (Registered Post AD)" },
  { value: "COURIER", label: "Courier" },
  { value: "HAND_DELIVERY", label: "Hand Delivery" },
  { value: "EMAIL", label: "Email" },
];

interface Recipient {
  id: string;
  recipientName: string;
  recipientAddress: string;
  recipientCity: string;
  recipientState: string;
  recipientPincode: string;
  deliveryMethod: string;
  trackingNumber: string | null;
  sentDate: string | null;
  deliveredDate: string | null;
  deliveryStatus: string;
  adCardUrl: string | null;
  receiptUrl: string | null;
  returnReason: string | null;
  notes: string | null;
  oppositeParty: { id: string; name: string; partyType: string } | null;
}

interface Reply {
  id: string;
  replyDate: string;
  replyContent: string | null;
  documentPath: string | null;
  documentName: string | null;
  notes: string | null;
  recipient: { id: string; recipientName: string } | null;
}

export default function NoticeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const noticeId = params.id as string;

  const [notice, setNotice] = useState<any>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [oppositeParties, setOppositeParties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [addRecipientOpen, setAddRecipientOpen] = useState(false);
  const [addReplyOpen, setAddReplyOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [approveComment, setApproveComment] = useState("");
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);

  // Add Recipient form
  const [recipientMode, setRecipientMode] = useState<"party" | "manual">("party");
  const [selectedPartyIds, setSelectedPartyIds] = useState<string[]>([]);
  const [manualRecipient, setManualRecipient] = useState({
    recipientName: "", recipientAddress: "", recipientCity: "",
    recipientState: "", recipientPincode: "",
  });

  // Add Reply form
  const [replyForm, setReplyForm] = useState({
    replyDate: new Date().toISOString().split("T")[0],
    replyContent: "", recipientId: "", notes: "",
  });

  // Upload state
  const [uploadTarget, setUploadTarget] = useState<{ recipientId: string; type: "ad_card" | "receipt" } | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // Reply upload
  const [replyUploadTarget, setReplyUploadTarget] = useState<string | null>(null);
  const [replyUploadFile, setReplyUploadFile] = useState<File | null>(null);

  // Send dialog
  const [selectedSendIds, setSelectedSendIds] = useState<string[]>([]);

  // Print
  const [printType, setPrintType] = useState<"notice" | "envelope" | "ad_card" | "batta">("notice");
  const [selectedPrintIds, setSelectedPrintIds] = useState<string[]>([]);

  // Update recipient
  const [editRecipient, setEditRecipient] = useState<Recipient | null>(null);
  const [editRecipientOpen, setEditRecipientOpen] = useState(false);

  const fetchNotice = useCallback(async () => {
    const res = await fetch(`/api/notices/${noticeId}`);
    if (res.ok) {
      const data = await res.json();
      setNotice(data);
    }
  }, [noticeId]);

  const fetchRecipients = useCallback(async () => {
    const res = await fetch(`/api/notices/${noticeId}/recipients`);
    if (res.ok) {
      const data = await res.json();
      setRecipients(Array.isArray(data) ? data : []);
    }
  }, [noticeId]);

  const fetchReplies = useCallback(async () => {
    const res = await fetch(`/api/notices/${noticeId}/replies`);
    if (res.ok) {
      const data = await res.json();
      setReplies(Array.isArray(data) ? data : []);
    }
  }, [noticeId]);

  const fetchOppositeParties = useCallback(async () => {
    if (!notice?.case?.id) return;
    const res = await fetch(`/api/opposite-parties?caseId=${notice.case.id}`);
    if (res.ok) {
      const data = await res.json();
      setOppositeParties(Array.isArray(data) ? data : []);
    }
  }, [notice?.case?.id]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchNotice();
      await fetchRecipients();
      await fetchReplies();
      setLoading(false);
    })();
  }, [fetchNotice, fetchRecipients, fetchReplies]);

  useEffect(() => {
    if (notice?.case?.id) fetchOppositeParties();
  }, [notice?.case?.id, fetchOppositeParties]);

  const handleAddRecipients = async () => {
    const body: any = {};
    if (recipientMode === "party" && selectedPartyIds.length > 0) {
      body.oppositePartyIds = selectedPartyIds;
    } else if (recipientMode === "manual" && manualRecipient.recipientName) {
      body.manual = manualRecipient;
    } else {
      toast.error("Please select parties or enter recipient details");
      return;
    }

    const res = await fetch(`/api/notices/${noticeId}/recipients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      toast.success("Recipients added");
      setAddRecipientOpen(false);
      setSelectedPartyIds([]);
      setManualRecipient({ recipientName: "", recipientAddress: "", recipientCity: "", recipientState: "", recipientPincode: "" });
      fetchRecipients();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to add recipients");
    }
  };

  const handleDeleteRecipient = async (recipientId: string) => {
    const res = await fetch(`/api/notices/${noticeId}/recipients/${recipientId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Recipient removed");
      fetchRecipients();
    } else {
      toast.error("Failed to remove");
    }
  };

  const handleUpdateRecipient = async () => {
    if (!editRecipient) return;
    const res = await fetch(`/api/notices/${noticeId}/recipients/${editRecipient.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deliveryStatus: editRecipient.deliveryStatus,
        trackingNumber: editRecipient.trackingNumber,
        deliveryMethod: editRecipient.deliveryMethod,
        deliveredDate: editRecipient.deliveredDate,
        returnReason: editRecipient.returnReason,
        notes: editRecipient.notes,
      }),
    });
    if (res.ok) {
      toast.success("Recipient updated");
      setEditRecipientOpen(false);
      fetchRecipients();
    } else {
      toast.error("Update failed");
    }
  };

  const handleUpload = async () => {
    if (!uploadTarget || !uploadFile) return;
    const formData = new FormData();
    formData.append("type", uploadTarget.type);
    formData.append("file", uploadFile);

    const res = await fetch(`/api/notices/${noticeId}/recipients/${uploadTarget.recipientId}/upload`, {
      method: "POST",
      body: formData,
    });
    if (res.ok) {
      toast.success(`${uploadTarget.type === "ad_card" ? "AD Card" : "Receipt"} uploaded`);
      setUploadOpen(false);
      setUploadFile(null);
      setUploadTarget(null);
      fetchRecipients();
    } else {
      toast.error("Upload failed");
    }
  };

  const handleAddReply = async () => {
    if (!replyForm.replyDate) {
      toast.error("Reply date is required");
      return;
    }
    const res = await fetch(`/api/notices/${noticeId}/replies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...replyForm,
        recipientId: replyForm.recipientId || undefined,
      }),
    });
    if (res.ok) {
      toast.success("Reply recorded");
      setAddReplyOpen(false);
      setReplyForm({ replyDate: new Date().toISOString().split("T")[0], replyContent: "", recipientId: "", notes: "" });
      fetchReplies();
    } else {
      toast.error("Failed to add reply");
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    const res = await fetch(`/api/notices/${noticeId}/replies/${replyId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Reply deleted");
      fetchReplies();
    }
  };

  const handleReplyUpload = async (replyId: string) => {
    if (!replyUploadFile) return;
    const formData = new FormData();
    formData.append("file", replyUploadFile);

    const res = await fetch(`/api/notices/${noticeId}/replies/${replyId}/upload`, {
      method: "POST",
      body: formData,
    });
    if (res.ok) {
      toast.success("Reply document uploaded");
      setReplyUploadTarget(null);
      setReplyUploadFile(null);
      fetchReplies();
    } else {
      toast.error("Upload failed");
    }
  };

  const handleApproval = async (action: string) => {
    const res = await fetch(`/api/notices/${noticeId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, comments: approveComment }),
    });
    if (res.ok) {
      toast.success(`Notice ${action.toLowerCase()}`);
      setApproveComment("");
      fetchNotice();
    } else {
      toast.error("Action failed");
    }
  };

  const handleSend = async () => {
    const res = await fetch(`/api/notices/${noticeId}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipientIds: selectedSendIds.length > 0 ? selectedSendIds : undefined,
      }),
    });
    if (res.ok) {
      toast.success("Notice marked as sent");
      setSendDialogOpen(false);
      setSelectedSendIds([]);
      fetchNotice();
      fetchRecipients();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to send");
    }
  };

  const handlePrint = async () => {
    const res = await fetch(`/api/notices/${noticeId}/print`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: printType,
        recipientIds: selectedPrintIds.length > 0 ? selectedPrintIds : undefined,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      // Open print preview in new window
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <html><head><title>Print - ${data.type}</title>
          <style>
            body { font-family: 'Times New Roman', serif; margin: 2cm; }
            .page-break { page-break-after: always; }
            .recipient-block { margin-bottom: 1cm; }
            .address-block { margin: 1cm 0; padding: 0.5cm; border: 1px solid #999; }
            .notice-content { white-space: pre-wrap; line-height: 1.6; }
            h3 { margin: 0.5cm 0; }
            @media print { .no-print { display: none; } }
          </style></head><body>
          <button class="no-print" onclick="window.print()" style="padding:10px 20px;font-size:16px;margin-bottom:20px;cursor:pointer;">Print</button>
        `);

        if (data.type === "notice") {
          data.items.forEach((item: any, i: number) => {
            printWindow.document.write(`
              <div class="${i > 0 ? "page-break" : ""}">
                <h3>TO:</h3>
                <div class="address-block">
                  <strong>${item.recipientName}</strong><br/>
                  ${item.recipientAddress}<br/>
                  ${item.recipientCity}, ${item.recipientState} - ${item.recipientPincode}
                </div>
                <div class="notice-content">${data.noticeContent}</div>
              </div>
            `);
          });
        } else if (data.type === "envelope") {
          data.items.forEach((item: any, i: number) => {
            printWindow.document.write(`
              <div class="${i > 0 ? "page-break" : ""}" style="text-align:center;padding-top:3cm;">
                <div style="text-align:left;margin-left:5cm;">
                  <h3>To,</h3>
                  <p><strong>${item.recipientName}</strong><br/>
                  ${item.recipientAddress}<br/>
                  ${item.recipientCity}, ${item.recipientState}<br/>
                  Pin: ${item.recipientPincode}</p>
                </div>
              </div>
            `);
          });
        } else if (data.type === "ad_card") {
          data.items.forEach((item: any, i: number) => {
            printWindow.document.write(`
              <div class="${i > 0 ? "page-break" : ""}" style="border:2px solid #000;padding:1cm;max-width:15cm;">
                <h3 style="text-align:center;">ACKNOWLEDGMENT DUE (A.D.)</h3>
                <hr/>
                <p><strong>To:</strong><br/>
                ${item.recipientName}<br/>
                ${item.recipientAddress}<br/>
                ${item.recipientCity}, ${item.recipientState} - ${item.recipientPincode}</p>
                <hr/>
                <p><strong>From:</strong><br/>${data.senderAddress || "Advocate Office"}</p>
                <hr/>
                <p><strong>Article No:</strong> _________________</p>
                <p><strong>Date of Booking:</strong> _________________</p>
              </div>
            `);
          });
        } else if (data.type === "batta") {
          data.items.forEach((item: any, i: number) => {
            printWindow.document.write(`
              <div class="${i > 0 ? "page-break" : ""}">
                <h3 style="text-align:center;text-decoration:underline;">BATTA</h3>
                <p><strong>Case No:</strong> ${data.caseNumber || "___"}</p>
                <p><strong>To:</strong><br/>
                ${item.recipientName}<br/>
                ${item.recipientAddress}<br/>
                ${item.recipientCity}, ${item.recipientState} - ${item.recipientPincode}</p>
                <hr/>
                <div class="notice-content">${data.noticeContent}</div>
              </div>
            `);
          });
        }

        printWindow.document.write("</body></html>");
        printWindow.document.close();
      }
    } else {
      toast.error("Failed to generate print data");
    }
    setPrintDialogOpen(false);
  };

  const togglePartySelection = (partyId: string) => {
    setSelectedPartyIds((prev) =>
      prev.includes(partyId) ? prev.filter((id) => id !== partyId) : [...prev, partyId]
    );
  };

  const toggleSendSelection = (id: string) => {
    setSelectedSendIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const togglePrintSelection = (id: string) => {
    setSelectedPrintIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  if (loading) {
    return <div className="text-center py-10 text-muted-foreground">Loading...</div>;
  }

  if (!notice) {
    return <div className="text-center py-10 text-muted-foreground">Notice not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/notices")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{notice.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={statusColors[notice.status]}>{notice.status.replace(/_/g, " ")}</Badge>
            {notice.noticeType && <Badge variant="outline">{notice.noticeType.replace(/_/g, " ")}</Badge>}
            <span className="text-sm text-muted-foreground">by {notice.drafter?.name}</span>
            {notice.case && (
              <Link href={`/cases/${notice.case.id}`} className="text-sm text-blue-600 hover:underline">
                Case: {notice.case.caseNumber}
              </Link>
            )}
            {notice.client && <span className="text-sm text-muted-foreground">Client: {notice.client.name}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <RoleGate permission="notices:read">
            <Button variant="outline" onClick={() => setPrintDialogOpen(true)}>
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
          </RoleGate>
          <RoleGate permission="notices:send">
            {(notice.status === "APPROVED" || notice.status === "SENT") && (
              <Button onClick={() => setSendDialogOpen(true)}>
                <Send className="mr-2 h-4 w-4" /> Send Notice
              </Button>
            )}
          </RoleGate>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="content">
        <TabsList>
          <TabsTrigger value="content">Notice Content</TabsTrigger>
          <TabsTrigger value="recipients">
            Recipients ({recipients.length})
          </TabsTrigger>
          <TabsTrigger value="delivery">Delivery Tracking</TabsTrigger>
          <TabsTrigger value="replies">Replies ({replies.length})</TabsTrigger>
          <TabsTrigger value="approval">Approval History</TabsTrigger>
        </TabsList>

        {/* Notice Content Tab */}
        <TabsContent value="content">
          <Card>
            <CardContent className="p-6">
              <div className="border rounded p-4 whitespace-pre-wrap font-mono text-sm bg-muted/30 max-h-[60vh] overflow-y-auto">
                {notice.content}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recipients Tab */}
        <TabsContent value="recipients">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" /> Notice Recipients
              </CardTitle>
              <RoleGate permission="notices:draft">
                <Button onClick={() => setAddRecipientOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Add Recipients
                </Button>
              </RoleGate>
            </CardHeader>
            <CardContent>
              {recipients.length === 0 ? (
                <p className="text-center py-6 text-muted-foreground">No recipients added yet</p>
              ) : (
                <div className="space-y-3">
                  {recipients.map((r) => (
                    <div key={r.id} className="border rounded p-4 flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{r.recipientName}</span>
                          {r.oppositeParty && (
                            <Badge variant="outline">{r.oppositeParty.partyType}</Badge>
                          )}
                          <Badge variant={deliveryStatusColors[r.deliveryStatus]}>
                            {r.deliveryStatus}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {r.recipientAddress}, {r.recipientCity}, {r.recipientState} - {r.recipientPincode}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-3">
                          <span>{deliveryMethods.find((m) => m.value === r.deliveryMethod)?.label || r.deliveryMethod}</span>
                          {r.trackingNumber && <span>Tracking: {r.trackingNumber}</span>}
                          {r.sentDate && <span>Sent: {format(new Date(r.sentDate), "dd MMM yyyy")}</span>}
                          {r.deliveredDate && <span>Delivered: {format(new Date(r.deliveredDate), "dd MMM yyyy")}</span>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost" size="icon"
                          onClick={() => { setEditRecipient(r); setEditRecipientOpen(true); }}
                          title="Edit"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          onClick={() => { setUploadTarget({ recipientId: r.id, type: "ad_card" }); setUploadOpen(true); }}
                          title="Upload AD Card"
                        >
                          <Upload className="h-4 w-4" />
                        </Button>
                        <RoleGate permission="notices:draft">
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => handleDeleteRecipient(r.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </RoleGate>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Delivery Tracking Tab */}
        <TabsContent value="delivery">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" /> Delivery Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recipients.length === 0 ? (
                <p className="text-center py-6 text-muted-foreground">No recipients to track</p>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-5 gap-2 text-sm font-medium text-muted-foreground border-b pb-2">
                    <span>Recipient</span>
                    <span>Method</span>
                    <span>Status</span>
                    <span>Tracking</span>
                    <span>Documents</span>
                  </div>
                  {recipients.map((r) => (
                    <div key={r.id} className="grid grid-cols-5 gap-2 text-sm items-center border-b pb-2">
                      <span className="font-medium">{r.recipientName}</span>
                      <span>{deliveryMethods.find((m) => m.value === r.deliveryMethod)?.label || r.deliveryMethod}</span>
                      <Badge variant={deliveryStatusColors[r.deliveryStatus]}>{r.deliveryStatus}</Badge>
                      <span className="text-muted-foreground">{r.trackingNumber || "—"}</span>
                      <div className="flex gap-1">
                        {r.adCardUrl && <Badge variant="outline" className="text-xs">AD Card</Badge>}
                        {r.receiptUrl && <Badge variant="outline" className="text-xs">Receipt</Badge>}
                        <Button
                          variant="ghost" size="sm" className="h-6 text-xs"
                          onClick={() => { setUploadTarget({ recipientId: r.id, type: "receipt" }); setUploadOpen(true); }}
                        >
                          <Upload className="h-3 w-3 mr-1" /> Upload
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Replies Tab */}
        <TabsContent value="replies">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessageSquareReply className="h-5 w-5" /> Replies Received
              </CardTitle>
              <RoleGate permission="notices:draft">
                <Button onClick={() => setAddReplyOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Add Reply
                </Button>
              </RoleGate>
            </CardHeader>
            <CardContent>
              {replies.length === 0 ? (
                <p className="text-center py-6 text-muted-foreground">No replies received yet</p>
              ) : (
                <div className="space-y-3">
                  {replies.map((reply) => (
                    <div key={reply.id} className="border rounded p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {reply.recipient?.recipientName || "Unknown Recipient"}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(reply.replyDate), "dd MMM yyyy")}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          {reply.documentPath ? (
                            <Badge variant="outline">
                              <FileText className="h-3 w-3 mr-1" /> {reply.documentName}
                            </Badge>
                          ) : (
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => { setReplyUploadTarget(reply.id); }}
                            >
                              <Upload className="h-3 w-3 mr-1" /> Upload Doc
                            </Button>
                          )}
                          <RoleGate permission="notices:draft">
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteReply(reply.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </RoleGate>
                        </div>
                      </div>
                      {reply.replyContent && (
                        <p className="text-sm whitespace-pre-wrap bg-muted/30 p-3 rounded">{reply.replyContent}</p>
                      )}
                      {reply.notes && (
                        <p className="text-xs text-muted-foreground mt-1">Note: {reply.notes}</p>
                      )}

                      {/* Reply Upload inline */}
                      {replyUploadTarget === reply.id && (
                        <div className="flex items-center gap-2 mt-2 p-2 border rounded bg-muted/20">
                          <Input
                            type="file"
                            onChange={(e) => setReplyUploadFile(e.target.files?.[0] || null)}
                            className="flex-1"
                          />
                          <Button size="sm" onClick={() => handleReplyUpload(reply.id)} disabled={!replyUploadFile}>
                            Upload
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setReplyUploadTarget(null); setReplyUploadFile(null); }}>
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Approval History Tab */}
        <TabsContent value="approval">
          <Card>
            <CardContent className="p-6">
              {notice.approvals?.length > 0 ? (
                <div className="space-y-2">
                  {notice.approvals.map((a: any) => (
                    <div key={a.id} className="flex items-center gap-2 text-sm p-3 border rounded">
                      <Badge variant={a.action === "APPROVED" ? "default" : "destructive"}>{a.action}</Badge>
                      <span className="font-medium">{a.user.name}</span>
                      {a.comments && <span className="text-muted-foreground">— {a.comments}</span>}
                      <span className="text-xs text-muted-foreground ml-auto">
                        {format(new Date(a.createdAt), "dd MMM yyyy HH:mm")}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-6 text-muted-foreground">No approval actions yet</p>
              )}

              {/* Approval Actions */}
              <RoleGate permission="notices:approve">
                {notice.status === "PENDING_APPROVAL" && (
                  <div className="space-y-3 border-t pt-4 mt-4">
                    <Label>Comments</Label>
                    <Textarea
                      value={approveComment}
                      onChange={(e) => setApproveComment(e.target.value)}
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button onClick={() => handleApproval("APPROVED")} className="flex-1">
                        <CheckCircle className="mr-1 h-4 w-4" /> Approve
                      </Button>
                      <Button onClick={() => handleApproval("REVISION_REQUESTED")} variant="outline" className="flex-1">
                        Request Revision
                      </Button>
                      <Button onClick={() => handleApproval("REJECTED")} variant="destructive" className="flex-1">
                        <XCircle className="mr-1 h-4 w-4" /> Reject
                      </Button>
                    </div>
                  </div>
                )}
              </RoleGate>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Recipient Dialog */}
      <Dialog open={addRecipientOpen} onOpenChange={setAddRecipientOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Recipients</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={recipientMode === "party" ? "default" : "outline"}
                onClick={() => setRecipientMode("party")}
                size="sm"
              >
                From Opposite Parties
              </Button>
              <Button
                variant={recipientMode === "manual" ? "default" : "outline"}
                onClick={() => setRecipientMode("manual")}
                size="sm"
              >
                Manual Entry
              </Button>
            </div>

            {recipientMode === "party" ? (
              <div className="space-y-2">
                {oppositeParties.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No opposite parties found for this case</p>
                ) : (
                  oppositeParties.map((party) => (
                    <label
                      key={party.id}
                      className="flex items-center gap-3 p-3 border rounded cursor-pointer hover:bg-muted/50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPartyIds.includes(party.id)}
                        onChange={() => togglePartySelection(party.id)}
                        className="rounded"
                      />
                      <div>
                        <span className="font-medium">{party.name}</span>
                        <Badge variant="outline" className="ml-2">{party.partyType}</Badge>
                        <p className="text-xs text-muted-foreground">
                          {[party.address, party.city, party.state, party.pincode].filter(Boolean).join(", ")}
                        </p>
                      </div>
                    </label>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={manualRecipient.recipientName}
                    onChange={(e) => setManualRecipient({ ...manualRecipient, recipientName: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Address</Label>
                  <Textarea
                    value={manualRecipient.recipientAddress}
                    onChange={(e) => setManualRecipient({ ...manualRecipient, recipientAddress: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label>City</Label>
                    <Input
                      value={manualRecipient.recipientCity}
                      onChange={(e) => setManualRecipient({ ...manualRecipient, recipientCity: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>State</Label>
                    <Input
                      value={manualRecipient.recipientState}
                      onChange={(e) => setManualRecipient({ ...manualRecipient, recipientState: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Pincode</Label>
                    <Input
                      value={manualRecipient.recipientPincode}
                      onChange={(e) => setManualRecipient({ ...manualRecipient, recipientPincode: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            <Button onClick={handleAddRecipients} className="w-full">
              Add Recipients
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Recipient Dialog */}
      <Dialog open={editRecipientOpen} onOpenChange={setEditRecipientOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Recipient - {editRecipient?.recipientName}</DialogTitle>
          </DialogHeader>
          {editRecipient && (
            <div className="space-y-4">
              <div>
                <Label>Delivery Method</Label>
                <Select
                  value={editRecipient.deliveryMethod}
                  onValueChange={(v: any) => v && setEditRecipient({ ...editRecipient, deliveryMethod: String(v) })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {deliveryMethods.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Delivery Status</Label>
                <Select
                  value={editRecipient.deliveryStatus}
                  onValueChange={(v: any) => v && setEditRecipient({ ...editRecipient, deliveryStatus: String(v) })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["PENDING", "SENT", "IN_TRANSIT", "DELIVERED", "RETURNED", "FAILED"].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tracking Number</Label>
                <Input
                  value={editRecipient.trackingNumber || ""}
                  onChange={(e) => setEditRecipient({ ...editRecipient, trackingNumber: e.target.value })}
                />
              </div>
              <div>
                <Label>Delivered Date</Label>
                <Input
                  type="date"
                  value={editRecipient.deliveredDate ? editRecipient.deliveredDate.split("T")[0] : ""}
                  onChange={(e) => setEditRecipient({ ...editRecipient, deliveredDate: e.target.value || null })}
                />
              </div>
              <div>
                <Label>Return Reason (if returned/failed)</Label>
                <Input
                  value={editRecipient.returnReason || ""}
                  onChange={(e) => setEditRecipient({ ...editRecipient, returnReason: e.target.value })}
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={editRecipient.notes || ""}
                  onChange={(e) => setEditRecipient({ ...editRecipient, notes: e.target.value })}
                  rows={2}
                />
              </div>
              <Button onClick={handleUpdateRecipient} className="w-full">Update</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Upload Dialog (AD Card / Receipt) */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Upload {uploadTarget?.type === "ad_card" ? "AD Card" : "Receipt/Acknowledgment"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={uploadTarget?.type === "ad_card" ? "default" : "outline"}
                size="sm"
                onClick={() => uploadTarget && setUploadTarget({ ...uploadTarget, type: "ad_card" })}
              >
                AD Card
              </Button>
              <Button
                variant={uploadTarget?.type === "receipt" ? "default" : "outline"}
                size="sm"
                onClick={() => uploadTarget && setUploadTarget({ ...uploadTarget, type: "receipt" })}
              >
                Receipt
              </Button>
            </div>
            <Input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
            />
            <Button onClick={handleUpload} disabled={!uploadFile} className="w-full">
              <Upload className="mr-2 h-4 w-4" /> Upload
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Reply Dialog */}
      <Dialog open={addReplyOpen} onOpenChange={setAddReplyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Reply</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>From Recipient</Label>
              <Select
                value={replyForm.recipientId}
                onValueChange={(v: any) => setReplyForm({ ...replyForm, recipientId: v === "none" ? "" : String(v || "") })}
              >
                <SelectTrigger><SelectValue placeholder="Select recipient (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not specified</SelectItem>
                  {recipients.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.recipientName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reply Date</Label>
              <Input
                type="date"
                value={replyForm.replyDate}
                onChange={(e) => setReplyForm({ ...replyForm, replyDate: e.target.value })}
              />
            </div>
            <div>
              <Label>Reply Content</Label>
              <Textarea
                value={replyForm.replyContent}
                onChange={(e) => setReplyForm({ ...replyForm, replyContent: e.target.value })}
                rows={4}
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Input
                value={replyForm.notes}
                onChange={(e) => setReplyForm({ ...replyForm, notes: e.target.value })}
              />
            </div>
            <Button onClick={handleAddReply} className="w-full">Save Reply</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Dialog */}
      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Notice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select recipients to mark as sent, or send to all.
            </p>
            {recipients.map((r) => (
              <label key={r.id} className="flex items-center gap-3 p-2 border rounded cursor-pointer hover:bg-muted/50">
                <input
                  type="checkbox"
                  checked={selectedSendIds.includes(r.id)}
                  onChange={() => toggleSendSelection(r.id)}
                />
                <span>{r.recipientName}</span>
                <Badge variant={deliveryStatusColors[r.deliveryStatus]}>{r.deliveryStatus}</Badge>
              </label>
            ))}
            <Button onClick={handleSend} className="w-full">
              <Send className="mr-2 h-4 w-4" />
              {selectedSendIds.length > 0 ? `Send to ${selectedSendIds.length} Selected` : "Send to All"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Print Dialog */}
      <Dialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Print Options</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Print Type</Label>
              <Select value={printType} onValueChange={(v: any) => setPrintType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="notice">Notice (Full)</SelectItem>
                  <SelectItem value="envelope">Envelope / Cover</SelectItem>
                  <SelectItem value="ad_card">AD Card</SelectItem>
                  <SelectItem value="batta">Batta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-2 block">Select Recipients (or leave empty for all)</Label>
              {recipients.map((r) => (
                <label key={r.id} className="flex items-center gap-3 p-2 border rounded cursor-pointer hover:bg-muted/50 mb-1">
                  <input
                    type="checkbox"
                    checked={selectedPrintIds.includes(r.id)}
                    onChange={() => togglePrintSelection(r.id)}
                  />
                  <span className="text-sm">{r.recipientName}</span>
                </label>
              ))}
            </div>
            <Button onClick={handlePrint} className="w-full">
              <Printer className="mr-2 h-4 w-4" /> Generate Print
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
