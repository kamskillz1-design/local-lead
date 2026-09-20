import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useWorkspace } from "@/app/workspace";
import { changeLeadStage, data } from "@/app/services/crmService";
import ActivityTimeline from "@/components/ActivityTimeline";
import LogActivityDialog from "@/components/LogActivityDialog";
import { Button } from "@/components/ui/button";

export default function LeadDetail() {
  const { id } = useParams();
  const { company } = useWorkspace();
  const [lead, setLead] = useState(null);
  const [stages, setStages] = useState([]);
  const [logOpen, setLogOpen] = useState(false);
  const load = async () => {
    const row = await data("Lead", company.company_id).get(id);
    setLead(row);
    if (row?.pipeline_id) {
      setStages(await data("PipelineStage", company.company_id).filter({ pipeline_id: row.pipeline_id }, "position", 50));
    }
  };
  useEffect(() => { if (company) load().catch(() => setLead(null)); }, [company, id]);
  if (!lead) return <p className="text-sm text-muted-foreground">Loading…</p>;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">{lead.title}</h1>
          <p className="text-xs text-muted-foreground">{lead.lead_number} · {lead.status}</p>
        </div>
        <Button onClick={() => setLogOpen(true)}>Log activity</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {stages.map((s) => (
          <Button key={s.id} size="sm" variant={s.id === lead.pipeline_stage_id ? "default" : "outline"} onClick={() => changeLeadStage({ lead_id: lead.id, new_stage_id: s.id, confirm_close_tasks: true, lost_reason: s.is_lost ? "Lost" : undefined }).then(load)}>
            {s.name}
          </Button>
        ))}
      </div>
      <ActivityTimeline leadId={id} />
      <LogActivityDialog open={logOpen} onOpenChange={setLogOpen} leadId={id} contactId={lead.contact_id} />
    </div>
  );
}
