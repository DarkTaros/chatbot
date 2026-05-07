"use client";

import { CheckIcon, LanguagesIcon, PanelLeftIcon } from "lucide-react";
import { memo } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSidebar } from "@/components/ui/sidebar";
import { useLocale } from "@/hooks/use-locale";
import { localeOptions } from "@/lib/i18n";
import { VisibilitySelector, type VisibilityType } from "./visibility-selector";

function PureChatHeader({
  chatId,
  selectedVisibilityType,
  isReadonly,
}: {
  chatId: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
}) {
  const { toggleSidebar } = useSidebar();

  return (
    <header className="sticky top-0 flex h-14 items-center gap-2 bg-sidebar px-3">
      <Button
        className="md:hidden"
        onClick={toggleSidebar}
        size="icon-sm"
        variant="ghost"
      >
        <PanelLeftIcon className="size-4" />
      </Button>

      <LanguageSelector className="md:hidden" compact />

      {!isReadonly && (
        <VisibilitySelector
          chatId={chatId}
          selectedVisibilityType={selectedVisibilityType}
        />
      )}

      <LanguageSelector className="hidden md:ml-auto md:flex" />
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return (
    prevProps.chatId === nextProps.chatId &&
    prevProps.selectedVisibilityType === nextProps.selectedVisibilityType &&
    prevProps.isReadonly === nextProps.isReadonly
  );
});

function LanguageSelector({
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
