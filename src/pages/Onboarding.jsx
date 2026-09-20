import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/app/workspace";

export default function Onboarding() {
  const navigate = useNavigate();
  const { company } = useWorkspace();
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-semibold">Workspace ready</h1>
      <p className="text-muted-foreground max-w-md">
        {company?.name || "Your company"} is set up. Default pipeline and sources can be added from Settings.
      </p>
      <Button onClick={() => navigate("/", { replace: true })}>Go to dashboard</Button>
    </div>
  );
}
