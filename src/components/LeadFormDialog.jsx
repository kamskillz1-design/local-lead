import React, { useState, useEffect } from "react";
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
import { data, createLead, AppError } from "@/app/services/crmService";
import { LEAD_PRIORITIES } from "@/domain/constants";
import { isEmailValid, isPhoneValid, normalizeEmail, normalizePhone } from "@/domain/rules";
import { useToast } from "@/components/ui/use-toast";
import { canWriteRecords, canManageOperationalRecords } from "@/domain/policies";

export default function LeadFormDialog({ open, onOpenChange, onCreated, presetContactId, presetPipelineId }) {
  const { profile, company } = useWorkspace();
  const { toast } = useToast();
  const [pipelines, setPipelines] = useState([]);
  const [stages, setStages] = useState([]);
  const [sources, setSources] = useState([]);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "", first_name: "", last_name: "", email: "", phone: "", whatsapp_number: "",
    company_name: "", marketing_opt_in: false, pipeline_id: "", stage_id: "", source_id: "",
    owner_user_id: "", priority: "normal", estimated_value: "", expected_close_date: "",
    next_follow_up_at: "", no_followup_reason: "", description: "",
  });

  useEffect(() => {
    if (!open || !company || !profile) return;
    setLoading(true);
    Promise.all([
      data("Pipeline", company.company_id).filter({ active: true }),
      data("LeadSource", company.company_id).filter({ active: true }),
      data("UserProfile", company.company_id).filter({ active: true }),
    ]).then(([ps, srcs, teamList]) => {
      setPipelines(ps || []);
      setSources(srcs || []);
      setTeam(teamList || []);
      const defaultPipeline = (ps || []).find((p) => p.id === presetPipelineId) || (ps || []).find((p) => p.is_default) || (ps || [])[0];
      setForm((f) => ({
        ...f,
        pipeline_id: defaultPipeline?.id || "",
        owner_user_id: profile.user_id,
        existing_contact_id: presetContactId || "",
      }));
    }).finally(() => setLoading(false));
  }, [open, company, profile, presetContactId, presetPipelineId]);

  useEffect(() => {
    if (!form.pipeline_id) { setStages([]); return; }
    data("PipelineStage", company.company_id)
      .filter({ pipeline_id: form.pipeline_id, active: true }, "position", 50)
      .then(setStages);
  }, [form.pipeline_id, company]);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (confirmDuplicate = false) => {
    const email = normalizeEmail(form.email);
    const phone = normalizePhone(form.phone);
    if (form.title.trim().length < 2) return toast({ title: "Lead title is required", variant: "destructive" });
    if (!form.pipeline_id) return toast({ title: "Select a pipeline", variant: "destructive" });
    if (!form.owner_user_id) return toast({ title: "Assign an owner", variant: "destructive" });
    if (email && !isEmailValid(email)) return toast({ title: "The email address is not valid", variant: "destructive" });
    if (phone && !isPhoneValid(phone)) return toast({ title: "The phone number is not valid", variant: "destructive" });
    if (!form.next_follow_up_at && !form.no_followup_reason) {
      return toast({ title: "Set a next follow-up date, or record a no-follow-up reason", variant: "destructive" });
    }
    if (form.estimated_value && (isNaN(Number(form.estimated_value)) || Number(form.estimated_value) < 0)) {
      return toast({ title: "Estimated value must be a positive number", variant: "destructive" });
    }
    setSubmitting(true);
    try {
      const lead = await createLead({
        title: form.title.trim(),
        contact: {
          first_name: form.first_name, last_name: form.last_name, email, phone,
          whatsapp_number: form.whatsapp_number, company_name: form.company_name,
          marketing_opt_in: form.marketing_opt_in,
        },
        existing_contact_id: form.existing_contact_id || null,
        pipeline_id: form.pipeline_id,
        stage_id: form.stage_id || null,
        source_id: form.source_id || null,
        owner_user_id: form.owner_user_id,
        priority: form.priority,
        estimated_value: form.estimated_value ? Number(form.estimated_value) : null,
        currency: company.currency,
        expected_close_date: form.expected_close_date || null,
        next_follow_up_at: form.next_follow_up_at ? new Date(form.next_follow_up_at).toISOString() : null,
        no_followup_reason: form.no_followup_reason || null,
        description: form.description,
        confirm_duplicate: confirmDuplicate,
      });
      toast({ title: `Lead ${lead.lead_number} created` });
      onOpenChange(false);
      onCreated?.(lead);
    } catch (e) {
      if (e instanceof AppError && e.code === "CONFLICT") {
        const proceed = window.confirm(e.message);
        if (proceed) return submit(true);
      } else {
        toast({ title: e.message || "Could not create lead", variant: "destructive" });
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (profile && !canWriteRecords(profile)) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New Lead</DialogTitle></DialogHeader>
        {loading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
        ) : (
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="lead-title">Lead title *</Label>
              <Input id="lead-title" value={form.title} onChange={(e) => set("title")(e.target.value)} placeholder="e.g. Kitchen renovation quote" />
            </div>
            {!presetContactId && (
              <div className="border rounded-lg p-3 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Contact</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5"><Label>First name</Label><Input value={form.first_name} onChange={(e) => set("first_name")(e.target.value)} /></div>
                  <div className="grid gap-1.5"><Label>Last name</Label><Input value={form.last_name} onChange={(e) => set("last_name")(e.target.value)} /></div>
                  <div className="grid gap-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => set("email")(e.target.value)} /></div>
                  <div className="grid gap-1.5"><Label>Phone</Label><Input value={form.phone} onChange={(e) => set("phone")(e.target.value)} /></div>
                  <div className="grid gap-1.5"><Label>Company</Label><Input value={form.company_name} onChange={(e) => set("company_name")(e.target.value)} /></div>
                  <div className="grid gap-1.5"><Label>WhatsApp</Label><Input value={form.whatsapp_number} onChange={(e) => set("whatsapp_number")(e.target.value)} /></div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={form.marketing_opt_in} onCheckedChange={set("marketing_opt_in")} />
                  Marketing consent granted by contact
                </label>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Pipeline *</Label>
                <Select value={form.pipeline_id} onValueChange={set("pipeline_id")}>
                  <SelectTrigger><SelectValue placeholder="Select pipeline" /></SelectTrigger>
                  <SelectContent>
                    {pipelines.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Stage</Label>
                <Select value={form.stage_id} onValueChange={set("stage_id")}>
                  <SelectTrigger><SelectValue placeholder="First stage" /></SelectTrigger>
                  <SelectContent>
                    {stages.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Source</Label>
                <Select value={form.source_id} onValueChange={set("source_id")}>
                  <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {sources.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Owner *</Label>
                <Select value={form.owner_user_id} onValueChange={set("owner_user_id")}>
                  <SelectTrigger><SelectValue placeholder="Assign owner" /></SelectTrigger>
                  <SelectContent>
                    {team.map((m) => <SelectItem key={m.user_id} value={m.user_id}>{m.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={set("priority")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEAD_PRIORITIES.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Estimated value ({company?.currency})</Label>
                <Input type="number" min="0" value={form.estimated_value} onChange={(e) => set("estimated_value")(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>Expected close date</Label>
                <Input type="date" value={form.expected_close_date} onChange={(e) => set("expected_close_date")(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>Next follow-up *</Label>
                <Input type="datetime-local" value={form.next_follow_up_at} onChange={(e) => set("next_follow_up_at")(e.target.value)} />
              </div>
            </div>
            {canManageOperationalRecords(profile) && !form.next_follow_up_at && (
              <div className="grid gap-1.5">
                <Label>No follow-up reason (managers only)</Label>
                <Input value={form.no_followup_reason} onChange={(e) => set("no_followup_reason")(e.target.value)} placeholder="Why no follow-up is required" />
              </div>
            )}
            <div className="grid gap-1.5">
              <Label>Description</Label>
              <Textarea rows={3} value={form.description} onChange={(e) => set("description")(e.target.value)} />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={() => submit(false)} disabled={submitting || loading}>
            {submitting ? "Creating…" : "Create Lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}