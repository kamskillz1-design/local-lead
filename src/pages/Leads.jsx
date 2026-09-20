import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useWorkspace } from "@/app/workspace";
import { data } from "@/app/services/crmService";
import LeadFormDialog from "@/components/LeadFormDialog";
import { Button } from "@/components/ui/button";

export default function Leads() {
  const { company } = useWorkspace();
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const load = () => data("Lead", company.company_id).filter({}, "-created_date", 200).then(setRows).catch(() => setRows([]));
  useEffect(() => { if (company) load(); }, [company]);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Leads</h1>
        <Button onClick={() => setOpen(true)}>Add lead</Button>
      </div>
      <div className="divide-y border rounded-lg bg-white">
        {rows.map((l) => (
          <Link key={l.id} to={`/leads/${l.id}`} className="block px-4 py-3 hover:bg-muted">
            <p className="text-sm font-medium">{l.title}</p>
            <p className="text-xs text-muted-foreground">{l.lead_number} · {l.status}</p>
          </Link>
        ))}
        {rows.length === 0 && <p className="p-4 text-sm text-muted-foreground">No leads</p>}
      </div>
      <LeadFormDialog open={open} onOpenChange={setOpen} onCreated={load} />
    </div>
  );
}
