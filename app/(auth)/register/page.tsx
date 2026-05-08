"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { ZodError } from "zod";
import { AuthForm } from "@/components/chat/auth-form";
import { SubmitButton } from "@/components/chat/submit-button";
import { toast } from "@/components/chat/toast";
import { useLocale } from "@/hooks/use-locale";
import { authFormSchema, type RegisterActionState } from "../auth-form";

export default function Page() {
  const router = useRouter();
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [isSuccessful, setIsSuccessful] = useState(false);
  const [state, setState] = useState<RegisterActionState>({ status: "idle" });

  const { update: updateSession } = useSession();
  const homePath = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/`;

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
      router.push(homePath);
      router.refresh();
    }
  }, [
    homePath,
    router,
    state.status,
    t.auth.accountCreated,
    t.auth.accountExists,
    t.auth.createAccountFailed,
    t.auth.invalidSubmission,
    updateSession,
  ]);

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

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validatedData),
      });

      if (response.status === 409) {
        setState({ status: "user_exists" });
        return;
      }

      if (!response.ok) {
        setState({
          status: response.status === 400 ? "invalid_data" : "failed",
        });
        return;
      }

      const signInResult = await signIn("credentials", {
        email: validatedData.email,
        password: validatedData.password,
        redirect: false,
      });

      setState({
        status: signInResult?.error ? "failed" : "success",
      });
    } catch (error) {
      setState({
        status: error instanceof ZodError ? "invalid_data" : "failed",
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
