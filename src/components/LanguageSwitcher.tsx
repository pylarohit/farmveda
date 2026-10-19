"use client";

import { useState } from "react";
import { Globe, Check, ChevronRight } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useLanguage, SUPPORTED_LANGUAGES, LangCode } from "@/context/LanguageProvider";
import { cn } from "@/lib/utils";

interface LanguageSwitcherProps {
  /** "sidebar" shows an icon+label button; "inline" shows a compact globe icon */
  variant?: "sidebar" | "inline";
  onSelect?: () => void;
}

export function LanguageSwitcher({
  variant = "sidebar",
  onSelect,
}: LanguageSwitcherProps) {
  const { lang, setLang, t } = useLanguage();
  const [open, setOpen] = useState(false);

  function handleSelect(code: LangCode) {
    setLang(code);
    setOpen(false);
    onSelect?.();
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {variant === "sidebar" ? (
          <Button
            variant="ghost"
            className="justify-between w-full font-roboto hover:bg-gray-50 rounded-none cursor-pointer text-slate-700"
          >
            <div className="flex gap-2 items-center">
              <Globe className="text-[18px] w-[18px] h-[18px]" />
              {t("language", "changeLanguage")}
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full hover:bg-slate-100"
            title={t("language", "changeLanguage")}
          >
            <Globe className="h-4 w-4 text-slate-600" />
          </Button>
        )}
      </PopoverTrigger>

      <PopoverContent
        className="w-64 p-2 shadow-xl rounded-xl border border-slate-100"
        align="end"
        sideOffset={8}
      >
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-2 pb-2">
          {t("language", "selectLanguage")}
        </p>
        <div className="flex flex-col gap-0.5 max-h-72 overflow-y-auto pr-1">
          {SUPPORTED_LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => handleSelect(l.code as LangCode)}
              className={cn(
                "flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg w-full text-left transition-colors cursor-pointer",
                lang === l.code
                  ? "bg-emerald-50 text-emerald-700"
                  : "hover:bg-slate-50 text-slate-700"
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-lg leading-none">{l.flag}</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-tight truncate">
                    {l.nativeName}
                  </p>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    {l.name}
                  </p>
                </div>
              </div>
              {lang === l.code && (
                <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
