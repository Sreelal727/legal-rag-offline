"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { MessageSquare, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface Item {
  id: string;
  caseNumber?: string;
  title?: string;
  cnrNumber?: string;
}

interface WhatsAppMessageDialogProps {
  clientId: string;
  clientName: string;
  clientPhone: string | null;
  trigger?: React.ReactNode;
}

const CATEGORIES = [
  { value: "CASE_UPDATE", label: "Case Update" },
  { value: "DOCUMENT_SUBMISSION", label: "Document Submission" },
  { value: "ECOURTS_STATUS", label: "eCourts Status" },
  { value: "BILLING", label: "Billing" },
  { value: "OTHER", label: "Other" },
];

function formatPhone(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 10) digits = "91" + digits;
  if (!digits.startsWith("91") && digits.length === 12) return digits;
  return digits;
}

export function WhatsAppMessageDialog({
  clientId,
  clientName,
  clientPhone,
  trigger,
}: WhatsAppMessageDialogProps) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setCategory("");
    setItems([]);
    setSelectedItemId("");
    setMessage("");
    setLoading(false);
  };

  const fetchData = async (cat: string, itemId?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ clientId, category: cat });
      if (itemId) params.set("itemId", itemId);
      const res = await fetch(`/api/whatsapp-message?${params}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to fetch");
      }
      const data = await res.json();
      if (!itemId) {
        setItems(data.items || []);
        setMessage(data.message || "");
      } else {
        setMessage(data.message || "");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to fetch data";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (cat: string | null) => {
    if (!cat) return;
    setCategory(cat);
    setSelectedItemId("");
    setMessage("");
    setItems([]);
    if (cat === "OTHER") {
      setMessage("");
      return;
    }
    fetchData(cat);
  };

  const handleItemChange = (itemId: string | null) => {
    if (!itemId) return;
    setSelectedItemId(itemId);
    setMessage("");
    fetchData(category, itemId);
  };

  const handleSend = () => {
    if (!clientPhone) {
      toast.error("Client has no phone number");
      return;
    }
    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }
    const phone = formatPhone(clientPhone);
    const url = `https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  if (!clientPhone) return null;

  const showItemDropdown = category && category !== "OTHER" && items.length > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(true);
            }}
          >
            <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
            Message
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Send WhatsApp Message</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <strong>{clientName}</strong> &middot; {clientPhone}
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={handleCategoryChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select category..." />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showItemDropdown && (
            <div className="space-y-2">
              <Label>
                {category === "BILLING" ? "Invoice" : "Case"}
              </Label>
              <Select value={selectedItemId} onValueChange={handleItemChange}>
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${category === "BILLING" ? "invoice" : "case"}...`} />
                </SelectTrigger>
                <SelectContent>
                  {items.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.caseNumber || item.id} — {item.title || ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {category && !loading && items.length === 0 && category !== "OTHER" && !selectedItemId && !message && (
            <p className="text-sm text-muted-foreground">
              No {category === "BILLING" ? "invoices" : "cases"} found for this client.
            </p>
          )}

          {loading && (
            <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </div>
          )}

          {(message !== "" || category === "OTHER") && !loading && (
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                rows={8}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={category === "OTHER" ? "Type your message..." : ""}
              />
            </div>
          )}

          {(message.trim() || category === "OTHER") && !loading && (
            <Button onClick={handleSend} className="w-full" disabled={!message.trim()}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Send via WhatsApp
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
