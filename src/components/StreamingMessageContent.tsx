import { ChatMarkdown } from "./ChatMarkdown";
import { TextShimmerLoader } from "./prompt-kit/loader";
import { cn } from "../lib/utils";

interface StreamingMessageContentProps {
  content: string;
  className?: string;
}

export function StreamingMessageContent({ content, className }: StreamingMessageContentProps) {
  if (!content.trim()) {
    return (
      <div
        className={cn("streaming-message streaming-message--waiting", className)}
        aria-live="polite"
        aria-busy="true"
      >
        <TextShimmerLoader text="Writing response" size="md" />
        <span className="streaming-message__dots" aria-hidden="true">
          <span className="typing-dot" />
          <span className="typing-dot animation-delay-150" />
          <span className="typing-dot animation-delay-300" />
        </span>
        <span className="sr-only">Assistant is writing</span>
      </div>
    );
  }

  return (
    <div
      className={cn("streaming-message prose-chat w-full min-w-0", className)}
      aria-live="polite"
      aria-busy="true"
    >
      <ChatMarkdown streaming>{content}</ChatMarkdown>
      <span className="streaming-cursor" aria-hidden="true" />
      <span className="sr-only">Assistant is writing</span>
    </div>
  );
}
