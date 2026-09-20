import React, { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useWorkspace } from "@/app/workspace";
import { logActivity } from "@/app/services/crmService";
import { useToast } from "@/components/ui/use-toast";
import { canWriteRecords } from "@/domain/policies";

const TYPE_OPTIONS = [
  { value: "call", label: "Call", channel: "phone", outcome: true },
  { value: "email", label: "Email", channel: "email" },
  { value: "whatsapp_message", label: "WhatsApp", channel: "whatsapp" },
  { value: "sms_message", label: "SMS", channel: "sms" },
  { value: "social_message", label: "Social message", channel: "other" },
  { value: "meeting", label: "Meeting", channel: "internal", outcome: true },
  { value: "note", label: "Note", channel: "internal" },
];

const CALL_OUTCOMES = ["answered", "no_answer", "voicemail", "callback_requested", "appointment_booked", "quote_requested", "not_interested", "converted", "other"];

export default function LogActivityDialog({ open, onOpenChange, onLogged, contactId, leadId, defaultType = "call" }) {
  const { profile } = useWorkspace();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    activity_type: defaultType, direction: "outbound", subject: "", content_summary: "",
    outcome: "", duration_minutes: "", next_step: false, next_title: "", next_due_at: "",
  });

  if (profile && !canWriteRecords(profile)) return null;

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const typeConfig = TYPE_OPTIONS.find((t) => t.value === form.activity_type) || TYPE_OPTIONS[0];

  const submit = async () => {
    if (form.content_summary.trim().length < 2) return toast({ title: "A summary is required", variant: "destructive" });
    if (form.next_step && (!form.next_title || !form.next_due_at)) {
      return toast({ title: "Next step needs a title and a due date", variant: "destructive" });
    }
    setSubmitting(true);
    try {
      const result = await logActivity({
        activity_type: form.activity_type,
        channel: typeConfig.channel,
        direction: form.activity_type === "note" ? "internal" : form.direction,
        subject: form.subject || null,
        content_summary: form.content_summary.trim(),
        outcome: form.outcome || null,
        duration_minutes: form.duration_minutes || null,
        contact_id: contactId || null,
        lead_id: leadId || null,
        next_step: form.next_step ? {
          title: form.next_title, due_at: new Date(form.next_due_at).toISOString(), owner_user_id: profile.user_id,
        } : null,
      });
      toast({ title: "Activity logged" });
      onOpenChange(false);
      setForm({ activity_type: defaultType, direction: "outbound", subject: "", content_summary: "", outcome: "", duration_minutes: "", next_step: false, next_title: "", next_due_at: "" });
      onLogged?.(result);
    } catch (e) {
      toast({ title: e.message || "Could not log activity", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Log Activity</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Type</Label>
              <Select value={form.activity_type} onValueChange={set("activity_type")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {form.activity_type !== "note" && (
              <div className="grid gap-1.5">
                <Label>Direction</Label>
                <Select value={form.direction} onValueChange={set("direction")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inbound">Inbound</SelectItem>
                    <SelectItem value="outbound">Outbound</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label>Subject</Label>
            <Input value={form.subject} onChange={(e) => set("subject")(e.target.value)} placeholder="Short subject" />
          </div>
          <div className="grid gap-1.5">
            <Label>Summary *</Label>
            <Textarea rows={3} value={form.content_summary} onChange={(e) => set("content_summary")(e.target.value)} placeholder="What was discussed or agreed" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {typeConfig.outcome && (
              <div className="grid gap-1.5">
                <Label>Outcome</Label>
                <Select value={form.outcome} onValueChange={set("outcome")}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {CALL_OUTCOMES.map((o) => <SelectItem key={o} value={o} className="capitalize">{o.replace(/_/g, " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {(form.activity_type === "call" || form.activity_type === "meeting") && (
              <div className="grid gap-1.5">
                <Label>Duration (min)</Label>
                <Input type="number" min="0" value={form.duration_minutes} onChange={(e) => set("duration_minutes")(e.target.value)} />
              </div>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <Checkbox checked={form.next_step} onCheckedChange={set("next_step")} />
            Schedule a next step
          </label>
          {form.next_step && (
            <div className="grid grid-cols-2 gap-3 border rounded-lg p-3">
              <div className="grid gap-1.5 col-span-2">
                <Label>Next step title *</Label>
                <Input value={form.next_title} onChange={(e) => set("next_title")(e.target.value)} />
              </div>
              <div className="grid gap-1.5 col-span-2">
                <Label>Due at *</Label>
                <Input type="datetime-local" value={form.next_due_at} onChange={(e) => set("next_due_at")(e.target.value)} />
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>{submitting ? "Saving…" : "Log activity"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}