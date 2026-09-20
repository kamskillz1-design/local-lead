// Deploy: supabase functions deploy submit-public-form --no-verify-jwt
// Ports Base44 submitPublicForm. Uses the service role; never expose that key to Vite.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizeEmail(raw: string) {
  return raw ? String(raw).trim().toLowerCase() : "";
}
function normalizePhone(raw: string) {
  if (!raw) return "";
  const trimmed = String(raw).replace(/[\s()\-.]/g, "");
  return trimmed.startsWith("00") ? "+" + trimmed.slice(2) : trimmed;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json();
    const identifier = String(body.identifier || "").trim();
    const payload = body.payload || {};
    if (!identifier) {
      return Response.json({ ok: false, error: "Missing form identifier", code: "VALIDATION" }, { status: 400, headers: cors });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: form } = await supabase.from("forms").select("*").eq("public_identifier", identifier).eq("active", true).maybeSingle();
    if (!form) {
      return Response.json({ ok: false, error: "Form not found", code: "NOT_FOUND" }, { status: 404, headers: cors });
    }
    if (form.spam_protection_enabled !== false && payload.website && String(payload.website).trim() !== "") {
      return Response.json({ ok: false, error: "Submission rejected", code: "SPAM_REJECTED" }, { status: 400, headers: cors });
    }
    const email = normalizeEmail(payload.email);
    const phone = normalizePhone(payload.phone);
    const name = String(payload.name || payload.full_name || "").trim();
    if (name.length < 2) {
      return Response.json({ ok: false, error: "Your name is required", code: "VALIDATION" }, { status: 400, headers: cors });
    }
    if (!email && !phone) {
      return Response.json({ ok: false, error: "An email address or phone number is required", code: "VALIDATION" }, { status: 400, headers: cors });
    }

    const now = new Date().toISOString();
    const { data: existing } = email
      ? await supabase.from("contacts").select("*").eq("company_id", form.company_id).eq("email", email).limit(1)
      : await supabase.from("contacts").select("*").eq("company_id", form.company_id).eq("phone", phone).limit(1);
    let contact = (existing || [])[0];
    const parts = name.split(" ");
    if (!contact) {
      const inserted = await supabase.from("contacts").insert({
        company_id: form.company_id,
        first_name: parts[0],
        last_name: parts.slice(1).join(" "),
        full_name: name,
        email,
        phone,
        whatsapp_number: phone,
        lifecycle_status: "lead",
        owner_user_id: form.default_owner_user_id || null,
        consent_status: "granted",
        consent_source: "public_form",
        active: true,
      }).select("*").single();
      if (inserted.error) throw inserted.error;
      contact = inserted.data;
    }

    let leadId = null;
    if (form.default_pipeline_id) {
      const { data: stages } = await supabase
        .from("pipeline_stages")
        .select("*")
        .eq("pipeline_id", form.default_pipeline_id)
        .order("position");
      const stage = (stages || []).find((s) => s.id === form.default_stage_id) || (stages || [])[0];
      if (stage) {
        const year = new Date().getFullYear();
        const { data: recent } = await supabase.from("leads").select("lead_number").eq("company_id", form.company_id).order("created_at", { ascending: false }).limit(200);
        const max = (recent || []).reduce((acc: number, r: { lead_number?: string }) => {
          const n = parseInt(String(r.lead_number || "").split("-").pop() || "0", 10);
          return Number.isNaN(n) ? acc : Math.max(acc, n);
        }, 0);
        const lead_number = `LEAD-${year}-${String(max + 1).padStart(5, "0")}`;
        const leadIns = await supabase.from("leads").insert({
          company_id: form.company_id,
          lead_number,
          title: `Enquiry: ${name}`,
          contact_id: contact.id,
          pipeline_id: form.default_pipeline_id,
          pipeline_stage_id: stage.id,
          source_id: form.source_id || null,
          owner_user_id: form.default_owner_user_id,
          status: "open",
          priority: "high",
          description: String(payload.message || "").slice(0, 2000),
          last_activity_at: now,
          active: true,
        }).select("id").single();
        if (!leadIns.error) leadId = leadIns.data.id;
      }
    }

    await supabase.from("form_submissions").insert({
      company_id: form.company_id,
      form_id: form.id,
      received_at: now,
      raw_payload: { name, email, phone, message: String(payload.message || "").slice(0, 2000) },
      normalized_email: email,
      normalized_phone: phone,
      contact_id: contact.id,
      lead_id: leadId,
      processing_status: "processed",
      consent_captured: Boolean(payload.consent),
      consent_text_version: form.consent_text || "",
    });

    return Response.json({ ok: true, data: { success_message: form.success_message } }, { headers: cors });
  } catch (error) {
    return Response.json({ ok: false, error: "Could not submit form", code: "SERVER" }, { status: 500, headers: cors });
  }
});
