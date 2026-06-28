import { lazy, Suspense, useEffect, useRef, useState, type FocusEvent } from "react";
import { FolderOpenIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useChat } from "../hooks/useChat";
import { useIngest } from "../hooks/useIngest";
import { formatCollectionName } from "../lib/format";
import { BRAND_NAME } from "../lib/brand";
import { toApiMode, type PromptMode } from "../lib/chat-modes";
import { isSupportedUploadFile } from "../lib/supported-extensions";
import { isOnboardingDone, saveChatHistory } from "../lib/storage";
import { ONBOARDING_DISMISSED_EVENT } from "../lib/onboarding-events";
import { NXTRIVE_REQUEST_CLEAR_CHAT } from "../lib/app-events";
import { SUGGESTED_PROMPTS } from "../lib/suggested-prompts";
import { useAppStore } from "../store/useAppStore";
import { useSettingsStore } from "../store/useSettingsStore";
import { toast } from "../store/useToastStore";
import { ChatSourcesDrawer } from "./ChatSourcesDrawer";
import { ChatExampleSuggestions } from "./ChatExampleSuggestions";
import { EmptyChatState } from "./EmptyChatState";
import { MessageBubble } from "./MessageBubble";
import {
  ChatContainerContent,
  ChatContainerRoot,
  ChatContainerScrollAnchor,
} from "./prompt-kit/chat-container";
import { ScrollButton } from "./prompt-kit/scroll-button";
import { SourcePreviewModal } from "./SourcePreviewModal";
import { Button } from "./ui/Button";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import { ComposerBloom, type ComposerBloomPhase } from "./ui/composer-bloom";
import { PromptInputSkeleton } from "./ui/PromptInputSkeleton";
import { cn } from "../lib/utils";

const PromptInputBox = lazy(() =>
  import("./ui/ai-prompt-box").then((m) => ({ default: m.PromptInputBox })),
);

