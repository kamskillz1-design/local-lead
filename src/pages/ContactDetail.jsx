import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useWorkspace } from "@/app/workspace";
import { data } from "@/app/services/crmService";
import ActivityTimeline from "@/components/ActivityTimeline";
import LogActivityDialog from "@/components/LogActivityDialog";
import { Button } from "@/components/ui/button";

export default function ContactDetail() {
  const { id } = useParams();
  const { company } = useWorkspace();
  const [row, setRow] = useState(null);
  const [logOpen, setLogOpen] = useState(false);
  useEffect(() => {
    if (!company) return;
    data("Contact", company.company_id).get(id).then(setRow).catch(() => setRow(null));
  }, [company, id]);
  if (!row) return <p className="text-sm text-muted-foreground">Loading…</p>;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{row.full_name}</h1>
          <p className="text-sm text-muted-foreground">{row.email} · {row.phone}</p>
        </div>
        <Button onClick={() => setLogOpen(true)}>Log activity</Button>
      </div>
      <ActivityTimeline contactId={id} />
      <LogActivityDialog open={logOpen} onOpenChange={setLogOpen} contactId={id} />
    </div>
  );
}
