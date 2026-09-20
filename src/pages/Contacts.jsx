import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useWorkspace } from "@/app/workspace";
import { data } from "@/app/services/crmService";
import ContactFormDialog from "@/components/ContactFormDialog";
import { Button } from "@/components/ui/button";

export default function Contacts() {
  const { company } = useWorkspace();
  const [params] = useSearchParams();
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const q = (params.get("q") || "").toLowerCase();
  const load = () => data("Contact", company.company_id).filter({}, "-created_date", 200).then(setRows).catch(() => setRows([]));
  useEffect(() => { if (company) load(); }, [company]);
  const visible = rows.filter((c) => !q || `${c.full_name} ${c.email} ${c.phone}`.toLowerCase().includes(q));
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Contacts</h1>
        <Button onClick={() => setOpen(true)}>Add contact</Button>
      </div>
      <div className="divide-y border rounded-lg bg-white">
        {visible.map((c) => (
          <Link key={c.id} to={`/contacts/${c.id}`} className="block px-4 py-3 hover:bg-muted">
            <p className="text-sm font-medium">{c.full_name}</p>
            <p className="text-xs text-muted-foreground">{c.email} {c.phone}</p>
          </Link>
        ))}
        {visible.length === 0 && <p className="p-4 text-sm text-muted-foreground">No contacts</p>}
      </div>
      <ContactFormDialog open={open} onOpenChange={setOpen} onSaved={load} />
    </div>
  );
}
