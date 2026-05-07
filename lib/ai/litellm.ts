import "server-only";

import OpenAI from "openai";
import type { ResponseInput } from "openai/resources/responses/responses";
import { z } from "zod";
import { ChatbotError } from "@/lib/errors";

let client: OpenAI | null = null;
let clientConfigKey: string | null = null;

const liteLLMModelsResponseSchema = z.object({
  object: z.string().optional(),
  data: z.array(
    z.object({
      id: z.string().min(1),
      object: z.string().optional(),
      created: z.number().optional(),
      owned_by: z.string().optional(),
    })
  ),
});

function readRequiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new ChatbotError("bad_request:provider", `Missing ${name}.`);
  }

  return value;
}

function assertModel(model: string) {
  if (!model.trim()) {
    throw new ChatbotError(
      "bad_request:provider",
      "Missing LiteLLM model configuration."
    );
  }
}

export function getLiteLLMClient() {
  const baseURL = readRequiredEnv("LITELLM_BASE_URL");
  const apiKey = readRequiredEnv("LITELLM_API_KEY");
  const configKey = `${baseURL}\0${apiKey}`;

  if (!(client && clientConfigKey === configKey)) {
    client = new OpenAI({ apiKey, baseURL });
    clientConfigKey = configKey;
  }

  return client;
}

export async function getLiteLLMModels({
  signal,
}: {
  signal?: AbortSignal;
} = {}) {
  const baseURL = readRequiredEnv("LITELLM_BASE_URL").replace(/\/+$/, "");
  const apiKey = readRequiredEnv("LITELLM_API_KEY");
  const response = await fetch(`${baseURL}/models`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new ChatbotError(
      "bad_request:provider",
      `Failed to get LiteLLM models. ${errorText}`.trim()
    );
  }

  const parsed = liteLLMModelsResponseSchema.safeParse(await response.json());

  if (!parsed.success) {
    throw new ChatbotError(
      "bad_request:provider",
      "Invalid LiteLLM /models response."
    );
  }

  return parsed.data.data;
}

export function createLiteLLMResponseStream({
  model,
  instructions,
  input,
  signal,
}: {
  model: string;
  instructions: string;
  input: ResponseInput;
  signal?: AbortSignal;
}) {
  assertModel(model);

  return getLiteLLMClient()
    .responses.create(
      {
        model,
        instructions,
        input,
        stream: true,
      },
      { signal }
    )
    .asResponse();
}

export async function createLiteLLMTextResponse({
  model,
  instructions,
  input,
}: {
  model: string;
  instructions: string;
  input: ResponseInput;
}) {
  assertModel(model);

  const response = await getLiteLLMClient().responses.create({
    model,
    instructions,
    input,
  });

  return response.output_text;
}
