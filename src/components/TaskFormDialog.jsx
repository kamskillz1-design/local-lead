import React, { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useWorkspace } from "@/app/workspace";
import { data } from "@/app/services/crmService";
import { TASK_PRIORITIES } from "@/domain/constants";
import { useToast } from "@/components/ui/use-toast";
import { canWriteRecords } from "@/domain/policies";

export default function TaskFormDialog({ open, onOpenChange, onCreated, presetContactId, presetLeadId, presetOwnerId }) {
  const { profile, company } = useWorkspace();
  const { toast } = useToast();
  const [team, setTeam] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", owner_user_id: "", due_at: "", priority: "normal" });

  useEffect(() => {
    if (!open || !company) return;
    data("UserProfile", company.company_id).filter({ active: true }).then(setTeam);
    setForm((f) => ({ ...f, owner_user_id: presetOwnerId || profile?.user_id || "" }));
  }, [open, company, profile, presetOwnerId]);

  if (profile && !canWriteRecords(profile)) return null;

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (form.title.trim().length < 2) return toast({ title: "A task title is required", variant: "destructive" });
    if (!form.due_at) return toast({ title: "A due date is required", variant: "destructive" });
    setSubmitting(true);
    try {
      const repo = data("FollowUpTask", company.company_id);
      const task = await repo.create({
        title: form.title.trim(),
        description: form.description,
        contact_id: presetContactId || null,
        lead_id: presetLeadId || null,
        owner_user_id: form.owner_user_id || profile.user_id,
        created_by_user_id: profile.user_id,
        due_at: new Date(form.due_at).toISOString(),
        priority: form.priority,
        status: "open",
      });
      await data("Activity", company.company_id).create({
        contact_id: presetContactId || null, lead_id: presetLeadId || null,
        activity_type: "task_created", channel: "internal", direction: "internal",
        subject: `Task created: ${form.title.trim()}`, activity_at: new Date().toISOString(),
        performed_by_user_id: profile.user_id, completed: true,
      });
      toast({ title: "Follow-up task created" });
      onOpenChange(false);
      onCreated?.(task);
    } catch (e) {
      toast({ title: e.message || "Could not create task", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New Follow-up Task</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label>Title *</Label>
            <Input value={form.title} onChange={(e) => set("title")(e.target.value)} placeholder="e.g. Call Maria about the quote" />
          </div>
          <div className="grid gap-1.5">
            <Label>Description</Label>
            <Textarea rows={2} value={form.description} onChange={(e) => set("description")(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Due at *</Label>
              <Input type="datetime-local" value={form.due_at} onChange={(e) => set("due_at")(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={set("priority")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Assigned to</Label>
            <Select value={form.owner_user_id} onValueChange={set("owner_user_id")}>
              <SelectTrigger><SelectValue placeholder="Assign user" /></SelectTrigger>
              <SelectContent>
                {team.map((m) => <SelectItem key={m.user_id} value={m.user_id}>{m.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>{submitting ? "Creating…" : "Create task"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}