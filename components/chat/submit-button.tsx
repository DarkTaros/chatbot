"use client";

import { useFormStatus } from "react-dom";

import { LoaderIcon } from "@/components/chat/icons";
import { useLocale } from "@/hooks/use-locale";

import { Button } from "../ui/button";

export function SubmitButton({
  children,
  isSuccessful,
  pending,
}: {
  children: React.ReactNode;
  isSuccessful: boolean;
  pending?: boolean;
}) {
  const formStatus = useFormStatus();
  const { t } = useLocale();
  const isPending = pending ?? formStatus.pending;

  return (
    <Button
      aria-disabled={isPending || isSuccessful}
      className="relative"
      disabled={isPending || isSuccessful}
      type={isPending ? "button" : "submit"}
    >
      {children}

      {(isPending || isSuccessful) && (
        <span className="absolute right-4 animate-spin">
          <LoaderIcon />
        </span>
      )}

      <output aria-live="polite" className="sr-only">
        {isPending || isSuccessful ? t.auth.loading : t.auth.submitForm}
      </output>
    </Button>
  );
}
