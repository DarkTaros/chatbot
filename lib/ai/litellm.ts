import "server-only";

import OpenAI from "openai";
import type { ResponseInput } from "openai/resources/responses/responses";
import { ChatbotError } from "@/lib/errors";

let client: OpenAI | null = null;
let clientConfigKey: string | null = null;

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
