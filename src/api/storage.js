import { supabase } from "@/api/supabaseClient";

/** Public bucket created in the Supabase Dashboard. See DEPLOY.md in Phase 5. */
export const UPLOAD_BUCKET = "crm-uploads";

export function publicUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  const { data } = supabase.storage.from(UPLOAD_BUCKET).getPublicUrl(path);
  return data?.publicUrl || "";
}

export async function uploadPublicFile(file, { folder = "uploads", fileName } = {}) {
  if (!file) throw new Error("No file");
  const safeName = (fileName || file.name || "file").replace(/[^\w.\-]+/g, "_");
  const path = `${folder}/${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage.from(UPLOAD_BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  return publicUrl(path);
}

export async function uploadAvatar(file, userId) {
  return uploadPublicFile(file, { folder: `avatars/${userId}` });
}

export async function uploadCompanyLogo(file, companyId) {
  return uploadPublicFile(file, { folder: `logos/${companyId}` });
}
