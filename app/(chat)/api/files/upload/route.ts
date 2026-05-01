import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { uploadPublicImage } from "@/lib/storage/rustfs";

const FileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= 5 * 1024 * 1024, {
      message: "File size should be less than 5MB",
    })
    .refine((file) => ["image/jpeg", "image/png"].includes(file.type), {
      message: "File type should be JPEG or PNG",
    }),
});

function getUploadErrorDetails(error: unknown) {
  if (
    error instanceof Error &&
    error.message.startsWith("Missing required environment variable:")
  ) {
    return {
      message: "RustFS storage is not configured correctly",
      status: 500,
    };
  }

  const candidates = [
    error,
    error instanceof Error ? error.cause : undefined,
  ].filter(Boolean) as Array<
    Partial<Error> & {
      code?: string;
      name?: string;
      $metadata?: { httpStatusCode?: number };
    }
  >;

  if (
    candidates.some(
      (candidate) =>
        candidate.code === "ECONNREFUSED" ||
        candidate.code === "ENOTFOUND" ||
        candidate.code === "EHOSTUNREACH"
    )
  ) {
    return {
      message: "RustFS storage is unavailable. Start RustFS and try again.",
      status: 503,
    };
  }

  if (
    candidates.some(
      (candidate) =>
        candidate.name === "NoSuchBucket" ||
        candidate.$metadata?.httpStatusCode === 404
    )
  ) {
    return {
      message:
        "RustFS bucket is missing. Run `pnpm storage:init` and try again.",
      status: 500,
    };
  }

  return {
    message: "Upload failed",
    status: 500,
  };
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (request.body === null) {
    return new Response("Request body is empty", { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as Blob;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const validatedFile = FileSchema.safeParse({ file });

    if (!validatedFile.success) {
      const errorMessage = validatedFile.error.errors
        .map((error) => error.message)
        .join(", ");

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const filename = (formData.get("file") as File).name;
    const fileBuffer = await file.arrayBuffer();

    try {
      const data = await uploadPublicImage({
        filename,
        body: fileBuffer,
        contentType: file.type,
      });

      return NextResponse.json(data);
    } catch (error) {
      console.error("Image upload failed:", error);

      const { message, status } = getUploadErrorDetails(error);

      return NextResponse.json({ error: message }, { status });
    }
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
