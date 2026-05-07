"use client";

import { CheckIcon, LanguagesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocale } from "@/hooks/use-locale";
import { localeOptions } from "@/lib/i18n";

export function LanguageSelector({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { locale, setLocale, t } = useLocale();
  const selectedLocale =
    localeOptions.find((option) => option.id === locale) ?? localeOptions[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={t.language.tooltip}
          className={className}
          data-testid={
            compact ? "language-selector-mobile" : "language-selector"
          }
          size={compact ? "icon-sm" : "sm"}
          title={t.language.tooltip}
          variant="outline"
        >
          <LanguagesIcon className="size-4" />
          {compact ? (
            <span className="text-[11px]">{selectedLocale.shortLabel}</span>
          ) : (
            <span>{selectedLocale.label}</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36">
        {localeOptions.map((option) => (
          <DropdownMenuItem
            className="cursor-pointer justify-between"
            data-testid={`language-selector-item-${option.id}`}
            key={option.id}
            onSelect={() => setLocale(option.id)}
          >
            <span>{option.label}</span>
            {option.id === locale ? <CheckIcon className="size-4" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
