import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useWorkspace } from "@/app/workspace";
import { data } from "@/app/services/crmService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Dashboard() {
  const { company } = useWorkspace();
  const [stats, setStats] = useState({ leads: 0, contacts: 0, tasks: 0 });
  useEffect(() => {
    if (!company) return;
    Promise.all([
      data("Lead", company.company_id).filter({ status: "open" }, "-created_date", 500),
      data("Contact", company.company_id).filter({ active: true }, "-created_date", 500),
      data("FollowUpTask", company.company_id).filter({ status: "open" }, "-due_at", 500),
    ]).then(([leads, contacts, tasks]) => {
      setStats({ leads: leads.length, contacts: contacts.length, tasks: tasks.length });
    }).catch(() => {});
  }, [company]);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <div className="grid sm:grid-cols-3 gap-4">
        <Card><CardHeader><CardTitle className="text-base">Open leads</CardTitle></CardHeader><CardContent><Link to="/leads" className="text-2xl font-semibold">{stats.leads}</Link></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Contacts</CardTitle></CardHeader><CardContent><Link to="/contacts" className="text-2xl font-semibold">{stats.contacts}</Link></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Open tasks</CardTitle></CardHeader><CardContent><Link to="/tasks" className="text-2xl font-semibold">{stats.tasks}</Link></CardContent></Card>
      </div>
    </div>
  );
}
