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
import { LOCATION_TYPES } from "@/domain/constants";
import { useToast } from "@/components/ui/use-toast";
import { canWriteRecords } from "@/domain/policies";

export default function AppointmentFormDialog({ open, onOpenChange, onCreated, presetContactId, presetLeadId }) {
  const { profile, company } = useWorkspace();
  const { toast } = useToast();
  const [team, setTeam] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", start_at: "", end_at: "", location_type: "phone",
    location_details: "", owner_user_id: "",
  });

  useEffect(() => {
    if (!open || !company) return;
    data("UserProfile", company.company_id).filter({ active: true }).then(setTeam);
    setForm((f) => ({ ...f, owner_user_id: profile?.user_id || "" }));
  }, [open, company, profile]);

  if (profile && !canWriteRecords(profile)) return null;

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (form.title.trim().length < 2) return toast({ title: "A title is required", variant: "destructive" });
    if (!form.start_at) return toast({ title: "A start date and time is required", variant: "destructive" });
    if (!form.owner_user_id) return toast({ title: "Assign the appointment to a team member", variant: "destructive" });
    const start = new Date(form.start_at);
    const end = form.end_at ? new Date(form.end_at) : new Date(start.getTime() + 3600 * 1000);
    if (end <= start) return toast({ title: "The end time must be after the start time", variant: "destructive" });
    setSubmitting(true);
    try {
      const appointment = await data("Appointment", company.company_id).create({
        title: form.title.trim(),
        description: form.description,
        contact_id: presetContactId || null,
        lead_id: presetLeadId || null,
        owner_user_id: form.owner_user_id,
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        timezone: company.timezone || "Europe/Madrid",
        location_type: form.location_type,
        location_details: form.location_details,
        status: "scheduled",
      });
      toast({ title: "Appointment scheduled" });
      onOpenChange(false);
      onCreated?.(appointment);
    } catch (e) {
      toast({ title: e.message || "Could not schedule appointment", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New Appointment</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label>Title *</Label>
            <Input value={form.title} onChange={(e) => set("title")(e.target.value)} placeholder="e.g. Site visit — kitchen renovation" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Starts *</Label>
              <Input type="datetime-local" value={form.start_at} onChange={(e) => set("start_at")(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Ends</Label>
              <Input type="datetime-local" value={form.end_at} onChange={(e) => set("end_at")(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Location type</Label>
              <Select value={form.location_type} onValueChange={set("location_type")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LOCATION_TYPES.map((l) => <SelectItem key={l} value={l} className="capitalize">{l.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Assigned to *</Label>
              <Select value={form.owner_user_id} onValueChange={set("owner_user_id")}>
                <SelectTrigger><SelectValue placeholder="Assign user" /></SelectTrigger>
                <SelectContent>
                  {team.map((m) => <SelectItem key={m.user_id} value={m.user_id}>{m.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Location details</Label>
            <Input value={form.location_details} onChange={(e) => set("location_details")(e.target.value)} placeholder="Address, phone number or video link" />
          </div>
          <div className="grid gap-1.5">
            <Label>Description</Label>
            <Textarea rows={2} value={form.description} onChange={(e) => set("description")(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>{submitting ? "Scheduling…" : "Schedule"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}