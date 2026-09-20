import React, { useState, useEffect } from "react";
import { Plus, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useWorkspace } from "@/app/workspace";
import { data } from "@/app/services/crmService";
import { TEMPLATE_CATEGORIES } from "@/domain/constants";
import { canManageOperationalRecords } from "@/domain/policies";
import { useToast } from "@/components/ui/use-toast";

const MERGE_FIELDS = "Merge fields: {{contact_name}}, {{company_name}}, {{lead_title}}, {{owner_name}}, {{next_appointment_date}}";

export default function SettingsTemplatesTab() {
  const { profile, company } = useWorkspace();
  const { toast } = useToast();
  const [templates, setTemplates] = useState([]);
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({ name: "", subject: "", body: "", category: "custom" });
  const [busy, setBusy] = useState(false);

  const load = () => data("EmailTemplate", company.company_id).filter({}).then(setTemplates).catch(() => setTemplates([]));
  useEffect(() => { if (company) load(); }, [company]);

  if (!company) return null;
  const editable = canManageOperationalRecords(profile);

  const create = async () => {
    if (form.name.trim().length < 2) return toast({ title: "Template name is required", variant: "destructive" });
    if (form.body.trim().length < 5) return toast({ title: "Template body is required", variant: "destructive" });
    setBusy(true);
    try {
      await data("EmailTemplate", company.company_id).create({
        name: form.name.trim(), subject: form.subject.trim(),
        body_text: form.body.trim(), body_html: `<p>${form.body.replace(/\n/g, "</p><p>")}</p>`,
        category: form.category, active: true, created_by_user_id: profile.user_id,
      });
      toast({ title: "Template created" });
      setDialog(false); setForm({ name: "", subject: "", body: "", category: "custom" });
      load();
    } catch (e) {
      toast({ title: e.message || "Could not create template", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {editable && (
        <Button size="sm" onClick={() => setDialog(true)}><Plus className="h-4 w-4 mr-1" /> New template</Button>
      )}
      <p className="text-xs text-muted-foreground">{MERGE_FIELDS}</p>
      <div className="space-y-2">
        {templates.map((t) => (
          <Card key={t.id}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-400" />
                <p className="text-sm font-medium flex-1 truncate">{t.name}</p>
                <span className="text-[11px] bg-muted rounded px-2 py-0.5 capitalize">{t.category.replace(/_/g, " ")}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{t.subject || "(no subject)"}</p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.body_text}</p>
            </CardContent>
          </Card>
        ))}
        {templates.length === 0 && <p className="text-sm text-muted-foreground">No email templates yet.</p>}
      </div>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New email template</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid gap-1.5"><Label>Subject</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="e.g. Quote for {{lead_title}}" /></div>
            <div className="grid gap-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEMPLATE_CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5"><Label>Body</Label><Textarea rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder={`Hello {{contact_name}},\n\nThank you for your enquiry…`} /></div>
            <p className="text-xs text-muted-foreground">{MERGE_FIELDS}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
            <Button onClick={create} disabled={busy}>{busy ? "Saving…" : "Create template"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}