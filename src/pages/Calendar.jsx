import React, { useEffect, useState } from "react";
import { useWorkspace } from "@/app/workspace";
import { data } from "@/app/services/crmService";
import AppointmentFormDialog from "@/components/AppointmentFormDialog";
import { Button } from "@/components/ui/button";

export default function CalendarPage() {
  const { company } = useWorkspace();
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const load = () => data("Appointment", company.company_id).filter({}, "-start_at", 100).then(setRows).catch(() => setRows([]));
  useEffect(() => { if (company) load(); }, [company]);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Calendar</h1>
        <Button onClick={() => setOpen(true)}>Add appointment</Button>
      </div>
      <div className="divide-y border rounded-lg bg-white">
        {rows.map((a) => (
          <div key={a.id} className="px-4 py-3">
            <p className="text-sm font-medium">{a.title}</p>
            <p className="text-xs text-muted-foreground">{a.start_at} · {a.status}</p>
          </div>
        ))}
        {rows.length === 0 && <p className="p-4 text-sm text-muted-foreground">No appointments</p>}
      </div>
      <AppointmentFormDialog open={open} onOpenChange={setOpen} onCreated={load} />
    </div>
  );
}
