"use client";

import { useMemo } from "react";
import useSWR from "swr";
import type { ChatModel, ModelCapabilities } from "@/lib/ai/models";

type ModelsResponse = {
  capabilities: Record<string, ModelCapabilities>;
  defaultModel: string;
  models: ChatModel[];
};

const fallbackCapabilities: ModelCapabilities = {
  tools: true,
  vision: false,
  reasoning: false,
};

export function useModelConfig() {
  const { data, isLoading } = useSWR<ModelsResponse>(
    `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/models`,
    (url: string) => fetch(url, { cache: "no-store" }).then((r) => r.json()),
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  );

  const models = data?.models ?? [];
  const capabilities = data?.capabilities ?? {};
  const defaultModelId = data?.defaultModel ?? models[0]?.id ?? null;

  const allowedModelIds = useMemo(
    () => new Set(models.map((model) => model.id)),
    [models]
  );

  return {
    allowedModelIds,
    capabilities,
    defaultModelId,
    getCapabilities(modelId?: string | null) {
      if (!modelId) {
        return fallbackCapabilities;
      }

      return capabilities[modelId] ?? fallbackCapabilities;
    },
    isLoading,
    models,
  };
}
