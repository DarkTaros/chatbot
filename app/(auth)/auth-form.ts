import { z } from "zod";

export const authFormSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export type AuthFormStatus = "idle" | "invalid_data" | "failed" | "success";

export type LoginActionState = {
  status: AuthFormStatus;
};

export type RegisterActionState = {
  status: AuthFormStatus | "user_exists";
};
