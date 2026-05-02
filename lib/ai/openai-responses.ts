import "server-only";

import type { ResponseInput } from "openai/resources/responses/responses";
import type { ChatMessage } from "@/lib/types";
import { getTextFromMessage } from "@/lib/utils";

type OpenAIStreamSummary = {
  responseId?: string;
  text: string;
  usage?: unknown;
};

type SSEEvent = {
  event?: string;
  data: string;
};

function createTextContent(text: string) {
  return [
    {
      type: "input_text" as const,
      text,
    },
  ];
}

function isImageFilePart(part: unknown): part is {
  type: "file";
  mediaType?: string;
  url?: string;
} {
  const candidate = part as { type?: unknown; url?: unknown } | null;

  return (
    typeof candidate === "object" &&
    candidate !== null &&
    candidate.type === "file" &&
    typeof candidate.url === "string"
  );
}

export function convertToOpenAIResponseInput(
  messages: ChatMessage[]
): ResponseInput {
  return messages
    .map((message) => {
      const text = getTextFromMessage(message);
      const imageParts = message.parts.filter(isImageFilePart) as Array<{
        type: "file";
        mediaType?: string;
        url: string;
      }>;

      if (message.role === "user" && imageParts.length > 0) {
        return {
          type: "message" as const,
          role: "user" as const,
          content: [
            ...(text ? createTextContent(text) : []),
            ...imageParts.map((part) => ({
              type: "input_image" as const,
              image_url: part.url,
              detail: "auto" as const,
            })),
          ],
        };
      }

      if (message.role === "assistant") {
        return {
          type: "message" as const,
          role: "assistant" as const,
          content: createTextContent(text || " "),
        };
      }

      return {
        type: "message" as const,
        role:
          message.role === "system" ? ("system" as const) : ("user" as const),
        content: createTextContent(text || " "),
      };
    })
    .filter(
      (message) =>
        Array.isArray(message.content) &&
        message.content.some(
          (part) =>
            (part.type === "input_text" && part.text.trim().length > 0) ||
            part.type === "input_image"
        )
    );
}

export function createOpenAITextInput(text: string): ResponseInput {
  return [
    {
      type: "message",
      role: "user",
      content: createTextContent(text),
    },
  ];
}

function parseSSEBlock(block: string): SSEEvent | null {
  const eventLines: string[] = [];
  const dataLines: string[] = [];

  for (const line of block.split(/\r?\n/)) {
    if (line.startsWith("event:")) {
      eventLines.push(line.slice("event:".length).trimStart());
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice("data:".length).trimStart());
    }
  }

  if (dataLines.length === 0) {
    return null;
  }

  return {
    event: eventLines.at(-1),
    data: dataLines.join("\n"),
  };
}

function extractCompletedText(response: unknown) {
  if (
    typeof response === "object" &&
    response !== null &&
    "output_text" in response &&
    typeof response.output_text === "string"
  ) {
    return response.output_text;
  }

  return "";
}

export async function collectOpenAIResponseStream(
  stream: ReadableStream<Uint8Array>
): Promise<OpenAIStreamSummary> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let responseId: string | undefined;
  let usage: unknown;

  function processBlock(block: string) {
    const event = parseSSEBlock(block);
    if (!event || event.data === "[DONE]") {
      return;
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(event.data);
    } catch {
      return;
    }

    const type =
      typeof parsed.type === "string" ? parsed.type : (event.event ?? "");

    if (typeof parsed.response_id === "string") {
      responseId = parsed.response_id;
    }

    if (type === "response.output_text.delta") {
      text += typeof parsed.delta === "string" ? parsed.delta : "";
      return;
    }

    if (type === "response.completed" && parsed.response) {
      const completed = parsed.response as Record<string, unknown>;
      if (typeof completed.id === "string") {
        responseId = completed.id;
      }
      usage = completed.usage;
      text ||= extractCompletedText(completed);
    }
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split(/\r?\n\r?\n/);
    buffer = blocks.pop() ?? "";

    for (const block of blocks) {
      processBlock(block);
    }
  }

  buffer += decoder.decode();
  if (buffer.trim()) {
    processBlock(buffer);
  }

  return { responseId, text, usage };
}
