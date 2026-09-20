import React, { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useWorkspace } from "@/app/workspace";
import { data } from "@/app/services/crmService";
import { SOURCE_CHANNELS } from "@/domain/constants";
import { canManageOperationalRecords } from "@/domain/policies";
import { useToast } from "@/components/ui/use-toast";

export default function SettingsSourcesTab() {
  const { profile, company } = useWorkspace();
  const { toast } = useToast();
  const [sources, setSources] = useState([]);
  const [name, setName] = useState("");
  const [channel, setChannel] = useState("website_form");

  const load = () => data("LeadSource", company.company_id).filter({}).then(setSources).catch(() => setSources([]));
  useEffect(() => { if (company) load(); }, [company]);

  if (!company) return null;
  const editable = canManageOperationalRecords(profile);

  const create = async () => {
    if (name.trim().length < 2) return toast({ title: "Source name is required", variant: "destructive" });
    try {
      await data("LeadSource", company.company_id).create({ name: name.trim(), channel, active: true });
      toast({ title: "Lead source created" });
      setName("");
      load();
    } catch (e) {
      toast({ title: e.message || "Could not create source", variant: "destructive" });
    }
  };

  const toggleActive = async (s) => {
    try {
      await data("LeadSource", company.company_id).update(s.id, { active: s.active === false });
      load();
    } catch (e) {
      toast({ title: e.message || "Could not update source", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      {editable && (
        <Card>
          <CardContent className="pt-4 pb-4 grid sm:grid-cols-3 gap-3 items-end">
            <Input placeholder="Source name (e.g. Google Ads)" value={name} onChange={(e) => setName(e.target.value)} />
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SOURCE_CHANNELS.map((c) => <SelectItem key={c} value={c} className="capitalize">{c.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={create}><Plus className="h-4 w-4 mr-1" /> Add source</Button>
          </CardContent>
        </Card>
      )}
      <div className="space-y-2">
        {sources.map((s) => (
          <Card key={s.id}>
            <CardContent className="pt-3 pb-3 flex items-center gap-3 text-sm">
              <span className="font-medium flex-1 truncate">{s.name}</span>
              <span className="text-xs bg-muted rounded px-2 py-0.5 capitalize">{s.channel.replace(/_/g, " ")}</span>
              {editable && (
                <>
                  <Button size="sm" variant="outline" onClick={() => toggleActive(s)}>{s.active === false ? "Reactivate" : "Deactivate"}</Button>
                </>
              )}
            </CardContent>
          </Card>
        ))}
        {sources.length === 0 && <p className="text-sm text-muted-foreground">No lead sources yet.</p>}
      </div>
    </div>
  );
}