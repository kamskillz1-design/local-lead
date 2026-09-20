import React, { useState } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, Target, Inbox, CheckSquare, CalendarDays, BarChart3,
  Settings, HelpCircle, Search, LogOut, Plus, Menu, X, Building2,
} from "lucide-react";
import { useWorkspace } from "@/app/workspace";
import { useI18n } from "@/i18n";
import { signOut } from "@/adapters/base44/auth";
import NotificationsBell from "@/components/NotificationsBell";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { ROLE_LABELS } from "@/domain/constants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import LeadFormDialog from "@/components/LeadFormDialog";

const NAV_ITEMS = [
  { to: "/", key: "nav.dashboard", icon: LayoutDashboard, end: true },
  { to: "/contacts", key: "nav.contacts", icon: Users },
  { to: "/leads", key: "nav.leads", icon: Target },
  { to: "/inbox", key: "nav.inbox", icon: Inbox },
  { to: "/tasks", key: "nav.tasks", icon: CheckSquare },
  { to: "/calendar", key: "nav.calendar", icon: CalendarDays },
  { to: "/reports", key: "nav.reports", icon: BarChart3 },
  { to: "/settings", key: "nav.settings", icon: Settings },
  { to: "/help", key: "nav.help", icon: HelpCircle },
];

const MOBILE_ITEMS = NAV_ITEMS.slice(0, 5);

export default function AppShell() {
  const { user, profile, company } = useWorkspace();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [leadDialogOpen, setLeadDialogOpen] = useState(false);

  const submitSearch = (e) => {
    e.preventDefault();
    if (search.trim()) navigate(`/contacts?q=${encodeURIComponent(search.trim())}`);
  };

  const navLink = (item) => (
    <NavLink
      key={item.key}
      to={item.to}
      end={item.end}
      onClick={() => setMenuOpen(false)}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
          isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
        )
      }
    >
      <item.icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{t(item.key)}</span>
    </NavLink>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r bg-white">
        <div className="flex items-center gap-2 px-4 h-16 border-b">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">LL</div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{company?.name || "LocalLead CRM"}</p>
            <p className="text-[11px] text-muted-foreground">LocalLead CRM</p>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">{NAV_ITEMS.map(navLink)}</nav>
        <div className="p-3 border-t">
          <div className="flex items-center gap-2 px-2 py-1.5">
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold">
              {(profile?.full_name || user?.email || "?").slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate">{profile?.full_name || user?.email}</p>
              <p className="text-[11px] text-muted-foreground">{ROLE_LABELS[profile?.role] || profile?.role}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => signOut()} aria-label={t("action.sign_out")}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b bg-white flex items-center gap-2 px-4 lg:px-6 sticky top-0 z-20">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <form onSubmit={submitSearch} className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`${t("common.search")} contacts…`}
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-muted text-sm outline-none focus:ring-2 focus:ring-ring"
              aria-label={t("common.search")}
            />
          </form>
          <div className="flex items-center gap-1 ml-auto">
            <Button size="sm" className="hidden sm:flex items-center gap-1.5" onClick={() => setLeadDialogOpen(true)}>
              <Plus className="h-4 w-4" /> {t("action.add_lead")}
            </Button>
            <LanguageSwitcher />
            <NotificationsBell />
          </div>
        </header>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="lg:hidden border-b bg-white px-3 py-3 space-y-1">
            {NAV_ITEMS.map(navLink)}
            <button
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground w-full"
              onClick={() => signOut()}
            >
              <LogOut className="h-4 w-4" /> {t("action.sign_out")}
            </button>
          </div>
        )}

        <main className="flex-1 p-4 lg:p-6 pb-20 lg:pb-6 overflow-x-hidden">
          <Outlet />
        </main>

        {/* Mobile bottom navigation */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t flex">
          {MOBILE_ITEMS.map((item) => (
            <NavLink
              key={item.key}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn("flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium",
                  isActive ? "text-primary" : "text-muted-foreground")
              }
            >
              <item.icon className="h-5 w-5" />
              <span className="truncate max-w-full px-1">{t(item.key)}</span>
            </NavLink>
          ))}
          <button
            className="flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium text-primary"
            onClick={() => setLeadDialogOpen(true)}
          >
            <span className="w-9 h-9 -mt-3 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
              <Plus className="h-5 w-5" />
            </span>
            <span>{t("action.add_lead")}</span>
          </button>
        </nav>
      </div>

      <LeadFormDialog
        open={leadDialogOpen}
        onOpenChange={setLeadDialogOpen}
        onCreated={(lead) => { setLeadDialogOpen(false); navigate(`/leads/${lead.id}`); }}
      />
    </div>
  );
}