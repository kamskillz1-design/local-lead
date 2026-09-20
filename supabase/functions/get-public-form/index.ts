// Deploy: supabase functions deploy get-public-form
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { identifier } = await req.json();
    if (!identifier) {
      return Response.json({ ok: false, error: "Missing form identifier", code: "VALIDATION" }, { status: 400, headers: cors });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: form } = await supabase
      .from("forms")
      .select("title, description, fields_configuration, consent_text, privacy_policy_url, spam_protection_enabled, success_message, redirect_url")
      .eq("public_identifier", identifier)
      .eq("active", true)
      .maybeSingle();
    if (!form) {
      return Response.json({ ok: false, error: "Form not found", code: "NOT_FOUND" }, { status: 404, headers: cors });
    }
    return Response.json({
      ok: true,
      data: {
        title: form.title,
        description: form.description || "",
        fields: form.fields_configuration || [],
        consent_text: form.consent_text || "",
        privacy_policy_url: form.privacy_policy_url || "",
        spam_protection_enabled: form.spam_protection_enabled !== false,
        success_message: form.success_message,
        redirect_url: form.redirect_url,
      },
    }, { headers: cors });
  } catch {
    return Response.json({ ok: false, error: "Could not load form", code: "SERVER" }, { status: 500, headers: cors });
  }
});
