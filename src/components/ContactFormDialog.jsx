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
import { data } from "@/app/services/crmService";
import { CONTACT_METHODS, LIFECYCLE_STATUSES } from "@/domain/constants";
import { isEmailValid, isPhoneValid, normalizeEmail, normalizePhone } from "@/domain/rules";
import { useToast } from "@/components/ui/use-toast";
import { canWriteRecords } from "@/domain/policies";

const EMPTY = {
  first_name: "", last_name: "", email: "", phone: "", whatsapp_number: "", company_name: "",
  job_title: "", city: "", preferred_contact_method: "email", lifecycle_status: "lead",
  owner_user_id: "", email_marketing_opt_in: false, do_not_contact: false, notes_summary: "",
};

export default function ContactFormDialog({ open, onOpenChange, onSaved, contact }) {
  const { profile, company } = useWorkspace();
  const { toast } = useToast();
  const [team, setTeam] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const editing = Boolean(contact?.id);

  useEffect(() => {
    if (!open || !company) return;
    data("UserProfile", company.company_id).filter({ active: true }).then(setTeam);
    if (contact) {
      setForm({
        first_name: contact.first_name || "", last_name: contact.last_name || "",
        email: contact.email || "", phone: contact.phone || "", whatsapp_number: contact.whatsapp_number || "",
        company_name: contact.company_name || "", job_title: contact.job_title || "",
        city: contact.city || "", preferred_contact_method: contact.preferred_contact_method || "email",
        lifecycle_status: contact.lifecycle_status || "lead", owner_user_id: contact.owner_user_id || "",
        email_marketing_opt_in: Boolean(contact.email_marketing_opt_in),
        do_not_contact: Boolean(contact.do_not_contact), notes_summary: contact.notes_summary || "",
      });
    } else {
      setForm({ ...EMPTY, owner_user_id: profile?.user_id || "" });
    }
  }, [open, contact, company, profile]);

  if (profile && !canWriteRecords(profile)) return null;

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const input = (k) => (e) => set(k)(e.target.value);

  const submit = async () => {
    const email = normalizeEmail(form.email);
    const phone = normalizePhone(form.phone);
    if (!form.first_name && !form.last_name) return toast({ title: "A first or last name is required", variant: "destructive" });
    if (!email && !phone) return toast({ title: "An email address or phone number is required", variant: "destructive" });
    if (email && !isEmailValid(email)) return toast({ title: "The email address is not valid", variant: "destructive" });
    if (phone && !isPhoneValid(phone)) return toast({ title: "The phone number is not valid", variant: "destructive" });
    setSubmitting(true);
    try {
      const repo = data("Contact", company.company_id);
      const payload = {
        first_name: form.first_name, last_name: form.last_name,
        full_name: `${form.first_name} ${form.last_name}`.trim(),
        email, phone, whatsapp_number: normalizePhone(form.whatsapp_number) || phone,
        company_name: form.company_name, job_title: form.job_title, city: form.city,
        preferred_contact_method: form.preferred_contact_method,
        lifecycle_status: form.lifecycle_status,
        owner_user_id: form.owner_user_id || profile.user_id,
        email_marketing_opt_in: form.email_marketing_opt_in,
        marketing_opt_in_date: form.email_marketing_opt_in && !editing ? new Date().toISOString() : contact?.marketing_opt_in_date || null,
        consent_status: form.email_marketing_opt_in ? "granted" : (contact?.consent_status || "unknown"),
        consent_source: contact?.consent_source || "manual_entry",
        do_not_contact: form.do_not_contact,
        notes_summary: form.notes_summary,
      };
      const saved = editing
        ? await repo.update(contact.id, payload)
        : await repo.create(payload);
      toast({ title: editing ? "Contact updated" : "Contact created" });
      onOpenChange(false);
      onSaved?.(saved);
    } catch (e) {
      toast({ title: e.message || "Could not save contact", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? "Edit Contact" : "New Contact"}</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label>First name *</Label><Input value={form.first_name} onChange={input("first_name")} /></div>
            <div className="grid gap-1.5"><Label>Last name</Label><Input value={form.last_name} onChange={input("last_name")} /></div>
            <div className="grid gap-1.5"><Label>Email *</Label><Input type="email" value={form.email} onChange={input("email")} /></div>
            <div className="grid gap-1.5"><Label>Phone *</Label><Input value={form.phone} onChange={input("phone")} /></div>
            <div className="grid gap-1.5"><Label>WhatsApp</Label><Input value={form.whatsapp_number} onChange={input("whatsapp_number")} /></div>
            <div className="grid gap-1.5"><Label>Company</Label><Input value={form.company_name} onChange={input("company_name")} /></div>
            <div className="grid gap-1.5"><Label>Job title</Label><Input value={form.job_title} onChange={input("job_title")} /></div>
            <div className="grid gap-1.5"><Label>City</Label><Input value={form.city} onChange={input("city")} /></div>
            <div className="grid gap-1.5">
              <Label>Preferred method</Label>
              <Select value={form.preferred_contact_method} onValueChange={set("preferred_contact_method")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTACT_METHODS.map((m) => <SelectItem key={m} value={m} className="capitalize">{m.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Lifecycle</Label>
              <Select value={form.lifecycle_status} onValueChange={set("lifecycle_status")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LIFECYCLE_STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5 col-span-2">
              <Label>Owner</Label>
              <Select value={form.owner_user_id} onValueChange={set("owner_user_id")}>
                <SelectTrigger><SelectValue placeholder="Assign owner" /></SelectTrigger>
                <SelectContent>
                  {team.map((m) => <SelectItem key={m.user_id} value={m.user_id}>{m.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={form.email_marketing_opt_in} onCheckedChange={set("email_marketing_opt_in")} />
            Email marketing consent granted
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={form.do_not_contact} onCheckedChange={set("do_not_contact")} />
            Do not contact
          </label>
          <div className="grid gap-1.5">
            <Label>Notes</Label>
            <Textarea rows={3} value={form.notes_summary} onChange={input("notes_summary")} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>{submitting ? "Saving…" : editing ? "Save changes" : "Create contact"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}