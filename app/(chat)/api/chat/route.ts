import { geolocation, ipAddress } from "@vercel/functions";
import { checkBotId } from "botid/server";
import { after } from "next/server";
import { auth, type UserType } from "@/app/(auth)/auth";
import { entitlementsByUserType } from "@/lib/ai/entitlements";
import { createLiteLLMResponseStream } from "@/lib/ai/litellm";
import {
  collectLiteLLMResponseStream,
  convertToLiteLLMResponseInput,
} from "@/lib/ai/litellm-responses";
import { resolveChatModelId } from "@/lib/ai/models";
import { type RequestHints, systemPrompt } from "@/lib/ai/prompts";
import {
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  saveChat,
  saveMessages,
  updateChatTitleById,
} from "@/lib/db/queries";
import type { DBMessage } from "@/lib/db/schema";
import { ChatbotError } from "@/lib/errors";
import { checkIpRateLimit } from "@/lib/ratelimit";
import type { ChatMessage } from "@/lib/types";
import { convertToUIMessages, generateUUID } from "@/lib/utils";
import { generateTitleFromUserMessage } from "../../actions";
import { type PostRequestBody, postRequestBodySchema } from "./schema";

export const maxDuration = 60;

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (_) {
    return new ChatbotError("bad_request:api").toResponse();
  }

  try {
    const {
      id,
      message,
      messages,
      selectedChatModel,
      selectedLocale,
      selectedVisibilityType,
    } = requestBody;

    const [, session] = await Promise.all([
      checkBotId().catch(() => null),
      auth(),
    ]);

    if (!session?.user) {
      return new ChatbotError("unauthorized:chat").toResponse();
    }

    const chatModel = await resolveChatModelId(selectedChatModel);

    await checkIpRateLimit(ipAddress(request));

    const userType: UserType = session.user.type;

    const messageCount = await getMessageCountByUserId({
      id: session.user.id,
      differenceInHours: 1,
    });

    if (messageCount > entitlementsByUserType[userType].maxMessagesPerHour) {
      return new ChatbotError("rate_limit:chat").toResponse();
    }

    const chat = await getChatById({ id });
    let messagesFromDb: DBMessage[] = [];
    let titlePromise: Promise<string> | null = null;

    if (chat) {
      if (chat.userId !== session.user.id) {
        return new ChatbotError("forbidden:chat").toResponse();
      }
      messagesFromDb = await getMessagesByChatId({ id });
    } else if (message?.role === "user") {
      await saveChat({
        id,
        userId: session.user.id,
        title: "New chat",
        visibility: selectedVisibilityType,
      });
      titlePromise = generateTitleFromUserMessage({ message });
    } else {
      return new ChatbotError("bad_request:api").toResponse();
    }

    if (!(message || messages?.length)) {
      return new ChatbotError("bad_request:api").toResponse();
    }

    const uiMessages: ChatMessage[] = messages?.length
      ? (messages as ChatMessage[])
      : [...convertToUIMessages(messagesFromDb), message as ChatMessage];

    const { longitude, latitude, city, country } = geolocation(request);

    const requestHints: RequestHints = {
      longitude,
      latitude,
      city,
      country,
    };

    if (message?.role === "user") {
      await saveMessages({
        messages: [
          {
            chatId: id,
            id: message.id,
            role: "user",
            parts: message.parts,
            attachments: [],
            createdAt: new Date(),
          },
        ],
      });
    }

    const upstream = await createLiteLLMResponseStream({
      model: chatModel,
      instructions: systemPrompt({
        locale: selectedLocale,
        requestHints,
        supportsTools: false,
      }),
      input: convertToLiteLLMResponseInput(uiMessages),
      signal: request.signal,
    });

    if (!(upstream.ok && upstream.body)) {
      const errorText = await upstream.text().catch(() => "");
      console.error("LiteLLM Responses stream failed:", errorText);
      return new ChatbotError("offline:chat").toResponse();
    }

    const [clientStream, persistenceStream] = upstream.body.tee();
    const assistantMessageId = generateUUID();
    const persistStream = (async () => {
      const [summary, title] = await Promise.all([
        collectLiteLLMResponseStream(persistenceStream),
        titlePromise?.catch(() => null) ?? Promise.resolve(null),
      ]);

      if (summary.text.trim()) {
        await saveMessages({
          messages: [
            {
              id: assistantMessageId,
              role: "assistant",
              parts: [{ type: "text", text: summary.text }],
              createdAt: new Date(),
              attachments: [],
              chatId: id,
            },
          ],
        });
      }

      if (title) {
        await updateChatTitleById({ chatId: id, title });
      }
    })();

    after(() => persistStream);

    return new Response(clientStream, {
      headers: {
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Content-Type":
          upstream.headers.get("content-type") ?? "text/event-stream",
        "X-LiteLLM-Responses-Stream": "1",
      },
    });
  } catch (error) {
    const vercelId = request.headers.get("x-vercel-id");

    if (error instanceof ChatbotError) {
      return error.toResponse();
    }

    console.error("Unhandled error in chat API:", error, { vercelId });
    return new ChatbotError("offline:chat").toResponse();
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new ChatbotError("bad_request:api").toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  const chat = await getChatById({ id });

  if (chat?.userId !== session.user.id) {
    return new ChatbotError("forbidden:chat").toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}
