import React, { useState, useEffect } from "react";
import {
  Phone, Mail, MessageCircle, StickyNote, CalendarDays, ArrowLeftRight,
  CheckSquare, PlusSquare, FileText, Globe, Zap, Settings2, History,
} from "lucide-react";
import { data } from "@/app/services/crmService";
import { useWorkspace } from "@/app/workspace";
import EmptyState from "@/components/EmptyState";
import { formatDateTime, displayTaskStatus } from "@/domain/rules";
import StatusBadge from "@/components/StatusBadge";
import { cn } from "@/lib/utils";

const TYPE_ICONS = {
  note: StickyNote, call: Phone, email: Mail, whatsapp_message: MessageCircle,
  sms_message: MessageCircle, social_message: Globe, meeting: CalendarDays,
  appointment: CalendarDays, stage_change: ArrowLeftRight, task_completed: CheckSquare,
  task_created: PlusSquare, quote_sent: FileText, form_submission: Globe,
  integration_event: Zap, system_event: Settings2,
};

const DIRECTION_LABEL = { inbound: "Inbound", outbound: "Outbound", internal: "Internal", automated: "Automated" };

export default function ActivityTimeline({ contactId, leadId, limit = 30 }) {
  const { company } = useWorkspace();
  const [activities, setActivities] = useState(null);
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    if (!company) return;
    let query = {};
    if (leadId) query = { lead_id: leadId };
    else if (contactId) query = { contact_id: contactId };
    Promise.all([
      data("Activity", company.company_id).filter(query, "-activity_at", limit),
      leadId || contactId
        ? data("FollowUpTask", company.company_id).filter(query, "-due_at", 10)
        : Promise.resolve([]),
    ]).then(([a, t]) => { setActivities(a || []); setTasks(t || []); })
      .catch(() => setActivities([]));
  }, [company, contactId, leadId, limit]);

  if (activities === null) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>;
  }
  if (activities.length === 0) {
    return <EmptyState title="No activity yet" description="Logged calls, emails, WhatsApp messages and notes will appear here." icon={History} />;
  }

  return (
    <div className="space-y-1">
      {tasks.length > 0 && (
        <div className="mb-3 space-y-1.5">
          {tasks.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-2 text-xs bg-muted/60 rounded-lg px-3 py-2">
              <span className="truncate font-medium">{t.title}</span>
              <span className="flex items-center gap-2 shrink-0">
                <StatusBadge status={displayTaskStatus(t)} />
                <span className="text-muted-foreground">{formatDateTime(t.due_at)}</span>
              </span>
            </div>
          ))}
        </div>
      )}
      {activities.map((a) => {
        const Icon = TYPE_ICONS[a.activity_type] || History;
        return (
          <div key={a.id} className="flex gap-3 py-2.5 border-b last:border-0">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
              <Icon className="h-4 w-4 text-slate-500" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2 flex-wrap">
                <p className="text-sm font-medium">{a.subject || a.activity_type.replace(/_/g, " ")}</p>
                <span className={cn("text-[11px] uppercase tracking-wide text-muted-foreground")}>
                  {a.channel} · {DIRECTION_LABEL[a.direction] || a.direction}
                </span>
              </div>
              {a.content_summary && <p className="text-sm text-muted-foreground mt-0.5 break-words">{a.content_summary}</p>}
              {a.outcome && <span className="inline-block mt-1 text-xs bg-slate-100 rounded px-1.5 py-0.5 capitalize">{a.outcome.replace(/_/g, " ")}</span>}
              <p className="text-[11px] text-muted-foreground mt-1">{formatDateTime(a.activity_at || a.created_date)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}