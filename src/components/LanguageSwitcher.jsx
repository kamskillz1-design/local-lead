import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Languages, Check } from "lucide-react";
import { useI18n, getSupportedLanguages } from "@/i18n";

const NAMES = { en: "English", es: "Español", eu: "Euskera" };

// The single language switcher of the application. Talks only to the central language module.
export default function LanguageSwitcher() {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Change language">
          <Languages className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {getSupportedLanguages().map((code) => (
          <DropdownMenuItem key={code} onClick={() => setLang(code)} className="flex items-center gap-2">
            <span className="w-4">{lang === code && <Check className="h-3.5 w-3.5" />}</span>
            {NAMES[code] || code}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}