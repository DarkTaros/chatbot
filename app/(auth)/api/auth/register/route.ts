import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { authFormSchema } from "@/app/(auth)/auth-form";
import { createUser, getUser } from "@/lib/db/queries";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = authFormSchema.parse(body);

    const [user] = await getUser(validatedData.email);

    if (user) {
      return NextResponse.json({ status: "user_exists" }, { status: 409 });
    }

    await createUser(validatedData.email, validatedData.password);

    return NextResponse.json({ status: "success" });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ status: "invalid_data" }, { status: 400 });
    }

    console.error("Failed to register user", error);

    return NextResponse.json({ status: "failed" }, { status: 500 });
  }
}
