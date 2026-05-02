import "server-only";

import OpenAI from "openai";
import { ChatbotError } from "@/lib/errors";

let client: OpenAI | null = null;

export function getOpenAIClient() {
  const openAIKey = process.env.OPENAI_API_KEY?.trim();
  const compatibleKey = process.env.OPENAI_COMPATIBLE_API_KEY?.trim();
  const apiKey = openAIKey || compatibleKey;
  const baseURL = openAIKey
    ? process.env.OPENAI_BASE_URL?.trim()
    : process.env.OPENAI_BASE_URL?.trim() ||
      process.env.OPENAI_COMPATIBLE_BASE_URL?.trim();

  if (!apiKey) {
    throw new ChatbotError(
      "bad_request:provider",
      "Missing OPENAI_API_KEY or OPENAI_COMPATIBLE_API_KEY."
    );
  }

  if (!client) {
    client = new OpenAI({
      apiKey,
      ...(baseURL ? { baseURL } : {}),
    });
  }

  return client;
}
