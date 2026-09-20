import React, { useEffect, useState } from "react";
import { useWorkspace } from "@/app/workspace";
import { data } from "@/app/services/crmService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Reports() {
  const { company } = useWorkspace();
  const [counts, setCounts] = useState({});
  useEffect(() => {
    if (!company) return;
    Promise.all([
      data("Lead", company.company_id).filter({ status: "open" }),
      data("Lead", company.company_id).filter({ status: "won" }),
      data("Lead", company.company_id).filter({ status: "lost" }),
    ]).then(([open, won, lost]) => setCounts({ open: open.length, won: won.length, lost: lost.length })).catch(() => {});
  }, [company]);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Reports</h1>
      <div className="grid sm:grid-cols-3 gap-4">
        <Card><CardHeader><CardTitle className="text-base">Open</CardTitle></CardHeader><CardContent>{counts.open ?? "—"}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Won</CardTitle></CardHeader><CardContent>{counts.won ?? "—"}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Lost</CardTitle></CardHeader><CardContent>{counts.lost ?? "—"}</CardContent></Card>
      </div>
    </div>
  );
}
