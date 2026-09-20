import * as React from "react";
import { cn } from "@/lib/utils";

const Ctx = React.createContext(null);

export function Select({ value, onValueChange, children }) {
  return <Ctx.Provider value={{ value, onValueChange }}>{children}</Ctx.Provider>;
}

export function SelectTrigger({ className, children }) {
  return <div className={cn("h-9 rounded-md border px-3 text-sm flex items-center", className)}>{children}</div>;
}

export function SelectValue({ placeholder }) {
  const ctx = React.useContext(Ctx);
  return <span>{ctx?.value || placeholder}</span>;
}

export function SelectContent({ children }) {
  return <div className="mt-1 rounded-md border bg-background p-1">{children}</div>;
}

export function SelectItem({ value, children }) {
  const ctx = React.useContext(Ctx);
  return (
    <button type="button" className="block w-full text-left px-2 py-1 text-sm hover:bg-accent" onClick={() => ctx?.onValueChange?.(value)}>
      {children}
    </button>
  );
}
