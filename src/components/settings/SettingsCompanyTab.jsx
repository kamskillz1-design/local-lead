import React, { useState, useEffect } from "react";
import { Building2, Copy, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWorkspace } from "@/app/workspace";
import { data } from "@/app/services/crmService";
import { makeInviteCode } from "@/domain/rules";
import { PLAN_LIMITS } from "@/domain/constants";
import { canManageSettings } from "@/domain/policies";
import { useToast } from "@/components/ui/use-toast";

export default function SettingsCompanyTab() {
  const { profile, company, refresh } = useWorkspace();
  const { toast } = useToast();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const editable = canManageSettings(profile);

  useEffect(() => {
    if (company) {
      setForm({
        name: company.name || "", legal_name: company.legal_name || "", industry: company.industry || "",
        tax_number: company.tax_number || "", vat_number: company.vat_number || "",
        address: company.address || "", city: company.city || "", country: company.country || "",
        postal_code: company.postal_code || "", timezone: company.timezone || "Europe/Madrid",
        currency: company.currency || "EUR", default_language: company.default_language || "en",
        website: company.website || "", privacy_policy_url: company.privacy_policy_url || "",
        consent_text: company.consent_text || "", data_retention_days: company.data_retention_days ?? 1095,
        team_visibility_mode: company.team_visibility_mode || "shared_company_records",
        first_response_hours: company.first_response_hours ?? 4,
      });
    }
  }, [company]);

  if (!company || !form) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const input = (k) => (e) => set(k)(e.target.value);

  const save = async () => {
    setSaving(true);
    try {
      await data("Company", company.company_id).update(company.id, form);
      toast({ title: "Company settings saved" });
      refresh();
    } catch (e) {
      toast({ title: e.message || "Could not save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const copyInvite = () => {
    navigator.clipboard?.writeText(company.invite_code || "");
    toast({ title: "Invite code copied" });
  };

  const regenerateCode = async () => {
    try {
      await data("Company", company.company_id).update(company.id, { invite_code: makeInviteCode() });
      toast({ title: "New invite code generated" });
      refresh();
    } catch (e) {
      toast({ title: e.message || "Could not regenerate", variant: "destructive" });
    }
  };

  const limits = PLAN_LIMITS[company.subscription_plan] || PLAN_LIMITS.business;

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" /> Company profile</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5 col-span-2"><Label>Company name</Label><Input value={form.name} onChange={input("name")} disabled={!editable} /></div>
          <div className="grid gap-1.5"><Label>Legal name</Label><Input value={form.legal_name} onChange={input("legal_name")} disabled={!editable} /></div>
          <div className="grid gap-1.5"><Label>Industry</Label><Input value={form.industry} onChange={input("industry")} disabled={!editable} /></div>
          <div className="grid gap-1.5"><Label>Tax number</Label><Input value={form.tax_number} onChange={input("tax_number")} disabled={!editable} /></div>
          <div className="grid gap-1.5"><Label>VAT number</Label><Input value={form.vat_number} onChange={input("vat_number")} disabled={!editable} /></div>
          <div className="grid gap-1.5 col-span-2"><Label>Address</Label><Input value={form.address} onChange={input("address")} disabled={!editable} /></div>
          <div className="grid gap-1.5"><Label>City</Label><Input value={form.city} onChange={input("city")} disabled={!editable} /></div>
          <div className="grid gap-1.5"><Label>Country</Label><Input value={form.country} onChange={input("country")} disabled={!editable} /></div>
          <div className="grid gap-1.5"><Label>Postal code</Label><Input value={form.postal_code} onChange={input("postal_code")} disabled={!editable} /></div>
          <div className="grid gap-1.5"><Label>Website</Label><Input value={form.website} onChange={input("website")} disabled={!editable} /></div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Workspace & privacy</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label>Timezone</Label><Input value={form.timezone} onChange={input("timezone")} disabled={!editable} /></div>
            <div className="grid gap-1.5"><Label>Currency</Label><Input value={form.currency} onChange={input("currency")} disabled={!editable} /></div>
            <div className="grid gap-1.5"><Label>Default language</Label><Input value={form.default_language} onChange={input("default_language")} disabled={!editable} /></div>
            <div className="grid gap-1.5"><Label>First response SLA (hours)</Label><Input type="number" min="1" value={form.first_response_hours} onChange={input("first_response_hours")} disabled={!editable} /></div>
            <div className="grid gap-1.5 col-span-2"><Label>Privacy policy URL</Label><Input value={form.privacy_policy_url} onChange={input("privacy_policy_url")} disabled={!editable} /></div>
            <div className="grid gap-1.5 col-span-2"><Label>Default form consent text</Label><Input value={form.consent_text} onChange={input("consent_text")} disabled={!editable} placeholder="I agree to be contacted about my enquiry…" /></div>
            <div className="grid gap-1.5"><Label>Retention (days)</Label><Input type="number" min="30" value={form.data_retention_days} onChange={input("data_retention_days")} disabled={!editable} /></div>
            <div className="grid gap-1.5">
              <Label>Team visibility</Label>
              <select
                className="h-9 rounded-md border bg-background px-3 text-sm"
                value={form.team_visibility_mode}
                onChange={(e) => set("team_visibility_mode")(e.target.value)}
                disabled={!editable}
              >
                <option value="shared_company_records">Shared company records</option>
                <option value="private_assigned_records">Private assigned records</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Team onboarding</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Input value={company.invite_code || ""} readOnly aria-label="Invite code" />
              <Button variant="outline" size="icon" onClick={copyInvite} aria-label="Copy invite code"><Copy className="h-4 w-4" /></Button>
              {editable && <Button variant="outline" size="icon" onClick={regenerateCode} aria-label="Regenerate invite code"><RefreshCw className="h-4 w-4" /></Button>}
            </div>
            <p className="text-xs text-muted-foreground">
              Share this code with teammates: they register, then join your workspace with the code.
            </p>
            <div className="border-t pt-3 text-sm space-y-1">
              <p className="font-medium">Subscription</p>
              <p className="text-muted-foreground capitalize">Plan: {company.subscription_plan} · Status: {company.subscription_status}</p>
              <p className="text-muted-foreground">Limits: {limits.users} users · {limits.contacts.toLocaleString()} contacts · {limits.forms} forms · {limits.pipelines} pipelines</p>
            </div>
          </CardContent>
        </Card>

        {editable && <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save company settings"}</Button>}
      </div>
    </div>
  );
}