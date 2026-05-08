export type ModelCapabilities = {
  tools: boolean;
  vision: boolean;
  reasoning: boolean;
};

export type ModelMode =
  | "Chat"
  | "Completion"
  | "Embedding"
  | "Audio Speech"
  | "Audio Transcription"
  | "Image Generation"
  | "Video Generation"
  // oxlint-disable-next-line typescript-eslint(ban-types) -- intentional extensible string union
  | (string & {});

export type ChatModel = {
  id: string;
  name: string;
  provider: string;
  description: string;
  iconUrl: string | null;
  visibleInWeb: boolean;
  mode: ModelMode;
};

export const defaultCapabilities: ModelCapabilities = {
  tools: false,
  vision: false,
  reasoning: false,
};

export const chatCompatibleModes: ReadonlySet<ModelMode> = new Set([
  "Chat",
  "Completion",
]);
