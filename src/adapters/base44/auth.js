import { supabase } from "@/api/supabaseClient";

function redirectBase() {
  if (typeof window === "undefined") return "http://localhost:5173";
  return window.location.origin;
}

export async function getSessionUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user || null;
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session || null;
}

export async function signInWithPassword(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUpWithPassword(email, password, metadata = {}) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${redirectBase()}/login`,
      data: metadata,
    },
  });
  if (error) throw error;
  return data;
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${redirectBase()}/`,
    },
  });
  if (error) throw error;
  return data;
}

export async function requestPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${redirectBase()}/reset-password`,
  });
  if (error) throw error;
}

export async function updatePassword(password) {
  const { data, error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  if (typeof window !== "undefined") window.location.assign("/login");
}

/**
 * Base44 inviteUser(email, appRole). Without a service-role Edge Function we send
 * a signup/magic link the teammate can use, then they join with the company invite code.
 */
export async function inviteUser(email, _appRole = "user") {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${redirectBase()}/login`,
    },
  });
  if (error) throw error;
}

export async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchUserProfile(userId) {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .eq("active", true)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function mergeAuthUser(user) {
  if (!user) return null;
  let profile = null;
  let membership = null;
  try {
    profile = await fetchProfile(user.id);
  } catch {
    profile = null;
  }
  try {
    membership = await fetchUserProfile(user.id);
  } catch {
    membership = null;
  }
  return {
    id: user.id,
    email: user.email,
    full_name:
      membership?.full_name ||
      profile?.full_name ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email,
    role: profile?.role || "user",
    company_id: membership?.company_id || profile?.company_id || null,
    language: membership?.language || profile?.language || "es",
    timezone: membership?.timezone || profile?.timezone || "Europe/Madrid",
    avatar: membership?.avatar || profile?.avatar || null,
    phone: membership?.phone || profile?.phone || null,
    job_title: membership?.job_title || profile?.job_title || null,
    profile,
    membership,
  };
}
