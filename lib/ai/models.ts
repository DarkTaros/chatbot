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
  tools: true,
  vision: false,
  reasoning: false,
};

function parseCsv(value?: string) {
  return value
    ?.split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function inferProvider(modelId: string) {
  return modelId.includes("/") ? modelId.split("/")[0] : "openai";
}

function formatModelName(modelId: string) {
  return modelId.includes("/") ? modelId.split("/").slice(1).join("/") : modelId;
}

function parseModelCapabilities() {
  const raw = process.env.OPENAI_COMPATIBLE_MODEL_CAPABILITIES?.trim();

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
    return {} as Record<string, ModelCapabilities>;
  }
}

const configuredCapabilities = parseModelCapabilities();

function getModelCapabilities(modelId: string): ModelCapabilities {
  return configuredCapabilities[modelId] ?? defaultCapabilities;
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

const configuredModelIds = Array.from(
  new Set(
    [
      ...(parseCsv(process.env.OPENAI_COMPATIBLE_MODEL_IDS) ?? []),
      process.env.OPENAI_COMPATIBLE_DEFAULT_MODEL?.trim(),
    ].filter(Boolean) as string[]
  )
);

export const DEFAULT_CHAT_MODEL =
  process.env.OPENAI_COMPATIBLE_DEFAULT_MODEL?.trim() ||
  configuredModelIds[0] ||
  "gpt-4o-mini";

export const chatModels: ChatModel[] = (
  configuredModelIds.length > 0 ? configuredModelIds : [DEFAULT_CHAT_MODEL]
).map(buildModel);

const titleModelId =
  process.env.OPENAI_COMPATIBLE_TITLE_MODEL?.trim() || DEFAULT_CHAT_MODEL;

export const titleModel = {
  ...buildModel(titleModelId),
  description: "Model used for title generation",
};

export async function getCapabilities(): Promise<
  Record<string, ModelCapabilities>
> {
  return Object.fromEntries(
    chatModels.map((model) => [model.id, getModelCapabilities(model.id)])
  );
}

export function getActiveModels(): ChatModel[] {
  return chatModels;
}

export const allowedModelIds = new Set(chatModels.map((m) => m.id));
