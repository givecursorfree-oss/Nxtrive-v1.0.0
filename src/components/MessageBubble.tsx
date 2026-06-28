import {
  ArrowPathIcon,
  ClipboardDocumentIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { ChatMarkdown } from "./ChatMarkdown";
import { StreamingMessageContent } from "./StreamingMessageContent";
import type { ChatResponseMode } from "../lib/chat-modes";
import { getModeLabel } from "../lib/chat-modes";
import { isAssistantErrorMessage } from "../lib/user-errors";
import { stripEmbeddedSourcesSection } from "../lib/strip-embedded-sources";
import { Sources } from "./assistant-ui/sources";
import { AssistantThinkContent } from "./prompt-kit/assistant-think-content";
import { Button } from "./ui/Button";
import { cn } from "../lib/utils";
import { parseThinkResponse } from "../lib/think-response";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  mode?: ChatResponseMode;
  isStreaming?: boolean;
  isError?: boolean;
  onCopy?: () => void;
  onRegenerate?: () => void;
  onStop?: () => void;
  onSourcePreview?: (path: string) => void;
}

export function MessageBubble({
  role,
  content,
  sources = [],
  mode,
  isStreaming = false,
  isError = false,
  onCopy,
  onRegenerate,
  onStop,
  onSourcePreview,
}: MessageBubbleProps) {
  const isUser = role === "user";
  const modeLabel = isUser ? getModeLabel(mode) : null;
  const showError = !isUser && (isError || isAssistantErrorMessage(content));
  const isThinkMode = mode === "think";
  const thinkParsed = !isUser && isThinkMode ? parseThinkResponse(content) : null;
  const showThinkUi =
    !isUser &&
    isThinkMode &&
    (isStreaming || Boolean(thinkParsed?.reasoning) || thinkParsed?.hasAnswerSection);

  const displayContent = !isUser
    ? stripEmbeddedSourcesSection(content, sources)
    : content;

  return (
    <article
      className={cn(
        "flex w-full gap-3 message-enter items-start",
        isUser ? "justify-end" : "justify-start",
      )}
      aria-label={isUser ? "Your message" : "Assistant message"}
    >
      {!isUser && (
        <div
          className="message-avatar surface-accent"
          aria-hidden="true"
        >
          <DocumentTextIcon className="h-5 w-5 shrink-0" />
        </div>
      )}

      <div
        className={cn(
          "flex min-w-0 flex-col gap-1.5",
          isUser ? "max-w-[min(88%,40rem)]" : "w-full max-w-[min(92%,48rem)]",
        )}
      >
        <div
          className={cn(
            "message-bubble rounded-card px-5 py-3.5",
            isUser
              ? "message-bubble--user border border-mist bg-paper-white text-deep-ink shadow-subtle"
              : showError
                ? "border border-ember-orange/35 bg-ember-orange/5 text-deep-ink shadow-subtle"
                : "border border-mist bg-card-white text-carbon shadow-subtle",
            !isUser && isStreaming && "message-bubble--streaming",
          )}
        >
          {isUser ? (
            <div className="space-y-2">
              {modeLabel && (
                <span className="inline-flex items-center rounded-full border border-mist bg-pale-cyan-muted/60 px-2.5 py-0.5 type-caption font-medium text-forest-teal">
                  {modeLabel}
                </span>
              )}
              <p className="whitespace-pre-wrap type-body leading-relaxed">{content}</p>
            </div>
          ) : (
            <div className="prose-chat w-full min-w-0">
              {showError ? (
                <div className="flex items-start gap-2.5" role="alert">
                  <ExclamationTriangleIcon
                    className="mt-0.5 h-5 w-5 shrink-0 text-ember-orange"
                    aria-hidden="true"
                  />
                  <p className="type-body-sm leading-relaxed text-deep-ink">{content}</p>
                </div>
              ) : showThinkUi ? (
                <AssistantThinkContent
                  content={displayContent}
                  isStreaming={isStreaming}
                  onStop={onStop}
                />
              ) : isStreaming ? (
                <StreamingMessageContent content={displayContent} />
              ) : displayContent ? (
                <ChatMarkdown>{displayContent}</ChatMarkdown>
              ) : null}
            </div>
          )}

          {!isUser && sources.length > 0 && (
            <Sources.Group
              paths={sources}
              onPreview={onSourcePreview}
              variant="muted"
              size="sm"
            />
          )}
        </div>

        {!isUser && !isStreaming && content && (onCopy || onRegenerate) && (
          <div className="message-actions mt-1 flex flex-wrap items-center gap-2 pl-1">
            {onCopy && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onCopy}
                icon={<ClipboardDocumentIcon className="h-4 w-4 shrink-0" aria-hidden="true" />}
              >
                Copy
              </Button>
            )}
            {onRegenerate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRegenerate}
                icon={<ArrowPathIcon className="h-4 w-4 shrink-0" aria-hidden="true" />}
              >
                Regenerate
              </Button>
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div className="message-avatar message-avatar--user" aria-hidden="true">
          <UserCircleIcon className="h-5 w-5 shrink-0" />
        </div>
      )}
    </article>
  );
}