export function ChatPanel() {
  const messages = useAppStore((state) => state.messages);
  const currentCollection = useAppStore((state) => state.currentCollection);
  const collections = useAppStore((state) => state.collections);
  const isStreaming = useAppStore((state) => state.isStreaming);
  const clearMessages = useAppStore((state) => state.clearMessages);
  const { sendMessage, regenerate, stopStreaming } = useChat();
  const { ingestDroppedFolder } = useIngest();
  const ingestionState = useAppStore((state) => state.ingestionState);
  const setSourcesPanelOpen = useSettingsStore((state) => state.setSourcesPanelOpen);

  const [showOnboarding, setShowOnboarding] = useState(() => !isOnboardingDone());
  const [previewSourcePath, setPreviewSourcePath] = useState<string | null>(null);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [archCompletePulse, setArchCompletePulse] = useState(false);
  const [composerFocused, setComposerFocused] = useState(false);
  const wasStreamingRef = useRef(false);

  useEffect(() => {
    const label = currentCollection ? formatCollectionName(currentCollection) : null;
    document.title = label ? `${label} · Chat · ${BRAND_NAME}` : `Chat · ${BRAND_NAME}`;
  }, [currentCollection]);

  useEffect(() => {
    const onDismissed = () => setShowOnboarding(false);
    window.addEventListener(ONBOARDING_DISMISSED_EVENT, onDismissed);
    return () => window.removeEventListener(ONBOARDING_DISMISSED_EVENT, onDismissed);
  }, []);

  useEffect(() => {
    if (isStreaming) {
      wasStreamingRef.current = true;
      setArchCompletePulse(false);
      return;
    }

    if (wasStreamingRef.current) {
      wasStreamingRef.current = false;
      setArchCompletePulse(true);
      const timer = window.setTimeout(() => setArchCompletePulse(false), 2000);
      return () => window.clearTimeout(timer);
    }
  }, [isStreaming]);

  useEffect(() => {
    if (!currentCollection || messages.length === 0) return;
    const timer = window.setTimeout(() => {
      saveChatHistory(currentCollection, messages);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [currentCollection, messages]);

  useEffect(() => {
    const persist = () => {
      const { currentCollection: collection, messages: history } = useAppStore.getState();
      if (collection && history.length > 0) {
        saveChatHistory(collection, history);
      }
    };
    window.addEventListener("beforeunload", persist);
    window.addEventListener("pagehide", persist);
    return () => {
      window.removeEventListener("beforeunload", persist);
      window.removeEventListener("pagehide", persist);
    };
  }, []);

  useEffect(() => {
    const onRequestClear = () => {
      const { messages: history } = useAppStore.getState();
      if (history.length > 0) setClearConfirmOpen(true);
    };
    window.addEventListener(NXTRIVE_REQUEST_CLEAR_CHAT, onRequestClear);
    return () => window.removeEventListener(NXTRIVE_REQUEST_CLEAR_CHAT, onRequestClear);
  }, []);

  const submit = async (
    text: string,
    mode: PromptMode = null,
    files: File[] = [],
  ) => {
    const question = text.trim();
    const hasFiles = files.length > 0;
    if ((!question && !hasFiles) || !currentCollection || isStreaming) return;

    if (hasFiles) {
      const supported = files.filter((file) => isSupportedUploadFile(file.name));
      if (supported.length === 0) {
        toast("No supported files to index", "error");
        return;
      }
      if (ingestionState.status === "running") {
        toast("Wait for the current indexing job to finish", "info");
        return;
      }
      await ingestDroppedFolder(
        `chat-upload-${Date.now()}`,
        supported.map((file) => ({ relativePath: file.name, file })),
        currentCollection,
      );
    }

    const prompt =
      question ||
      (hasFiles ? "Summarize the attached documents and highlight key points." : "");
    if (!prompt) return;

    await sendMessage(prompt, { mode: toApiMode(mode) });
  };

  const handleClear = () => {
    clearMessages();
    setClearConfirmOpen(false);
    toast("Conversation cleared", "success");
  };

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");

  const chatPlaceholder = currentCollection
    ? "Ask anything about your documents…"
    : "Select a collection to start chatting";

  const openSourcePreview = (path: string) => {
    if (!currentCollection) return;
    setPreviewSourcePath(path);
  };

  const bloomPhase: ComposerBloomPhase = archCompletePulse
    ? "complete"
    : isStreaming
      ? "streaming"
      : composerFocused
        ? "focus"
        : "idle";

  const handleComposerFocusCapture = () => setComposerFocused(true);
  const handleComposerBlurCapture = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setComposerFocused(false);
    }
  };

  return (
    <main
      id="main-chat"
      tabIndex={-1}
      className="surface-glass flex min-h-0 min-w-0 flex-1 flex-col border-l border-mist outline-none"
    >
      <h1 className="sr-only">
        {currentCollection
          ? `Chat with ${formatCollectionName(currentCollection)}`
          : "Chat"}
      </h1>
      {currentCollection && (
        <div className="flex h-10 shrink-0 items-center justify-end gap-2 panel-x">
          {messages.length > 0 && (
            <p className="mr-auto truncate type-caption text-helper">
              {messages.length} message{messages.length === 1 ? "" : "s"}
            </p>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSourcesPanelOpen(true)}
            icon={<FolderOpenIcon className="h-[1.125rem] w-[1.125rem] shrink-0" aria-hidden="true" />}
            aria-label="View indexed library"
          >
            Library
          </Button>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setClearConfirmOpen(true)}
              icon={<TrashIcon className="h-[1.125rem] w-[1.125rem] shrink-0" aria-hidden="true" />}
              aria-label="Clear conversation"
            >
              Clear
            </Button>
          )}
        </div>
      )}

      <ChatContainerRoot className="chat-scroll-area min-h-0 flex-1">
        {messages.length === 0 ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <EmptyChatState
              hasCollection={Boolean(currentCollection)}
              hasCollections={collections.length > 0}
              collectionName={currentCollection}
              showOnboarding={showOnboarding && Boolean(currentCollection)}
              onDismissOnboarding={() => setShowOnboarding(false)}
            />
          </div>
        ) : (
          <ChatContainerContent>
            <div className="mx-auto w-full max-w-3xl space-y-6 panel-x py-4">
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  role={message.role}
                  content={message.content}
                  sources={message.sources}
                  mode={message.mode}
                  isStreaming={message.isStreaming}
                  isError={message.isError}
                  onSourcePreview={currentCollection ? openSourcePreview : undefined}
                  onCopy={
                    message.role === "assistant" && message.content
                      ? () => {
                          void navigator.clipboard.writeText(message.content);
                          toast("Copied to clipboard", "success");
                        }
                      : undefined
                  }
                  onRegenerate={
                    message.role === "assistant" &&
                    !message.isStreaming &&
                    message.id === lastAssistant?.id &&
                    !isStreaming
                      ? () => void regenerate()
                      : undefined
                  }
                  onStop={
                    message.role === "assistant" && message.isStreaming ? stopStreaming : undefined
                  }
                />
              ))}
              <ChatContainerScrollAnchor />
            </div>
          </ChatContainerContent>
        )}

        {messages.length > 0 && (
          <div className="pointer-events-none sticky bottom-20 z-10 flex justify-center">
            <div className="pointer-events-auto">
              <ScrollButton />
            </div>
          </div>
        )}
      </ChatContainerRoot>

      <div
        className={cn(
          "chat-composer-dock",
          messages.length === 0 && currentCollection && "chat-composer-dock--empty-hero",
          messages.length > 0 && "chat-composer-dock--compact",
          isStreaming && "chat-composer-dock--streaming",
          archCompletePulse && "chat-composer-dock--complete",
        )}
        role="region"
        aria-label="Message composer"
      >
        <div
          className={cn(
            "chat-composer-dock__arch",
            isStreaming && "chat-composer-dock__arch--streaming",
            archCompletePulse && "chat-composer-dock__arch--complete",
            composerFocused && !isStreaming && "chat-composer-dock__arch--focus",
          )}
        >
          <ComposerBloom phase={bloomPhase} />
        </div>
        <div
          className="chat-composer-dock__glow"
          onFocusCapture={handleComposerFocusCapture}
          onBlurCapture={handleComposerBlurCapture}
        >
          {!currentCollection && (
            <span id="composer-hint" className="sr-only">
              Select a collection in the sidebar to start chatting.
            </span>
          )}
          <div className="chat-composer-dock__input-stack">
            <div className="chat-composer-dock__input-surface">
              <Suspense fallback={<PromptInputSkeleton />}>
              <PromptInputBox
                isLoading={isStreaming}
                disabled={!currentCollection}
                compact={messages.length > 0}
                showModeHint={messages.length === 0}
                placeholder={chatPlaceholder}
                onSend={({ text, mode, files }) => void submit(text, mode, files)}
                onStop={stopStreaming}
                aria-describedby={!currentCollection ? "composer-hint" : undefined}
              />
              </Suspense>
            </div>
          </div>
          {currentCollection && !isStreaming && messages.length === 0 && (
            <ChatExampleSuggestions
              className="relative z-[1] mt-4"
              prompts={SUGGESTED_PROMPTS}
              onSelect={(prompt) => void submit(prompt)}
            />
          )}
          <p
            className={cn(
              "chat-composer-dock__hint",
              isStreaming && "chat-composer-dock__hint--responding",
            )}
            aria-live="polite"
          >
            {isStreaming
              ? "Responding…"
              : "Enter to send · Shift+Enter for newline · ? for shortcuts"}
          </p>
        </div>
      </div>

      <ConfirmDialog
        open={clearConfirmOpen}
        title="Clear conversation?"
        description="This removes all messages in this chat. Your indexed documents are not affected."
        confirmLabel="Clear chat"
        cancelLabel="Keep messages"
        variant="danger"
        onConfirm={handleClear}
        onCancel={() => setClearConfirmOpen(false)}
      />

      {currentCollection && (
        <>
          <ChatSourcesDrawer
            collectionName={currentCollection}
            onPreview={(path) => {
              setSourcesPanelOpen(false);
              openSourcePreview(path);
            }}
          />
          <SourcePreviewModal
            open={previewSourcePath !== null}
            collectionName={currentCollection}
            sourcePath={previewSourcePath}
            onClose={() => setPreviewSourcePath(null)}
          />
        </>
      )}
    </main>
  );
}
