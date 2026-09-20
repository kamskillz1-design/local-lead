import React, { useEffect, useState } from "react";
import { useWorkspace } from "@/app/workspace";
import { completeTask, data } from "@/app/services/crmService";
import TaskFormDialog from "@/components/TaskFormDialog";
import { Button } from "@/components/ui/button";

export default function Tasks() {
  const { company } = useWorkspace();
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const load = () => data("FollowUpTask", company.company_id).filter({}, "-due_at", 200).then(setRows).catch(() => setRows([]));
  useEffect(() => { if (company) load(); }, [company]);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Tasks</h1>
        <Button onClick={() => setOpen(true)}>Add task</Button>
      </div>
      <div className="divide-y border rounded-lg bg-white">
        {rows.map((t) => (
          <div key={t.id} className="px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">{t.title}</p>
              <p className="text-xs text-muted-foreground">{t.status} · {t.due_at}</p>
            </div>
            {t.status !== "completed" && (
              <Button size="sm" variant="outline" onClick={() => completeTask({ task_id: t.id }).then(load)}>Complete</Button>
            )}
          </div>
        ))}
        {rows.length === 0 && <p className="p-4 text-sm text-muted-foreground">No tasks</p>}
      </div>
      <TaskFormDialog open={open} onOpenChange={setOpen} onCreated={load} />
    </div>
  );
}
