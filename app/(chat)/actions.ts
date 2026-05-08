"use server";

import type { UIMessage } from "ai";
import { cookies } from "next/headers";
import { auth } from "@/app/(auth)/auth";
import type { VisibilityType } from "@/components/chat/visibility-selector";
import { createLiteLLMTextResponse } from "@/lib/ai/litellm";
import { createLiteLLMTextInput } from "@/lib/ai/litellm-responses";
import { getTitleModelId } from "@/lib/ai/models.server";
import { titlePrompt } from "@/lib/ai/prompts";
import {
  deleteMessagesByChatIdAfterTimestamp,
  getChatById,
  getMessageById,
  updateChatVisibilityById,
} from "@/lib/db/queries";
import { getTextFromMessage } from "@/lib/utils";

export async function saveChatModelAsCookie(model: string) {
  const cookieStore = await cookies();
  cookieStore.set("chat-model", model);
}

export async function generateTitleFromUserMessage({
  message,
}: {
  message: UIMessage;
}) {
  const userText = getTextFromMessage(message).trim();
  const fallbackTitle = userText || "New chat";

  if (!userText) {
    return fallbackTitle;
  }

  const text = await createLiteLLMTextResponse({
    model: await getTitleModelId(),
    instructions: titlePrompt,
    input: createLiteLLMTextInput(userText),
  });

  return (
    (text || fallbackTitle)
      .replace(/^[#*"\s]+/, "")
      .replace(/["]+$/, "")
      .trim() || fallbackTitle
  );
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const [message] = await getMessageById({ id });
  if (!message) {
    throw new Error("Message not found");
  }

  const chat = await getChatById({ id: message.chatId });
  if (!chat || chat.userId !== session.user.id) {
    throw new Error("Unauthorized");
  }

  await deleteMessagesByChatIdAfterTimestamp({
    chatId: message.chatId,
    timestamp: message.createdAt,
  });
}

export async function updateChatVisibility({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: VisibilityType;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const chat = await getChatById({ id: chatId });
  if (!chat || chat.userId !== session.user.id) {
    throw new Error("Unauthorized");
  }

  await updateChatVisibilityById({ chatId, visibility });
}
