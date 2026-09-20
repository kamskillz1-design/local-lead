import * as React from "react";
import { cn } from "@/lib/utils";

export const Checkbox = React.forwardRef(({ className, checked, onCheckedChange, ...props }, ref) => (
  <input
    ref={ref}
    type="checkbox"
    className={cn("h-4 w-4 rounded border", className)}
    checked={!!checked}
    onChange={(e) => onCheckedChange?.(e.target.checked)}
    {...props}
  />
));
Checkbox.displayName = "Checkbox";
