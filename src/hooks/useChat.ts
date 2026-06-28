import { useCallback } from "react";
import { streamChat } from "../lib/api";
import type { ChatResponseMode } from "../lib/chat-modes";
import { formatUserFacingError } from "../lib/user-errors";
import { saveChatHistory } from "../lib/storage";
import { toast } from "../store/useToastStore";
import { useSettingsStore } from "../store/useSettingsStore";
import { useAppStore } from "../store/useAppStore";
import { createStreamTokenBuffer } from "../lib/stream-token-buffer";
import { registerChatAbort, stopChatStream } from "./useKeyboardShortcuts";

function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useChat() {
  const currentCollection = useAppStore((state) => state.currentCollection);
  const messages = useAppStore((state) => state.messages);
  const addMessage = useAppStore((state) => state.addMessage);
  const updateMessage = useAppStore((state) => state.updateMessage);
  const appendToMessage = useAppStore((state) => state.appendToMessage);
  const removeLastAssistantMessage = useAppStore((state) => state.removeLastAssistantMessage);
  const setStreaming = useAppStore((state) => state.setStreaming);
  const topK = useSettingsStore((state) => state.topK);

  const persistMessages = useCallback(
    (nextMessages: typeof messages) => {
      if (currentCollection) {
        saveChatHistory(currentCollection, nextMessages);
      }
    },
    [currentCollection],
  );

  const sendMessage = useCallback(
    async (
      question: string,
      options?: { skipUserMessage?: boolean; mode?: ChatResponseMode },
    ) => {
      if (!currentCollection || !question.trim()) {
        return;
      }

      const responseMode = options?.mode ?? "default";
      const userId = createId();
      const assistantId = createId();

      if (!options?.skipUserMessage) {
        addMessage({
          id: userId,
          role: "user",
          content: question.trim(),
          mode: responseMode,
        });
      }
      addMessage({
        id: assistantId,
        role: "assistant",
        content: "",
        sources: [],
        isStreaming: true,
        mode: responseMode,
      });
      persistMessages(useAppStore.getState().messages);
      setStreaming(true);

      const controller = new AbortController();
      registerChatAbort(controller);

      const tokenBuffer = createStreamTokenBuffer((chunk) => {
        appendToMessage(assistantId, chunk);
      });

      try {
        await streamChat(
          question.trim(),
          currentCollection,
          topK,
          responseMode,
          (event) => {
            if (event.type === "token") {
              tokenBuffer.push(event.token);
            }
            if (event.type === "sources") {
              updateMessage(assistantId, { sources: event.sources });
            }
            if (event.type === "error") {
              tokenBuffer.cancel();
              const friendly = formatUserFacingError(event.error);
              updateMessage(assistantId, {
                content: friendly,
                isStreaming: false,
                isError: true,
              });
              toast(friendly, "error");
            }
            if (event.type === "done") {
              tokenBuffer.flush();
              updateMessage(assistantId, { isStreaming: false });
            }
          },
          controller.signal,
        );
      } catch (error) {
        tokenBuffer.cancel();
        if (controller.signal.aborted) {
          tokenBuffer.flush();
          updateMessage(assistantId, { isStreaming: false });
          return;
        }
        const message = formatUserFacingError(error);
        updateMessage(assistantId, { content: message, isStreaming: false, isError: true });
        toast(message, "error", {
          label: "Retry",
          onClick: () => void sendMessage(question, { mode: responseMode }),
        });
      } finally {
        tokenBuffer.flush();
        registerChatAbort(null);
        setStreaming(false);
        updateMessage(assistantId, { isStreaming: false });
        const latest = useAppStore.getState().messages;
        persistMessages(latest);
      }
    },
    [addMessage, appendToMessage, currentCollection, persistMessages, setStreaming, topK, updateMessage],
  );

  const regenerate = useCallback(async () => {
    const last = removeLastAssistantMessage();
    if (!last) return;
    const latest = useAppStore.getState().messages;
    persistMessages(latest);
    await sendMessage(last.question, { skipUserMessage: true, mode: last.mode });
  }, [persistMessages, removeLastAssistantMessage, sendMessage]);

  const stopStreaming = useCallback(() => {
    stopChatStream();
    setStreaming(false);
  }, [setStreaming]);

  return { sendMessage, regenerate, stopStreaming };
}
