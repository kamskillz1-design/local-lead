import * as React from "react";
import { cn } from "@/lib/utils";

const Ctx = React.createContext(null);

export function DropdownMenu({ open, onOpenChange, children }) {
  const [inner, setInner] = React.useState(false);
  const isOpen = open ?? inner;
  const setOpen = onOpenChange ?? setInner;
  return <Ctx.Provider value={{ open: isOpen, setOpen }}>{children}</Ctx.Provider>;
}

export function DropdownMenuTrigger({ asChild, children }) {
  const ctx = React.useContext(Ctx);
  const onClick = () => ctx?.setOpen(!ctx.open);
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, { onClick });
  }
  return <button type="button" onClick={onClick}>{children}</button>;
}

export function DropdownMenuContent({ className, align, children }) {
  const ctx = React.useContext(Ctx);
  if (!ctx?.open) return null;
  return (
    <div className={cn("absolute z-50 mt-2 min-w-[10rem] rounded-md border bg-popover p-1 shadow", align === "end" ? "right-0" : "left-0", className)}>
      {children}
    </div>
  );
}

export function DropdownMenuItem({ className, onClick, children }) {
  const ctx = React.useContext(Ctx);
  return (
    <button
      type="button"
      className={cn("w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent", className)}
      onClick={() => {
        onClick?.();
        ctx?.setOpen(false);
      }}
    >
      {children}
    </button>
  );
}
