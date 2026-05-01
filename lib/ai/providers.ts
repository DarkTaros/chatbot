import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { customProvider } from "ai";
import { isTestEnvironment } from "../constants";
import { ChatbotError } from "../errors";
import { titleModel } from "./models";

export const myProvider = isTestEnvironment
  ? (() => {
      const { chatModel, titleModel } = require("./models.mock");
      return customProvider({
        languageModels: {
          "chat-model": chatModel,
          "title-model": titleModel,
        },
      });
    })()
  : null;

function getOpenAICompatibleProvider() {
  const baseURL = process.env.OPENAI_COMPATIBLE_BASE_URL?.trim();
  const apiKey = process.env.OPENAI_COMPATIBLE_API_KEY?.trim();

  if (!baseURL || !apiKey) {
    throw new ChatbotError(
      "bad_request:provider",
      "Missing OPENAI_COMPATIBLE_BASE_URL or OPENAI_COMPATIBLE_API_KEY."
    );
  }

  return createOpenAICompatible({
    name: process.env.OPENAI_COMPATIBLE_PROVIDER_NAME?.trim() || "openai",
    apiKey,
    baseURL,
  });
}

export function getLanguageModel(modelId: string) {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel(modelId);
  }

  return getOpenAICompatibleProvider().languageModel(modelId);
}

export function getTitleModel() {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("title-model");
  }
  return getOpenAICompatibleProvider().languageModel(titleModel.id);
}
