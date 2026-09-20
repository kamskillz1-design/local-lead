import { supabase } from "@/api/supabaseClient";

function functionsUrl(name) {
  const base = import.meta.env.VITE_SUPABASE_URL;
  return `${base}/functions/v1/${name}`;
}

async function callFunction(name, body) {
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const res = await fetch(functionsUrl(name), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) {
    const err = new Error(json.error || json.message || "Request failed");
    err.code = json.code;
    throw err;
  }
  return json.data ?? json;
}

export async function getPublicForm(identifier) {
  try {
    return await callFunction("get-public-form", { identifier });
  } catch {
    const { data, error } = await supabase
      .from("forms")
      .select("title, description, fields_configuration, consent_text, privacy_policy_url, spam_protection_enabled, success_message, redirect_url")
      .eq("public_identifier", identifier)
      .eq("active", true)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      const err = new Error("Form not found");
      err.code = "NOT_FOUND";
      throw err;
    }
    return {
      title: data.title,
      description: data.description || "",
      fields: data.fields_configuration || [],
      consent_text: data.consent_text || "",
      privacy_policy_url: data.privacy_policy_url || "",
      spam_protection_enabled: data.spam_protection_enabled !== false,
      success_message: data.success_message,
      redirect_url: data.redirect_url,
    };
  }
}

export async function submitPublicForm(identifier, payload) {
  return callFunction("submit-public-form", { identifier, payload });
}
