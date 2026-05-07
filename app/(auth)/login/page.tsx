"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useActionState, useEffect, useState } from "react";

import { AuthForm } from "@/components/chat/auth-form";
import { SubmitButton } from "@/components/chat/submit-button";
import { toast } from "@/components/chat/toast";
import { useLocale } from "@/hooks/use-locale";
import { type LoginActionState, login } from "../actions";

export default function Page() {
  const router = useRouter();
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [isSuccessful, setIsSuccessful] = useState(false);

  const [state, formAction] = useActionState<LoginActionState, FormData>(
    login,
    { status: "idle" }
  );

  const { update: updateSession } = useSession();

  // biome-ignore lint/correctness/useExhaustiveDependencies: router and updateSession are stable refs
  useEffect(() => {
    if (state.status === "failed") {
      toast({ type: "error", description: t.auth.invalidCredentials });
    } else if (state.status === "invalid_data") {
      toast({
        type: "error",
        description: t.auth.invalidSubmission,
      });
    } else if (state.status === "success") {
      setIsSuccessful(true);
      updateSession();
      router.refresh();
    }
  }, [state.status, t.auth.invalidCredentials, t.auth.invalidSubmission]);

  const handleSubmit = (formData: FormData) => {
    setEmail(formData.get("email") as string);
    formAction(formData);
  };

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">
        {t.auth.loginTitle}
      </h1>
      <p className="text-sm text-muted-foreground">{t.auth.loginSubtitle}</p>
      <AuthForm action={handleSubmit} defaultEmail={email}>
        <SubmitButton isSuccessful={isSuccessful}>{t.auth.signIn}</SubmitButton>
        <p className="text-center text-[13px] text-muted-foreground">
          {t.auth.noAccount}{" "}
          <Link
            className="text-foreground underline-offset-4 hover:underline"
            href="/register"
          >
            {t.auth.signUp}
          </Link>
        </p>
      </AuthForm>
    </>
  );
}
