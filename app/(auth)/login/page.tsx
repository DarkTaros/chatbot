"use client";

import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { useState } from "react";
import { ZodError } from "zod";

import { AuthForm } from "@/components/chat/auth-form";
import { SubmitButton } from "@/components/chat/submit-button";
import { toast } from "@/components/chat/toast";
import { useLocale } from "@/hooks/use-locale";
import { authFormSchema } from "../auth-form";

export default function Page() {
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [isSuccessful, setIsSuccessful] = useState(false);

  const { update: updateSession } = useSession();
  const homePath = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/`;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isPending || isSuccessful) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const nextEmail = String(formData.get("email") ?? "");

    setEmail(nextEmail);
    setIsPending(true);

    try {
      const validatedData = authFormSchema.parse({
        email: nextEmail,
        password: formData.get("password"),
      });

      const result = await signIn("credentials", {
        email: validatedData.email,
        password: validatedData.password,
        redirect: false,
      });

      if (result?.error) {
        toast({ type: "error", description: t.auth.invalidCredentials });
        return;
      }

      setIsSuccessful(true);
      await updateSession();
      window.location.assign(homePath);
    } catch (error) {
      toast({
        type: "error",
        description:
          error instanceof ZodError
            ? t.auth.invalidSubmission
            : t.auth.invalidCredentials,
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">
        {t.auth.loginTitle}
      </h1>
      <p className="text-sm text-muted-foreground">{t.auth.loginSubtitle}</p>
      <AuthForm defaultEmail={email} onSubmit={handleSubmit}>
        <SubmitButton isSuccessful={isSuccessful} pending={isPending}>
          {t.auth.signIn}
        </SubmitButton>
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
