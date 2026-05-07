"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useActionState, useEffect, useState } from "react";
import { AuthForm } from "@/components/chat/auth-form";
import { SubmitButton } from "@/components/chat/submit-button";
import { toast } from "@/components/chat/toast";
import { useLocale } from "@/hooks/use-locale";
import { type RegisterActionState, register } from "../actions";

export default function Page() {
  const router = useRouter();
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [isSuccessful, setIsSuccessful] = useState(false);

  const [state, formAction] = useActionState<RegisterActionState, FormData>(
    register,
    { status: "idle" }
  );

  const { update: updateSession } = useSession();

  // biome-ignore lint/correctness/useExhaustiveDependencies: router and updateSession are stable refs
  useEffect(() => {
    if (state.status === "user_exists") {
      toast({ type: "error", description: t.auth.accountExists });
    } else if (state.status === "failed") {
      toast({ type: "error", description: t.auth.createAccountFailed });
    } else if (state.status === "invalid_data") {
      toast({
        type: "error",
        description: t.auth.invalidSubmission,
      });
    } else if (state.status === "success") {
      toast({ type: "success", description: t.auth.accountCreated });
      setIsSuccessful(true);
      updateSession();
      router.refresh();
    }
  }, [
    state.status,
    t.auth.accountCreated,
    t.auth.accountExists,
    t.auth.createAccountFailed,
    t.auth.invalidSubmission,
  ]);

  const handleSubmit = (formData: FormData) => {
    setEmail(formData.get("email") as string);
    formAction(formData);
  };

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">
        {t.auth.registerTitle}
      </h1>
      <p className="text-sm text-muted-foreground">{t.auth.registerSubtitle}</p>
      <AuthForm action={handleSubmit} defaultEmail={email}>
        <SubmitButton isSuccessful={isSuccessful}>{t.auth.signUp}</SubmitButton>
        <p className="text-center text-[13px] text-muted-foreground">
          {t.auth.haveAccount}{" "}
          <Link
            className="text-foreground underline-offset-4 hover:underline"
            href="/login"
          >
            {t.auth.signIn}
          </Link>
        </p>
      </AuthForm>
    </>
  );
}
