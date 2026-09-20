import React, { useState, useEffect } from "react";
import moment from "moment";
import { Card, CardContent } from "@/components/ui/card";
import { useWorkspace } from "@/app/workspace";
import { data } from "@/app/services/crmService";
import { formatDateTime } from "@/domain/rules";
import EmptyState from "@/components/EmptyState";
import { ScrollText } from "lucide-react";

export default function SettingsAuditTab() {
  const { company } = useWorkspace();
  const [logs, setLogs] = useState(null);

  useEffect(() => {
    if (!company) return;
    data("AuditLog", company.company_id).filter({}, "-created_date", 200)
      .then(setLogs)
      .catch(() => setLogs([]));
  }, [company]);

  if (!company) return null;
  if (logs === null) return <p className="text-sm text-muted-foreground">Loading audit trail…</p>;
  if (logs.length === 0) return <EmptyState title="No audit entries yet" description="Security-relevant actions will be recorded here and can never be edited or deleted." icon={ScrollText} />;

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Immutable record of security-relevant actions. The most recent 200 entries are shown.</p>
      {logs.map((l) => (
        <Card key={l.id}>
          <CardContent className="pt-3 pb-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs bg-muted rounded px-1.5 py-0.5">{l.action}</span>
              <span className="text-muted-foreground">{l.actor_name || l.actor_user_id || "system"}</span>
              <span className="text-xs text-muted-foreground ml-auto">{formatDateTime(l.created_date)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {l.entity_type ? `${l.entity_type}${l.entity_id ? ` · ${l.entity_id.slice(0, 8)}…` : ""}` : ""}
              {l.reason ? ` · ${l.reason}` : ""}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}