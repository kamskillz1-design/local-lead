import { supabase } from "@/api/supabaseClient";
import { createEntityRepo } from "@/api/entities";
import { useWorkspace } from "@/app/workspace";

export class AppError extends Error {
  constructor(message, code = "SERVER") {
    super(message);
    this.code = code;
    this.name = "AppError";
  }
}

export function data(entityName, companyId) {
  return createEntityRepo(entityName, companyId);
}

function normalizeEmail(raw) {
  if (!raw) return "";
  return String(raw).trim().toLowerCase();
}

function normalizePhone(raw) {
  if (!raw) return "";
  const trimmed = String(raw).replace(/[\s()\-.]/g, "");
  return trimmed.startsWith("00") ? "+" + trimmed.slice(2) : trimmed;
}

async function currentMembership() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) throw new AppError("Authentication required", "UNAUTHENTICATED");
  const { data: profile, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", auth.user.id)
    .neq("active", false)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!profile) throw new AppError("You are not a member of a company workspace", "FORBIDDEN");
  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("company_id", profile.company_id)
    .maybeSingle();
  return { user: auth.user, profile, company };
}

async function nextLeadNumber(companyId) {
  const rows = await data("Lead", companyId).filter({}, "-created_date", 500);
  const year = new Date().getFullYear();
  const max = (rows || []).reduce((acc, r) => {
    const num = parseInt(String(r.lead_number || "").split("-").pop() || "0", 10);
    return Number.isNaN(num) ? acc : Math.max(acc, num);
  }, 0);
  return `LEAD-${year}-${String(max + 1).padStart(5, "0")}`;
}

export async function createLead(body) {
  const { user, profile, company } = await currentMembership();
  if (profile.role === "read_only") throw new AppError("Read-only users cannot create leads", "FORBIDDEN");
  const companyId = profile.company_id;
  const title = String(body.title || "").trim();
  if (title.length < 2) throw new AppError("Lead title must be at least 2 characters", "VALIDATION");

  const email = normalizeEmail(body.contact && body.contact.email);
  const phone = normalizePhone(body.contact && body.contact.phone);

  let contact = null;
  if (body.existing_contact_id) {
    contact = await data("Contact", companyId).get(body.existing_contact_id);
  } else {
    if (email) {
      const byEmail = await data("Contact", companyId).filter({ email });
      contact = (byEmail || [])[0] || null;
    }
    if (!contact && phone) {
      const byPhone = await data("Contact", companyId).filter({ phone });
      contact = (byPhone || [])[0] || null;
    }
  }

  if (!contact && (email || phone)) {
    const first = String((body.contact && body.contact.first_name) || "").trim();
    const last = String((body.contact && body.contact.last_name) || "").trim();
    contact = await data("Contact", companyId).create({
      first_name: first,
      last_name: last,
      full_name: `${first} ${last}`.trim() || email || phone,
      email,
      phone,
      whatsapp_number: normalizePhone(body.contact && body.contact.whatsapp_number) || phone,
      company_name: (body.contact && body.contact.company_name) || "",
      lifecycle_status: "lead",
      owner_user_id: body.owner_user_id,
      consent_status: email || phone ? "granted" : "unknown",
      consent_source: "manual_entry",
      email_marketing_opt_in: Boolean(body.contact && body.contact.marketing_opt_in),
      marketing_opt_in_date: body.contact && body.contact.marketing_opt_in ? new Date().toISOString() : null,
      active: true,
      archived: false,
    });
  } else if (contact && body.contact && body.contact.marketing_opt_in && !contact.email_marketing_opt_in) {
    await data("Contact", companyId).update(contact.id, {
      email_marketing_opt_in: true,
      marketing_opt_in_date: new Date().toISOString(),
      consent_status: "granted",
    });
  }
  if (!contact) throw new AppError("A contact with an email or phone number is required", "VALIDATION");

  const openLeads = await data("Lead", companyId).filter({ contact_id: contact.id, status: "open" });
  if ((openLeads || []).some((l) => String(l.title).toLowerCase() === title.toLowerCase()) && !body.confirm_duplicate) {
    throw new AppError("An open lead with this title already exists for this contact. Confirm to create anyway.", "CONFLICT");
  }

  const stages = await data("PipelineStage", companyId).filter({ pipeline_id: body.pipeline_id, active: true }, "position", 50);
  if (!stages.length) throw new AppError("Pipeline has no stages", "VALIDATION");
  const stage = body.stage_id ? stages.find((s) => s.id === body.stage_id) : stages[0];
  if (!stage) throw new AppError("Selected stage is not part of this pipeline", "VALIDATION");

  const now = new Date();
  const lead = await data("Lead", companyId).create({
    lead_number: await nextLeadNumber(companyId),
    title,
    contact_id: contact.id,
    organisation_id: body.organisation_id || null,
    pipeline_id: body.pipeline_id,
    pipeline_stage_id: stage.id,
    source_id: body.source_id || null,
    owner_user_id: body.owner_user_id,
    status: "open",
    estimated_value: body.estimated_value != null ? Number(body.estimated_value) : null,
    currency: body.currency || company?.currency || "EUR",
    probability_percentage: stage.probability_percentage || 10,
    expected_close_date: body.expected_close_date || null,
    first_response_due_at: new Date(now.getTime() + (company?.first_response_hours || 4) * 3600 * 1000).toISOString(),
    next_follow_up_at: body.next_follow_up_at || null,
    no_followup_reason: body.no_followup_reason || null,
    last_activity_at: now.toISOString(),
    priority: body.priority || "normal",
    description: body.description || "",
    active: true,
    archived: false,
  });

  await data("Activity", companyId).create({
    contact_id: contact.id,
    lead_id: lead.id,
    activity_type: "system_event",
    channel: "internal",
    direction: "internal",
    subject: "Lead created",
    content_summary: `Lead ${lead.lead_number} created`,
    activity_at: now.toISOString(),
    performed_by_user_id: user.id,
    completed: true,
  });

  if (body.next_follow_up_at) {
    await data("FollowUpTask", companyId).create({
      title: `Follow up: ${title}`,
      contact_id: contact.id,
      lead_id: lead.id,
      owner_user_id: body.owner_user_id,
      created_by_user_id: user.id,
      due_at: body.next_follow_up_at,
      priority: body.priority || "normal",
      status: "open",
    });
  }

  return lead;
}

