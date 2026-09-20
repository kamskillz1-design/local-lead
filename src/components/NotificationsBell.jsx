import React, { useEffect, useState, useCallback } from "react";
import { Bell, X, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { repo } from "@/adapters/base44/entities";
import { useWorkspace } from "@/app/workspace";
import { useI18n } from "@/i18n";
import { relativeTime } from "@/domain/rules";
import { cn } from "@/lib/utils";

const SEVERITY_STYLES = {
  info: "bg-blue-50 border-blue-100",
  success: "bg-green-50 border-green-100",
  warning: "bg-amber-50 border-amber-100",
  critical: "bg-red-50 border-red-100",
};

export default function NotificationsBell() {
  const { user, company } = useWorkspace();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!company || !user) return;
    setLoading(true);
    try {
      const items = await repo("Notification", company.company_id).filter({ user_id: user.id }, "-created_date", 30);
      setNotifications(items || []);
    } catch (e) {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [company, user]);

  useEffect(() => { load(); }, [load]);

  const unread = notifications.filter((n) => !n.read_at && !n.dismissed_at);
  const markAllRead = async () => {
    const unreadItems = unread.map((n) => ({ id: n.id, read_at: new Date().toISOString() }));
    if (unreadItems.length > 0) await repo("Notification", company.company_id).bulkUpdate(unreadItems);
    load();
  };
  const dismiss = async (id) => {
    await repo("Notification", company.company_id).update(id, { dismissed_at: new Date().toISOString() });
    load();
  };

  const visible = notifications.filter((n) => !n.dismissed_at).slice(0, 15);

  return (
    <DropdownMenu open={open} onOpenChange={(o) => { setOpen(o); if (o) load(); }}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={t("notifications.title")}>
          <Bell className="h-4 w-4" />
          {unread.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
              {unread.length > 9 ? "9+" : unread.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-2 border-b">
          <span className="text-sm font-semibold">{t("notifications.title")}</span>
          {unread.length > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllRead}>
              <CheckCheck className="h-3.5 w-3.5 mr-1" /> {t("notifications.mark_read")}
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {loading && <p className="p-4 text-sm text-muted-foreground">{t("common.loading")}</p>}
          {!loading && visible.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">{t("notifications.empty")}</p>
          )}
          {visible.map((n) => (
            <div key={n.id} className={cn("border-b last:border-0 px-4 py-2.5 flex items-start justify-between gap-2", !n.read_at && SEVERITY_STYLES[n.severity] || "")}>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{n.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{relativeTime(n.created_date)}</p>
              </div>
              <button className="text-muted-foreground hover:text-foreground shrink-0" onClick={() => dismiss(n.id)} aria-label="Dismiss">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}