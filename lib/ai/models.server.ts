import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import { ChatbotError } from "@/lib/errors";
import {
  type ChatModel,
  chatCompatibleModes,
  defaultCapabilities,
  type ModelCapabilities,
} from "./models";

type EndpointApiType = "openai-compatible";

type ConfiguredEndpoint = {
  apiKey: string | null;
  apiType: EndpointApiType;
  apiKeyEnv: string | null;
  baseURL: string | null;
  baseURLEnv: string | null;
  name: string;
};

type ConfiguredModel = ChatModel & {
  capabilities: ModelCapabilities;
  endpointName: string | null;
};

const modelCapabilitiesSchema = z
  .object({
    tools: z.boolean().optional(),
    vision: z.boolean().optional(),
    reasoning: z.boolean().optional(),
  })
  .partial();

const endpointConfigSchema = z.object({
  endpoint_name: z.string().trim().min(1),
  api_type: z.literal("openai-compatible").optional(),
  api_key: z.string().trim().min(1).optional(),
  api_key_env: z.string().trim().min(1).optional(),
  base_url: z.string().trim().min(1).optional(),
  base_url_env: z.string().trim().min(1).optional(),
});

const modelsConfigSchema = z.object({
  endpoint_list: z.array(endpointConfigSchema).optional(),
  model_list: z
    .array(
      z
        .object({
          model_name: z.string().trim().min(1),
          litellm_params: z.record(z.string(), z.unknown()).optional(),
          model_info: z
            .object({
              name: z.string().trim().min(1),
              icon_url: z.string().trim().min(1),
              visible_in_web: z.boolean(),
              mode: z.string().trim().min(1),
              provider: z.string().trim().min(1).optional(),
              description: z.string().trim().optional(),
              endpoint_name: z.string().trim().min(1).optional(),
              capabilities: modelCapabilitiesSchema.optional(),
            })
            .passthrough(),
        })
        .passthrough()
    )
    .min(1),
});

function inferProvider(modelId: string) {
  return modelId.includes("/") ? modelId.split("/")[0] : "openai";
}

function normalizeDefaultEndpoint(): ConfiguredEndpoint {
  return {
    apiKey: null,
    apiType: "openai-compatible",
    apiKeyEnv: "LITELLM_API_KEY",
    baseURL: null,
    baseURLEnv: "LITELLM_BASE_URL",
    name: "default",
  };
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

function mergeCapabilities(
  configured?: Partial<ModelCapabilities>,
  override?: Partial<ModelCapabilities>
): ModelCapabilities {
  return {
    tools: override?.tools ?? configured?.tools ?? defaultCapabilities.tools,
    vision:
      override?.vision ?? configured?.vision ?? defaultCapabilities.vision,
    reasoning:
      override?.reasoning ??
      configured?.reasoning ??
      defaultCapabilities.reasoning,
  };
}

async function readModelsConfig() {
  const modelsFilePath = path.join(process.cwd(), "models.yaml");
  let rawContent: string;

  try {
    rawContent = await readFile(modelsFilePath, "utf8");
  } catch (error) {
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      throw new ChatbotError(
        "bad_request:provider",
        "Missing models.yaml at the project root."
      );
    }

    throw new ChatbotError(
      "bad_request:provider",
      "Failed to read models.yaml."
    );
  }

  let parsedYaml: unknown;

  try {
    parsedYaml = parseYaml(rawContent);
  } catch {
    throw new ChatbotError(
      "bad_request:provider",
      "Invalid YAML syntax in models.yaml."
    );
  }

  const parsedConfig = modelsConfigSchema.safeParse(parsedYaml);

  if (!parsedConfig.success) {
    throw new ChatbotError(
      "bad_request:provider",
      "Invalid models.yaml structure. Expected model_list[].model_info with name, icon_url, visible_in_web, and mode."
    );
  }

  return parsedConfig.data;
}

