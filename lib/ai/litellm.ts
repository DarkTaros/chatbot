import "server-only";

import OpenAI from "openai";
import type { ResponseInput } from "openai/resources/responses/responses";
import { ChatbotError } from "@/lib/errors";
import { getModelEndpointConfig } from "./models.server";

const clients = new Map<string, OpenAI>();

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

function readEnvByName(name: string | null) {
  if (!name) {
    return null;
  }

  return readRequiredEnv(name);
}

async function getOpenAICompatibleClient(modelId: string) {
  const endpoint = await getModelEndpointConfig(modelId);

  if (endpoint.apiType !== "openai-compatible") {
    throw new ChatbotError(
      "bad_request:provider",
      `Unsupported endpoint api_type for ${modelId}: ${endpoint.apiType}`
    );
  }

  const baseURL =
    endpoint.baseURL ??
    readEnvByName(endpoint.baseURLEnv) ??
    readRequiredEnv("LITELLM_BASE_URL");
  const apiKey =
    endpoint.apiKey ??
    readEnvByName(endpoint.apiKeyEnv) ??
    readRequiredEnv("LITELLM_API_KEY");
  const configKey = `${baseURL}\0${apiKey}`;
  const existingClient = clients.get(configKey);

  if (existingClient) {
    return existingClient;
  }

  const client = new OpenAI({ apiKey, baseURL });
  clients.set(configKey, client);
  return client;
}

export async function createLiteLLMResponseStream({
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

  return (await getOpenAICompatibleClient(model)).responses
    .create(
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

  const response = await (
    await getOpenAICompatibleClient(model)
  ).responses.create({
    model,
    instructions,
    input,
  });

  return response.output_text;
}
