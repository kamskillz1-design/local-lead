import React, { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useWorkspace } from "@/app/workspace";
import { data } from "@/app/services/crmService";
import { canManageOperationalRecords } from "@/domain/policies";
import { useToast } from "@/components/ui/use-toast";

export default function SettingsTagsTab() {
  const { profile, company } = useWorkspace();
  const { toast } = useToast();
  const [tags, setTags] = useState([]);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3b82f6");

  const load = () => data("Tag", company.company_id).filter({}).then(setTags).catch(() => setTags([]));
  useEffect(() => { if (company) load(); }, [company]);

  if (!company) return null;
  const editable = canManageOperationalRecords(profile);

  const create = async () => {
    if (name.trim().length < 2) return toast({ title: "Tag name is required", variant: "destructive" });
    try {
      await data("Tag", company.company_id).create({ name: name.trim(), color, active: true });
      toast({ title: "Tag created" });
      setName("");
      load();
    } catch (e) {
      toast({ title: e.message || "Could not create tag", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      {editable && (
        <Card>
          <CardContent className="pt-4 pb-4 grid sm:grid-cols-3 gap-3 items-end">
            <Input placeholder="Tag name (e.g. VIP)" value={name} onChange={(e) => setName(e.target.value)} />
            <Input type="color" className="h-9 p-1" value={color} onChange={(e) => setColor(e.target.value)} aria-label="Tag colour" />
            <Button onClick={create}><Plus className="h-4 w-4 mr-1" /> Add tag</Button>
          </CardContent>
        </Card>
      )}
      <div className="flex flex-wrap gap-2">
        {tags.map((t) => (
          <span key={t.id} className="inline-flex items-center gap-1.5 text-xs border rounded-full px-3 py-1.5" style={{ borderColor: t.color }}>
            <span className="w-2 h-2 rounded-full" style={{ background: t.color }} />
            {t.name}
          </span>
        ))}
        {tags.length === 0 && <p className="text-sm text-muted-foreground">No tags yet.</p>}
      </div>
    </div>
  );
}