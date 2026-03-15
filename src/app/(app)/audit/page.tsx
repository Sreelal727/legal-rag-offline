"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";
import { format } from "date-fns";

interface AuditEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: string | null;
  createdAt: string;
  user: { name: string; email: string } | null;
}

const actionColors: Record<string, string> = {
  CREATE: "bg-green-100 text-green-800",
  UPDATE: "bg-blue-100 text-blue-800",
  DELETE: "bg-red-100 text-red-800",
  UPLOAD: "bg-purple-100 text-purple-800",
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/audit");
    const data = await res.json();
    setLogs(data.logs || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold flex items-center gap-2">
        <Shield className="h-8 w-8" /> Audit Log
      </h1>

      {loading ? (
        <div className="text-center py-10 text-muted-foreground">Loading...</div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Badge className={actionColors[log.action] || "bg-gray-100 text-gray-800"}>
                      {log.action}
                    </Badge>
                    <div>
                      <p className="text-sm">
                        <span className="font-medium">{log.user?.name || "System"}</span>{" "}
                        {log.action.toLowerCase()}d {log.entity}
                        {log.entityId && <span className="text-muted-foreground"> ({log.entityId.substring(0, 8)}...)</span>}
                      </p>
                      {log.details && (
                        <p className="text-xs text-muted-foreground">{log.details}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(log.createdAt), "dd MMM yyyy, HH:mm")}
                  </span>
                </div>
              ))}
              {logs.length === 0 && (
                <p className="text-center py-10 text-muted-foreground">No audit logs</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
