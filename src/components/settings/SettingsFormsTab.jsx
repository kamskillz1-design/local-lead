import React, { useState, useEffect } from "react";
import { Copy, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useWorkspace } from "@/app/workspace";
import { data } from "@/app/services/crmService";
import { makePublicIdentifier } from "@/domain/rules";
import { canManageOperationalRecords } from "@/domain/policies";
import { useToast } from "@/components/ui/use-toast";

export default function SettingsFormsTab() {
  const { profile, company } = useWorkspace();
  const { toast } = useToast();
  const [forms, setForms] = useState([]);
  const [sources, setSources] = useState([]);
  const [pipelines, setPipelines] = useState([]);
  const [team, setTeam] = useState([]);
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({ name: "", title: "", description: "", consent_text: "", source_id: "", pipeline_id: "", owner_id: "" });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [fs, srcs, ps, tm] = await Promise.all([
      data("Form", company.company_id).filter({}).catch(() => []),
      data("LeadSource", company.company_id).filter({ active: true }).catch(() => []),
      data("Pipeline", company.company_id).filter({ active: true }).catch(() => []),
      data("UserProfile", company.company_id).filter({ active: true }).catch(() => []),
    ]);
    setForms(fs || []); setSources(srcs || []); setPipelines(ps || []); setTeam(tm || []);
  };
  useEffect(() => { if (company) load(); }, [company]);

  if (!company) return null;
  const editable = canManageOperationalRecords(profile);
  const publicUrl = (identifier) => `${window.location.origin}/f/${identifier}`;

  const create = async () => {
    if (form.name.trim().length < 2) return toast({ title: "Form name is required", variant: "destructive" });
    if (!form.pipeline_id) return toast({ title: "Select the pipeline for new leads", variant: "destructive" });
    setBusy(true);
    try {
      await data("Form", company.company_id).create({
        name: form.name.trim(),
        public_identifier: makePublicIdentifier(),
        title: form.title.trim() || form.name.trim(),
        description: form.description.trim(),
        fields_configuration: [
          { key: "name", label: "Your name", type: "text", required: true },
          { key: "email", label: "Email address", type: "email", required: true },
          { key: "phone", label: "Phone number", type: "phone", required: false },
          { key: "message", label: "How can we help?", type: "textarea", required: false },
        ],
        success_message: "Thank you — we received your enquiry and will get back to you shortly.",
        source_id: form.source_id || (sources.find((s) => s.channel === "website_form") || {}).id || null,
        default_pipeline_id: form.pipeline_id,
        default_stage_id: null,
        default_owner_user_id: form.owner_id || profile.user_id,
        consent_text: form.consent_text.trim() || company.consent_text || "I agree to be contacted about my enquiry and have read the privacy policy.",
        privacy_policy_url: company.privacy_policy_url || "",
        spam_protection_enabled: true,
        active: true,
      });
      toast({ title: "Public form created" });
      setDialog(false);
      setForm({ name: "", title: "", description: "", consent_text: "", source_id: "", pipeline_id: "", owner_id: "" });
      load();
    } catch (e) {
      toast({ title: e.message || "Could not create form", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {editable && <Button size="sm" onClick={() => setDialog(true)}><Plus className="h-4 w-4 mr-1" /> New public form</Button>}
      <div className="space-y-2">
        {forms.map((f) => (
          <Card key={f.id}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium">{f.name}</p>
                <span className={`text-[11px] rounded px-2 py-0.5 ${f.active ? "bg-green-100 text-green-700" : "bg-slate-200"}`}>{f.active ? "Active" : "Inactive"}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{f.title}</p>
              <div className="flex items-center gap-2 mt-2">
                <Input readOnly value={publicUrl(f.public_identifier)} className="text-xs font-mono" aria-label="Public form URL" />
                <Button variant="outline" size="icon" aria-label="Copy URL" onClick={() => {
                  navigator.clipboard?.writeText(publicUrl(f.public_identifier));
                  toast({ title: "Form URL copied" });
                }}><Copy className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {forms.length === 0 && <p className="text-sm text-muted-foreground">No public forms yet. Create one to capture enquiries from your website.</p>}
      </div>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New public form</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5"><Label>Form name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Contact enquiry" /></div>
            <div className="grid gap-1.5"><Label>Public title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Get in touch" /></div>
            <div className="grid gap-1.5"><Label>Description</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Pipeline for new leads *</Label>
                <select className="h-9 rounded-md border bg-background px-3 text-sm" value={form.pipeline_id} onChange={(e) => setForm({ ...form, pipeline_id: e.target.value })}>
                  <option value="">Select…</option>
                  {pipelines.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label>Assign to</Label>
                <select className="h-9 rounded-md border bg-background px-3 text-sm" value={form.owner_id} onChange={(e) => setForm({ ...form, owner_id: e.target.value })}>
                  <option value="">Me</option>
                  {team.map((m) => <option key={m.user_id} value={m.user_id}>{m.full_name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid gap-1.5"><Label>Consent text</Label><Input value={form.consent_text} onChange={(e) => setForm({ ...form, consent_text: e.target.value })} placeholder="Shown next to the consent checkbox" /></div>
            <p className="text-xs text-muted-foreground">The form captures name, email, phone and message, with honeypot spam protection and rate limiting.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
            <Button onClick={create} disabled={busy}>{busy ? "Creating…" : "Create form"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}