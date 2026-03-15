"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export function EcourtsSyncButton() {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<{ synced: number; failed: number } | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    setResult(null);
    try {
      const res = await fetch("/api/ecourts/sync-all", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setResult({ synced: data.synced, failed: data.failed });
        if (data.synced > 0) {
          toast.success(`Synced ${data.synced} case(s) from eCourts`);
        } else {
          toast.info(data.message || "No cases to sync");
        }
        if (data.failed > 0) {
          toast.warning(`${data.failed} case(s) failed to sync`);
        }
      } else {
        toast.error("Sync failed");
      }
    } catch {
      toast.error("Failed to connect");
    }
    setSyncing(false);
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
        {syncing ? (
          <><Loader2 className="mr-2 h-3 w-3 animate-spin" /> Syncing eCourts...</>
        ) : (
          <><RefreshCw className="mr-2 h-3 w-3" /> Sync All from eCourts</>
        )}
      </Button>
      {result && (
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <CheckCircle className="h-3 w-3 text-green-500" />
          {result.synced} synced{result.failed > 0 ? `, ${result.failed} failed` : ""}
        </span>
      )}
    </div>
  );
}