export async function logActivity(body) {
  const { user, profile } = await currentMembership();
  if (profile.role === "read_only") throw new AppError("Read-only users cannot log activities", "FORBIDDEN");
  const companyId = profile.company_id;
  const nowIso = new Date().toISOString();
  const activity = await data("Activity", companyId).create({
    contact_id: body.contact_id || null,
    lead_id: body.lead_id || null,
    activity_type: body.activity_type,
    channel: body.channel || "internal",
    direction: body.direction || "outbound",
    subject: body.subject || null,
    content_summary: String(body.content_summary || "").trim(),
    outcome: body.outcome || null,
    activity_at: body.activity_at || nowIso,
    duration_minutes: body.duration_minutes != null ? parseInt(body.duration_minutes, 10) || null : null,
    performed_by_user_id: user.id,
    completed: true,
  });

  if (body.lead_id) {
    const lead = await data("Lead", companyId).get(body.lead_id);
    const patch = { last_activity_at: nowIso };
    if (lead && lead.status === "open" && !lead.first_response_at && (body.direction || "outbound") === "outbound") {
      patch.first_response_at = nowIso;
    }
    await data("Lead", companyId).update(body.lead_id, patch);
  }
  if (body.contact_id) {
    await data("Contact", companyId).update(body.contact_id, { last_contacted_at: nowIso });
  }

  let task = null;
  if (body.next_step && body.next_step.title && body.next_step.due_at) {
    task = await data("FollowUpTask", companyId).create({
      title: String(body.next_step.title).trim(),
      contact_id: body.contact_id || null,
      lead_id: body.lead_id || null,
      owner_user_id: body.next_step.owner_user_id || user.id,
      created_by_user_id: user.id,
      due_at: body.next_step.due_at,
      priority: body.next_step.priority || "normal",
      status: "open",
      linked_activity_id: activity.id,
    });
  }
  return { activity, task };
}

export async function changeLeadStage(body) {
  const { user, profile } = await currentMembership();
  if (profile.role === "read_only") throw new AppError("Read-only users cannot change lead stages", "FORBIDDEN");
  const companyId = profile.company_id;
  const lead = await data("Lead", companyId).get(body.lead_id);
  if (!lead) throw new AppError("Lead not found", "NOT_FOUND");
  const stages = await data("PipelineStage", companyId).filter({ pipeline_id: lead.pipeline_id }, "position", 50);
  const newStage = stages.find((s) => s.id === body.new_stage_id);
  if (!newStage) throw new AppError("Target stage not found in this lead's pipeline", "VALIDATION");
  if (newStage.id === lead.pipeline_stage_id) return { id: lead.id, unchanged: true };

  const now = new Date().toISOString();
  const updates = {
    pipeline_stage_id: newStage.id,
    probability_percentage:
      body.probability_override != null
        ? Math.max(0, Math.min(100, parseInt(body.probability_override, 10) || 0))
        : newStage.probability_percentage,
    last_activity_at: now,
  };
  if (newStage.is_lost) {
    if (!body.lost_reason || String(body.lost_reason).trim().length < 2) {
      throw new AppError("A lost reason is required when moving a lead to Lost", "VALIDATION");
    }
    updates.status = "lost";
    updates.lost_reason = String(body.lost_reason).trim();
    updates.lost_at = now;
    updates.closed_at = now;
  } else if (newStage.is_won) {
    updates.status = "won";
    updates.won_at = now;
    updates.closed_at = now;
  } else {
    updates.status = "open";
  }

  const updated = await data("Lead", companyId).update(lead.id, updates);
  await data("Activity", companyId).create({
    contact_id: lead.contact_id,
    lead_id: lead.id,
    activity_type: "stage_change",
    channel: "internal",
    direction: "internal",
    subject: "Stage changed",
    content_summary: `Moved to ${newStage.name}`,
    activity_at: now,
    performed_by_user_id: user.id,
    completed: true,
  });
  return updated;
}

export async function completeTask(body) {
  const { user, profile } = await currentMembership();
  if (profile.role === "read_only") throw new AppError("Read-only users cannot complete tasks", "FORBIDDEN");
  const companyId = profile.company_id;
  const task = await data("FollowUpTask", companyId).get(body.task_id);
  if (!task) throw new AppError("Task not found", "NOT_FOUND");
  const now = new Date().toISOString();
  const updated = await data("FollowUpTask", companyId).update(task.id, {
    status: "completed",
    completed_at: now,
    completed_by_user_id: user.id,
    completion_outcome: body.outcome || null,
  });
  await data("Activity", companyId).create({
    contact_id: task.contact_id,
    lead_id: task.lead_id,
    activity_type: "task_completed",
    channel: "internal",
    direction: "internal",
    subject: task.title,
    content_summary: body.outcome || "Task completed",
    activity_at: now,
    performed_by_user_id: user.id,
    completed: true,
  });
  return updated;
}

/** Hook-friendly re-export so pages can keep a single import path. */
export { useWorkspace };
