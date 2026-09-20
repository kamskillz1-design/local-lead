import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useWorkspace } from "@/app/workspace";

function inviteCode() {
  const part = () => Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, "X");
  return `${part()}-${part()}-${part()}`;
}

export default function Welcome() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { refresh } = useWorkspace();
  const [mode, setMode] = useState("create");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const createWorkspace = async () => {
    const tenantKey = crypto.randomUUID();
    const { error: coErr } = await supabase.from("companies").insert({
      company_id: tenantKey,
      name: name.trim(),
      country: "ES",
      currency: "EUR",
      timezone: "Europe/Madrid",
      default_language: "es",
      subscription_plan: "business",
      subscription_status: "trial",
      subscription_start_date: new Date().toISOString().slice(0, 10),
      team_visibility_mode: "shared_company_records",
      first_response_hours: 4,
      invite_code: inviteCode(),
      onboarding_steps: [],
      active: true,
    });
    if (coErr) throw coErr;
    const { error: pErr } = await supabase.from("user_profiles").insert({
      company_id: tenantKey,
      user_id: user.id,
      full_name: user.full_name || user.email,
      email: user.email,
      role: "owner",
      active: true,
      language: "es",
      timezone: "Europe/Madrid",
      last_login_at: new Date().toISOString(),
    });
    if (pErr) throw pErr;
    await supabase.from("profiles").update({ company_id: tenantKey }).eq("id", user.id);

    const { data: pipeline, error: pipeErr } = await supabase
      .from("pipelines")
      .insert({ company_id: tenantKey, name: "Sales", active: true, is_default: true })
      .select("id")
      .single();
    if (pipeErr) throw pipeErr;
    const stages = [
      { name: "New", probability_percentage: 10, color: "#94a3b8", position: 1 },
      { name: "Contacted", probability_percentage: 25, color: "#60a5fa", position: 2 },
      { name: "Qualified", probability_percentage: 40, color: "#38bdf8", position: 3 },
      { name: "Quote Sent", probability_percentage: 60, color: "#fbbf24", position: 4 },
      { name: "Negotiation", probability_percentage: 75, color: "#f97316", position: 5 },
      { name: "Won", probability_percentage: 100, color: "#22c55e", position: 6, is_closed: true, is_won: true },
      { name: "Lost", probability_percentage: 0, color: "#ef4444", position: 7, is_closed: true, is_lost: true },
    ];
    const { error: stErr } = await supabase.from("pipeline_stages").insert(
      stages.map((s) => ({ company_id: tenantKey, pipeline_id: pipeline.id, active: true, is_closed: false, is_won: false, is_lost: false, ...s }))
    );
    if (stErr) throw stErr;
    const sources = [
      ["Website form", "website_form"],
      ["Phone call", "phone"],
      ["Email", "email"],
      ["WhatsApp", "whatsapp"],
      ["Referral", "referral"],
      ["Walk-in", "walk_in"],
      ["Instagram", "instagram"],
      ["Facebook", "facebook"],
      ["LinkedIn", "linkedin"],
      ["Event", "event"],
    ];
    const { error: srcErr } = await supabase.from("lead_sources").insert(
      sources.map(([n, channel]) => ({ company_id: tenantKey, name: n, channel, active: true }))
    );
    if (srcErr) throw srcErr;
  };

  const joinWorkspace = async () => {
    const { data: found, error: findErr } = await supabase.rpc("lookup_company_by_invite", {
      p_code: code.trim(),
    });
    if (findErr) throw findErr;
    const company = Array.isArray(found) ? found[0] : found;
    if (!company) throw new Error("This invite code is not valid");
    const { error: pErr } = await supabase.from("user_profiles").insert({
      company_id: company.company_id,
      user_id: user.id,
      full_name: user.full_name || user.email,
      email: user.email,
      role: "staff",
      active: true,
      language: company.default_language || "es",
      timezone: company.timezone || "Europe/Madrid",
      last_login_at: new Date().toISOString(),
    });
    if (pErr) throw pErr;
    await supabase.from("profiles").update({ company_id: company.company_id }).eq("id", user.id);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "create") {
        if (name.trim().length < 2) throw new Error("A company name is required");
        await createWorkspace();
      } else {
        if (code.trim().length < 6) throw new Error("A valid invite code is required");
        await joinWorkspace();
      }
      await refreshUser();
      await refresh();
      navigate("/onboarding", { replace: true });
    } catch (err) {
      setError(err.message || "Could not continue");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout icon={Building2} title="Set up your workspace" subtitle="Create a company or join with an invite code">
      <div className="flex gap-2 mb-4">
        <Button type="button" variant={mode === "create" ? "default" : "outline"} size="sm" onClick={() => setMode("create")}>
          Create company
        </Button>
        <Button type="button" variant={mode === "join" ? "default" : "outline"} size="sm" onClick={() => setMode("join")}>
          Join with code
        </Button>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}
        {mode === "create" ? (
          <div className="grid gap-1.5">
            <Label htmlFor="name">Company name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
        ) : (
          <div className="grid gap-1.5">
            <Label htmlFor="code">Invite code</Label>
            <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} required />
          </div>
        )}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Working…" : "Continue"}
        </Button>
      </form>
    </AuthLayout>
  );
}
