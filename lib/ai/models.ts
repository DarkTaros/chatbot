import { ChatbotError } from "@/lib/errors";
import { getLiteLLMModels } from "./litellm";

export type ModelCapabilities = {
  tools: boolean;
  vision: boolean;
  reasoning: boolean;
};

export type ChatModel = {
  id: string;
  name: string;
  provider: string;
  description: string;
};

const defaultCapabilities: ModelCapabilities = {
  tools: false,
  vision: false,
  reasoning: false,
};

function inferProvider(modelId: string) {
  return modelId.includes("/") ? modelId.split("/")[0] : "openai";
}

function formatModelName(modelId: string) {
  return modelId.includes("/")
    ? modelId.split("/").slice(1).join("/")
    : modelId;
}

function parseModelCapabilities() {
  const raw = process.env.LITELLM_MODEL_CAPABILITIES?.trim();

  if (!raw) {
    return {} as Record<string, ModelCapabilities>;
  }

  try {
    const parsed = JSON.parse(raw) as Record<
      string,
      Partial<ModelCapabilities> | undefined
    >;

    return Object.fromEntries(
      Object.entries(parsed).map(([modelId, capabilities]) => [
        modelId,
        {
          tools: capabilities?.tools ?? defaultCapabilities.tools,
          vision: capabilities?.vision ?? defaultCapabilities.vision,
          reasoning: capabilities?.reasoning ?? defaultCapabilities.reasoning,
        },
      ])
    );
  } catch {
    throw new ChatbotError(
      "bad_request:provider",
      "Invalid LITELLM_MODEL_CAPABILITIES JSON."
    );
  }
}

export function getModelCapabilities(modelId: string): ModelCapabilities {
  return parseModelCapabilities()[modelId] ?? defaultCapabilities;
}

function buildModel(modelId: string): ChatModel {
  const provider = inferProvider(modelId);

  return {
    id: modelId,
    name: formatModelName(modelId),
    provider,
    description: `Configured model via ${provider}`,
  };
}

export async function getActiveModels(): Promise<ChatModel[]> {
  const models = await getLiteLLMModels();
  const seenModelIds = new Set<string>();
  const activeModels: ChatModel[] = [];

  for (const model of models) {
    if (seenModelIds.has(model.id)) {
      continue;
    }

    seenModelIds.add(model.id);
    activeModels.push(buildModel(model.id));
  }

  if (activeModels.length === 0) {
    throw new ChatbotError(
      "bad_request:provider",
      "LiteLLM /models returned no models."
    );
  }

  return activeModels;
}

export async function getDefaultChatModel(activeModels?: ChatModel[]) {
  const configuredDefaultModel = process.env.LITELLM_DEFAULT_MODEL?.trim();
  const models = activeModels ?? (await getActiveModels());

  if (!configuredDefaultModel) {
    return models[0].id;
  }

  if (!models.some((model) => model.id === configuredDefaultModel)) {
    throw new ChatbotError(
      "bad_request:provider",
      `LITELLM_DEFAULT_MODEL is not available from LiteLLM /models: ${configuredDefaultModel}`
    );
  }

  return configuredDefaultModel;
}

export async function getTitleModelId(activeModels?: ChatModel[]) {
  const titleModelId = process.env.LITELLM_TITLE_MODEL?.trim();

  if (!titleModelId) {
    return getDefaultChatModel(activeModels);
  }

  const models = activeModels ?? (await getActiveModels());
  if (!models.some((model) => model.id === titleModelId)) {
    throw new ChatbotError(
      "bad_request:provider",
      `LITELLM_TITLE_MODEL is not available from LiteLLM /models: ${titleModelId}`
    );
  }

  return titleModelId;
}

export async function getCapabilities(
  activeModels?: ChatModel[]
): Promise<Record<string, ModelCapabilities>> {
  const models = activeModels ?? (await getActiveModels());

  return Object.fromEntries(
    models.map((model) => [model.id, getModelCapabilities(model.id)])
  );
}

export async function getAllowedModelIds(activeModels?: ChatModel[]) {
  const models = activeModels ?? (await getActiveModels());
  return new Set(models.map((model) => model.id));
}

export async function resolveChatModelId(modelId: string) {
  const models = await getActiveModels();
  const allowedModelIds = await getAllowedModelIds(models);
  const defaultModel = await getDefaultChatModel(models);

  return allowedModelIds.has(modelId) ? modelId : defaultModel;
}
