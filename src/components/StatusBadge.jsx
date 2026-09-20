import React from "react";
import { STATUS_COLORS, PRIORITY_COLORS } from "@/domain/constants";
import { cn } from "@/lib/utils";

export default function StatusBadge({ status, type = "status", className }) {
  const map = type === "priority" ? PRIORITY_COLORS : STATUS_COLORS;
  const color = map[status] || "bg-slate-100 text-slate-600";
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize", color, className)}>
      {String(status || "").replace(/_/g, " ")}
    </span>
  );
}