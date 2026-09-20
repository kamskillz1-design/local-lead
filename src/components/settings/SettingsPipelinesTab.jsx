import React, { useState, useEffect } from "react";
import { Plus, ListPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useWorkspace } from "@/app/workspace";
import { data } from "@/app/services/crmService";
import { DEFAULT_PIPELINE_STAGES } from "@/domain/constants";
import { canManageOperationalRecords } from "@/domain/policies";
import { useToast } from "@/components/ui/use-toast";

export default function SettingsPipelinesTab() {
  const { profile, company } = useWorkspace();
  const { toast } = useToast();
  const [pipelines, setPipelines] = useState([]);
  const [stages, setStages] = useState([]);
  const [name, setName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [busy, setBusy] = useState(false);
  const [stageForm, setStageForm] = useState(null); // { pipelineId, name, probability, color }

  const load = async () => {
    const [ps, allStages] = await Promise.all([
      data("Pipeline", company.company_id).filter({}),
      data("PipelineStage", company.company_id).filter({}, "position", 200),
    ]);
    setPipelines(ps || []);
    setStages(allStages || []);
  };
  useEffect(() => { if (company) load(); }, [company]);

  if (!company) return null;
  const editable = canManageOperationalRecords(profile);

  const createPipeline = async () => {
    if (name.trim().length < 2) return toast({ title: "Pipeline name is required", variant: "destructive" });
    setBusy(true);
    try {
      const pipeline = await data("Pipeline", company.company_id).create({
        name: name.trim(), business_type: businessType || "", active: true, is_default: pipelines.length === 0,
      });
      await data("PipelineStage", company.company_id).bulkCreate(
        DEFAULT_PIPELINE_STAGES.map((s, i) => ({
          pipeline_id: pipeline.id, name: s.name, position: i + 1,
          probability_percentage: s.probability, color: s.color,
          is_closed: Boolean(s.is_closed), is_won: Boolean(s.is_won), is_lost: Boolean(s.is_lost), active: true,
        }))
      );
      toast({ title: `Pipeline “${pipeline.name}” created with default stages` });
      setName(""); setBusinessType("");
      load();
    } catch (e) {
      toast({ title: e.message || "Could not create pipeline", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const addStage = async () => {
    const { pipelineId, stageName, probability, color } = stageForm;
    if (stageName.trim().length < 2) return toast({ title: "Stage name is required", variant: "destructive" });
    const pipelineStages = stages.filter((s) => s.pipeline_id === pipelineId);
    try {
      await data("PipelineStage", company.company_id).create({
        pipeline_id: pipelineId, name: stageName.trim(),
        position: pipelineStages.length + 1,
        probability_percentage: Math.max(0, Math.min(100, parseInt(probability || "10", 10) || 10)),
        color: color || "#3b82f6", active: true,
      });
      toast({ title: "Stage added" });
      setStageForm(null);
      load();
    } catch (e) {
      toast({ title: e.message || "Could not add stage", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-5">
      {editable && (
        <Card>
          <CardContent className="pt-4 pb-4 grid sm:grid-cols-3 gap-3 items-end">
            <div className="grid gap-1.5"><Label>New pipeline name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Restaurant Bookings" /></div>
            <div className="grid gap-1.5"><Label>Business type (optional)</Label><Input value={businessType} onChange={(e) => setBusinessType(e.target.value)} placeholder="e.g. restaurant" /></div>
            <Button onClick={createPipeline} disabled={busy}><Plus className="h-4 w-4 mr-1" /> {busy ? "Creating…" : "Create pipeline"}</Button>
          </CardContent>
        </Card>
      )}

      {pipelines.map((p) => {
        const pStages = stages.filter((s) => s.pipeline_id === p.id).sort((a, b) => a.position - b.position);
        return (
          <Card key={p.id}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div>
                  <p className="text-sm font-semibold">{p.name} {p.is_default && <span className="text-xs text-muted-foreground font-normal">(default)</span>}</p>
                  {p.business_type && <p className="text-xs text-muted-foreground">{p.business_type}</p>}
                </div>
                {editable && (
                  <Button size="sm" variant="outline" onClick={() => setStageForm({ pipelineId: p.id, stageName: "", probability: "10", color: "#3b82f6" })}>
                    <ListPlus className="h-4 w-4 mr-1" /> Add stage
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {pStages.map((s) => (
                  <span key={s.id} className="inline-flex items-center gap-1.5 text-xs border rounded-full px-2.5 py-1" style={{ borderColor: s.color }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                    {s.name}
                    <span className="text-muted-foreground">{s.probability_percentage}%</span>
                    {(s.is_won || s.is_lost) && <span className="text-[10px] uppercase text-muted-foreground">{s.is_won ? "won" : "lost"}</span>}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {stageForm && (
        <Card className="border-primary">
          <CardContent className="pt-4 pb-4 grid sm:grid-cols-4 gap-3 items-end">
            <div className="grid gap-1.5"><Label>Stage name</Label><Input value={stageForm.stageName} onChange={(e) => setStageForm({ ...stageForm, stageName: e.target.value })} /></div>
            <div className="grid gap-1.5"><Label>Probability %</Label><Input type="number" min="0" max="100" value={stageForm.probability} onChange={(e) => setStageForm({ ...stageForm, probability: e.target.value })} /></div>
            <div className="grid gap-1.5"><Label>Colour</Label><Input type="color" className="h-9 p-1" value={stageForm.color} onChange={(e) => setStageForm({ ...stageForm, color: e.target.value })} /></div>
            <div className="flex gap-2">
              <Button size="sm" onClick={addStage}>Add</Button>
              <Button size="sm" variant="outline" onClick={() => setStageForm(null)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}