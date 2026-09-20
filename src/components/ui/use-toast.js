export function useToast() {
  return {
    toast: ({ title, description, variant } = {}) => {
      if (typeof window === "undefined") return;
      const msg = [title, description].filter(Boolean).join(" — ");
      if (variant === "destructive") console.error(msg);
      else console.info(msg);
    },
  };
}
