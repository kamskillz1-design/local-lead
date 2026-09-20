import React, { useEffect, useState } from "react";
import { useWorkspace } from "@/app/workspace";
import { data } from "@/app/services/crmService";

export default function Inbox() {
  const { company } = useWorkspace();
  const [rows, setRows] = useState([]);
  useEffect(() => {
    if (!company) return;
    data("Message", company.company_id).filter({}, "-created_date", 100).then(setRows).catch(() => setRows([]));
  }, [company]);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Inbox</h1>
      <div className="divide-y border rounded-lg bg-white">
        {rows.map((m) => (
          <div key={m.id} className="px-4 py-3">
            <p className="text-sm font-medium">{m.subject || m.channel}</p>
            <p className="text-xs text-muted-foreground">{m.direction} · {m.body_preview}</p>
          </div>
        ))}
        {rows.length === 0 && <p className="p-4 text-sm text-muted-foreground">No messages</p>}
      </div>
    </div>
  );
}
