import * as React from "react";
import { cn } from "@/lib/utils";

const DialogCtx = React.createContext(null);

export function Dialog({ open, onOpenChange, children }) {
  return <DialogCtx.Provider value={{ open: !!open, onOpenChange }}>{open ? children : null}</DialogCtx.Provider>;
}

export function DialogContent({ className, children }) {
  const ctx = React.useContext(DialogCtx);
  if (!ctx?.open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => ctx.onOpenChange?.(false)}
    >
      <div
        className={cn("bg-background rounded-xl border shadow-lg w-full max-w-lg p-6", className)}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({ className, ...props }) {
  return <div className={cn("mb-3", className)} {...props} />;
}
export function DialogTitle({ className, ...props }) {
  return <h2 className={cn("text-lg font-semibold", className)} {...props} />;
}
export function DialogFooter({ className, ...props }) {
  return <div className={cn("mt-4 flex justify-end gap-2", className)} {...props} />;
}
