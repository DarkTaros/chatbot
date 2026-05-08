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
  const registerPath = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/auth/register`;

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

      const response = await fetch(registerPath, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validatedData),
      });

      if (response.status === 409) {
        toast({ type: "error", description: t.auth.accountExists });
        return;
      }

      if (!response.ok) {
        toast({
          type: "error",
          description:
            response.status === 400
              ? t.auth.invalidSubmission
              : t.auth.createAccountFailed,
        });
        return;
      }

      const signInResult = await signIn("credentials", {
        email: validatedData.email,
        password: validatedData.password,
        redirect: false,
      });

      if (signInResult?.error) {
        toast({ type: "error", description: t.auth.createAccountFailed });
        return;
      }

      toast({ type: "success", description: t.auth.accountCreated });
      setIsSuccessful(true);
      await updateSession();
      window.location.assign(homePath);
    } catch (error) {
      toast({
        type: "error",
        description:
          error instanceof ZodError
            ? t.auth.invalidSubmission
            : t.auth.createAccountFailed,
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">
        {t.auth.registerTitle}
      </h1>
      <p className="text-sm text-muted-foreground">{t.auth.registerSubtitle}</p>
      <AuthForm defaultEmail={email} onSubmit={handleSubmit}>
        <SubmitButton isSuccessful={isSuccessful} pending={isPending}>
          {t.auth.signUp}
        </SubmitButton>
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
