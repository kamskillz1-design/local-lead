import React, { useState, useEffect } from "react";
import { UserPlus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useWorkspace } from "@/app/workspace";
import { data } from "@/app/services/crmService";
import { ROLES, ROLE_LABELS } from "@/domain/constants";
import { canManageTeam, canChangeRoles } from "@/domain/policies";
import { inviteUser } from "@/adapters/base44/auth";
import { useToast } from "@/components/ui/use-toast";

export default function SettingsTeamTab() {
  const { profile, company, refresh } = useWorkspace();
  const { toast } = useToast();
  const [team, setTeam] = useState([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("staff");
  const [busy, setBusy] = useState(false);

  const load = () => data("UserProfile", company.company_id).filter({ active: true }).then(setTeam).catch(() => setTeam([]));
  useEffect(() => { if (company) load(); }, [company]);

  if (!company) return null;

  const sendInvite = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(inviteEmail)) return toast({ title: "Enter a valid email", variant: "destructive" });
    setBusy(true);
    try {
      await inviteUser(inviteEmail, "user");
      toast({
        title: "Invitation sent",
        description: `${inviteEmail} must register, then join your workspace with invite code ${company.invite_code}. They will join as ${ROLE_LABELS[inviteRole]}.`,
      });
      setInviteOpen(false); setInviteEmail("");
    } catch (e) {
      toast({ title: e.message || "Could not send invitation", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const changeRole = async (member, role) => {
    const activeOwners = team.filter((m) => m.role === "owner" && m.active !== false);
    if (member.role === "owner" && role !== "owner" && activeOwners.length <= 1) {
      return toast({ title: "A company must keep at least one active owner", variant: "destructive" });
    }
    try {
      await data("UserProfile", company.company_id).update(member.id, { role });
      await data("AuditLog", company.company_id).create({
        actor_user_id: profile.user_id, actor_name: profile.full_name,
        action: "user.role_change", entity_type: "user_profile", entity_id: member.user_id,
        before: { role: member.role }, after: { role },
      });
      toast({ title: `Role updated for ${member.full_name}` });
      load();
    } catch (e) {
      toast({ title: e.message || "Could not change role", variant: "destructive" });
    }
  };

  const toggleActive = async (member) => {
    const activeOwners = team.filter((m) => m.role === "owner" && m.active !== false);
    if (member.role === "owner" && member.active !== false && activeOwners.length <= 1) {
      return toast({ title: "Cannot deactivate the only active owner", variant: "destructive" });
    }
    try {
      const active = member.active === false;
      await data("UserProfile", company.company_id).update(member.id, { active });
      toast({ title: active ? "User reactivated" : "User deactivated" });
      load();
    } catch (e) {
      toast({ title: e.message || "Could not update user", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Invite teammates and manage their roles. Invite code: <span className="font-mono font-semibold">{company.invite_code}</span></p>
        {canManageTeam(profile) && (
          <Button size="sm" onClick={() => setInviteOpen(true)}><UserPlus className="h-4 w-4 mr-1" /> Invite user</Button>
        )}
      </div>

      <div className="space-y-2">
        {team.map((m) => (
          <Card key={m.id}>
            <CardContent className="pt-4 pb-4 flex flex-wrap items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold">
                {(m.full_name || "?").slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{m.full_name} {m.user_id === profile.user_id && <span className="text-xs text-muted-foreground">(you)</span>}</p>
                <p className="text-xs text-muted-foreground">{m.email}{m.active === false ? " · deactivated" : ""}</p>
              </div>
              {canChangeRoles(profile) ? (
                <select
                  className="h-8 rounded-md border bg-background px-2 text-sm capitalize"
                  value={m.role}
                  onChange={(e) => changeRole(m, e.target.value)}
                  aria-label={`Role for ${m.full_name}`}
                >
                  {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              ) : (
                <span className="text-sm text-muted-foreground">{ROLE_LABELS[m.role]}</span>
              )}
              {canManageTeam(profile) && m.user_id !== profile.user_id && (
                <Button size="sm" variant="outline" onClick={() => toggleActive(m)}>
                  {m.active === false ? "Reactivate" : "Deactivate"}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
        {team.length <= 1 && (
          <p className="text-sm text-muted-foreground flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> You are the only team member — invite teammates with the button above.</p>
        )}
      </div>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Invite a teammate</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Email</Label>
              <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="teammate@company.com" />
            </div>
            <div className="grid gap-1.5">
              <Label>CRM role on join</Label>
              <select className="h-9 rounded-md border bg-background px-3 text-sm" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                {ROLES.filter((r) => r !== "owner").map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </div>
            <p className="text-xs text-muted-foreground">
              An account invitation email is sent. After registering, they join this workspace using the invite code {company.invite_code}.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={sendInvite} disabled={busy}>{busy ? "Sending…" : "Send invitation"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}