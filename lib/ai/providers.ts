import { customProvider } from "ai";
import { isTestEnvironment } from "../constants";
import { ChatbotError } from "../errors";

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

export function getLanguageModel(modelId: string) {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel(modelId);
  }

  throw new ChatbotError(
    "bad_request:provider",
    "AI SDK tool models are disabled in LiteLLM Responses API mode."
  );
}

export function getTitleModel() {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("title-model");
  }
  throw new ChatbotError(
    "bad_request:provider",
    "AI SDK title models are disabled in LiteLLM Responses API mode."
  );
}
