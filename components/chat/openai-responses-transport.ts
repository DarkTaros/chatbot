"use client";

import {
  HttpChatTransport,
  type HttpChatTransportInitOptions,
  type UIMessage,
  type UIMessageChunk,
} from "ai";

type ParsedSSEEvent = {
  event?: string;
  data: string;
};

function parseSSEBlock(block: string): ParsedSSEEvent | null {
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

function getEventType(event: ParsedSSEEvent, payload: Record<string, unknown>) {
  return typeof payload.type === "string" ? payload.type : event.event;
}

function isAIUIMessageChunk(payload: Record<string, unknown>) {
  return (
    typeof payload.type === "string" &&
    !payload.type.startsWith("response.") &&
    (payload.type !== "error" || "errorText" in payload)
  );
}

export class OpenAIResponsesChatTransport<
  UI_MESSAGE extends UIMessage,
> extends HttpChatTransport<UI_MESSAGE> {
  constructor(options: HttpChatTransportInitOptions<UI_MESSAGE> = {}) {
    super(options);
  }

  protected processResponseStream(
    stream: ReadableStream<Uint8Array<ArrayBufferLike>>
  ): ReadableStream<UIMessageChunk> {
    return new ReadableStream<UIMessageChunk>({
      async start(controller) {
        const reader = stream.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let textStarted = false;
        let textEnded = false;
        const textId = "openai-response-text";

        const startText = () => {
          if (textStarted) {
            return;
          }
          textStarted = true;
          controller.enqueue({ type: "text-start", id: textId });
        };

        const endText = () => {
          if (!(textStarted && !textEnded)) {
            return;
          }
          textEnded = true;
          controller.enqueue({ type: "text-end", id: textId });
        };

        const processBlock = (block: string) => {
          const event = parseSSEBlock(block);
          if (!event || event.data === "[DONE]") {
            return;
          }

          let payload: Record<string, unknown>;
          try {
            payload = JSON.parse(event.data);
          } catch {
            return;
          }

          if (isAIUIMessageChunk(payload)) {
            controller.enqueue(payload as UIMessageChunk);
            return;
          }

          const type = getEventType(event, payload);

          if (
            type === "response.output_text.delta" ||
            type === "response.refusal.delta"
          ) {
            const delta =
              typeof payload.delta === "string" ? payload.delta : "";
            if (!delta) {
              return;
            }
            startText();
            controller.enqueue({
              type: "text-delta",
              id: textId,
              delta,
            });
            return;
          }

          if (
            type === "response.output_text.done" ||
            type === "response.refusal.done" ||
            type === "response.completed" ||
            type === "response.incomplete"
          ) {
            endText();
            return;
          }

          if (type === "response.failed" || type === "response.error") {
            const error =
              typeof payload.error === "object" && payload.error !== null
                ? JSON.stringify(payload.error)
                : "OpenAI response stream failed.";
            controller.enqueue({ type: "error", errorText: error });
            endText();
          }
        };

        try {
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
          endText();
        } catch (error) {
          controller.enqueue({
            type: "error",
            errorText:
              error instanceof Error
                ? error.message
                : "OpenAI response stream failed.",
          });
          endText();
        } finally {
          controller.close();
        }
      },
    });
  }
}