async function readConfiguredModels(): Promise<ConfiguredModel[]> {
  const parsedConfig = await readModelsConfig();

  const capabilityOverrides = parseModelCapabilities();
  const seenModelIds = new Set<string>();
  const endpointNames = new Set([
    "default",
    ...(parsedConfig.endpoint_list ?? []).map(
      (endpoint) => endpoint.endpoint_name
    ),
  ]);

  return parsedConfig.model_list.map((entry) => {
    const modelId = entry.model_name;

    if (seenModelIds.has(modelId)) {
      throw new ChatbotError(
        "bad_request:provider",
        `Duplicate model_name in models.yaml: ${modelId}`
      );
    }

    seenModelIds.add(modelId);

    if (
      entry.model_info.endpoint_name &&
      !endpointNames.has(entry.model_info.endpoint_name)
    ) {
      throw new ChatbotError(
        "bad_request:provider",
        `Unknown endpoint_name in models.yaml for ${modelId}: ${entry.model_info.endpoint_name}`
      );
    }

    return {
      id: modelId,
      name: entry.model_info.name,
      provider: entry.model_info.provider ?? inferProvider(modelId),
      description:
        entry.model_info.description ??
        `Configured model via ${entry.model_info.provider ?? inferProvider(modelId)}`,
      iconUrl: entry.model_info.icon_url,
      visibleInWeb: entry.model_info.visible_in_web,
      mode: entry.model_info.mode,
      endpointName: entry.model_info.endpoint_name ?? null,
      capabilities: mergeCapabilities(
        entry.model_info.capabilities,
        capabilityOverrides[modelId]
      ),
    };
  });
}

async function readConfiguredEndpoints(): Promise<
  Map<string, ConfiguredEndpoint>
> {
  const parsedConfig = await readModelsConfig();
  const endpoints = new Map<string, ConfiguredEndpoint>();
  endpoints.set("default", normalizeDefaultEndpoint());

  for (const endpoint of parsedConfig.endpoint_list ?? []) {
    if (endpoints.has(endpoint.endpoint_name)) {
      throw new ChatbotError(
        "bad_request:provider",
        `Duplicate endpoint_name in models.yaml: ${endpoint.endpoint_name}`
      );
    }

    endpoints.set(endpoint.endpoint_name, {
      apiKey: endpoint.api_key ?? null,
      apiType: endpoint.api_type ?? "openai-compatible",
      apiKeyEnv: endpoint.api_key_env ?? null,
      baseURL: endpoint.base_url ?? null,
      baseURLEnv: endpoint.base_url_env ?? null,
      name: endpoint.endpoint_name,
    });
  }

  return endpoints;
}

export function getConfiguredModels() {
  return readConfiguredModels();
}

export async function getModelEndpointConfig(modelId: string) {
  const models = await getConfiguredModels();
  const model = models.find((candidate) => candidate.id === modelId);

  if (!model) {
    throw new ChatbotError(
      "bad_request:provider",
      `Model is not defined in models.yaml: ${modelId}`
    );
  }

  const endpoints = await readConfiguredEndpoints();
  const endpoint = endpoints.get(model.endpointName ?? "default");

  if (!endpoint) {
    throw new ChatbotError(
      "bad_request:provider",
      `Endpoint is not defined in models.yaml: ${model.endpointName}`
    );
  }

  return endpoint;
}

export async function getActiveModels(): Promise<ChatModel[]> {
  const models = await getConfiguredModels();
  const activeModels = models.filter(
    (model) => model.visibleInWeb && chatCompatibleModes.has(model.mode)
  );

  if (activeModels.length === 0) {
    throw new ChatbotError(
      "bad_request:provider",
      "models.yaml does not contain any visible Chat or Completion models."
    );
  }

  return activeModels.map(({ capabilities: _capabilities, ...model }) => model);
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
      `LITELLM_DEFAULT_MODEL is not available in visible Chat/Completion models: ${configuredDefaultModel}`
    );
  }

  return configuredDefaultModel;
}

export async function getTitleModelId(configuredModels?: ConfiguredModel[]) {
  const titleModelId = process.env.LITELLM_TITLE_MODEL?.trim();
  const models = configuredModels ?? (await getConfiguredModels());

  if (!titleModelId) {
    return getDefaultChatModel(
      models
        .filter(
          (model) => model.visibleInWeb && chatCompatibleModes.has(model.mode)
        )
        .map(({ capabilities: _capabilities, ...model }) => model)
    );
  }

  if (!models.some((model) => model.id === titleModelId)) {
    throw new ChatbotError(
      "bad_request:provider",
      `LITELLM_TITLE_MODEL is not defined in models.yaml: ${titleModelId}`
    );
  }

  return titleModelId;
}

export async function getCapabilities(
  activeModels?: ChatModel[]
): Promise<Record<string, ModelCapabilities>> {
  const visibleModels = activeModels ?? (await getActiveModels());
  const configuredModels = await getConfiguredModels();
  const visibleModelIds = new Set(visibleModels.map((model) => model.id));

  return Object.fromEntries(
    configuredModels
      .filter((model) => visibleModelIds.has(model.id))
      .map((model) => [model.id, model.capabilities])
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
