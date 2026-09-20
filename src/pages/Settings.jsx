import React, { useState } from "react";
import SettingsCompanyTab from "@/components/settings/SettingsCompanyTab";
import SettingsTeamTab from "@/components/settings/SettingsTeamTab";
import SettingsPipelinesTab from "@/components/settings/SettingsPipelinesTab";
import SettingsSourcesTab from "@/components/settings/SettingsSourcesTab";
import SettingsTagsTab from "@/components/settings/SettingsTagsTab";
import SettingsTemplatesTab from "@/components/settings/SettingsTemplatesTab";
import SettingsFormsTab from "@/components/settings/SettingsFormsTab";
import SettingsAuditTab from "@/components/settings/SettingsAuditTab";

const TABS = [
  ["company", "Company"],
  ["team", "Team"],
  ["pipelines", "Pipelines"],
  ["sources", "Sources"],
  ["tags", "Tags"],
  ["templates", "Templates"],
  ["forms", "Forms"],
  ["audit", "Audit"],
];

export default function Settings() {
  const [tab, setTab] = useState("company");
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Settings</h1>
      <div className="flex flex-wrap gap-2">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`h-8 px-3 rounded-md text-sm border ${tab === id ? "bg-primary text-primary-foreground" : "bg-background"}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "company" && <SettingsCompanyTab />}
      {tab === "team" && <SettingsTeamTab />}
      {tab === "pipelines" && <SettingsPipelinesTab />}
      {tab === "sources" && <SettingsSourcesTab />}
      {tab === "tags" && <SettingsTagsTab />}
      {tab === "templates" && <SettingsTemplatesTab />}
      {tab === "forms" && <SettingsFormsTab />}
      {tab === "audit" && <SettingsAuditTab />}
    </div>
  );
}
