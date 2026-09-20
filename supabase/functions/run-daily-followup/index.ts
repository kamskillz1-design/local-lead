// Deploy + schedule (Europe/Madrid 07:00): supabase functions deploy run-daily-followup
// Replaces Base44 workflow "Daily Follow-up Automation".
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const now = new Date().toISOString();
  const { data: openTasks } = await supabase
    .from("follow_up_tasks")
    .select("id, owner_user_id, company_id, title, due_at")
    .in("status", ["open", "in_progress"])
    .lt("due_at", now)
    .limit(500);

  for (const task of openTasks || []) {
    await supabase.from("follow_up_tasks").update({ status: "overdue" }).eq("id", task.id);
    if (task.owner_user_id) {
      await supabase.from("notifications").insert({
        company_id: task.company_id,
        user_id: task.owner_user_id,
        type: "task_overdue",
        title: "Follow-up overdue",
        message: task.title,
        severity: "warning",
        related_entity_type: "follow_up_task",
        related_entity_id: task.id,
        delivered_at: now,
      });
    }
  }

  return Response.json({ ok: true, data: { overdue: (openTasks || []).length } });
});
