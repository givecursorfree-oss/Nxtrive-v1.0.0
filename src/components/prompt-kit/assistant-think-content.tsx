import { ChatMarkdown } from "@/components/ChatMarkdown";
import { StreamingMessageContent } from "@/components/StreamingMessageContent";
import { TextShimmerLoader } from "./loader";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "./reasoning";
import { Steps, StepsContent, StepsItem, StepsTrigger } from "./steps";
import { ThinkingBar } from "./thinking-bar";
import {
  isThinkReasoningPhase,
  parseThinkResponse,
} from "@/lib/think-response";

interface AssistantThinkContentProps {
  content: string;
  isStreaming: boolean;
  onStop?: () => void;
}

export function AssistantThinkContent({
  content,
  isStreaming,
  onStop,
}: AssistantThinkContentProps) {
  const parsed = parseThinkResponse(content);
  const inReasoningPhase = isThinkReasoningPhase(content, isStreaming);
  const showSteps = isStreaming && !content.trim();

  if (showSteps) {
    return (
      <div className="space-y-3">
        <ThinkingBar
          text="Searching your documents"
          stopLabel="Skip"
          onStop={onStop}
        />
        <Steps defaultOpen>
          <StepsTrigger>
            <TextShimmerLoader text="Ensuring all files are included" size="md" />
          </StepsTrigger>
          <StepsContent>
            <StepsItem>Retrieving relevant chunks…</StepsItem>
            <StepsItem>Cross-referencing document sections…</StepsItem>
            <StepsItem>Preparing step-by-step reasoning…</StepsItem>
          </StepsContent>
        </Steps>
      </div>
    );
  }

  if (inReasoningPhase) {
    return (
      <div className="space-y-3">
        <ThinkingBar
          text="Deep reasoning in progress"
          stopLabel="Skip thinking"
          onStop={onStop}
        />
        {parsed.reasoning ? (
          <Reasoning isStreaming>
            <ReasoningTrigger>Show reasoning</ReasoningTrigger>
            <ReasoningContent>{parsed.reasoning}</ReasoningContent>
          </Reasoning>
        ) : (
          <TextShimmerLoader text="Analyzing patterns" size="md" />
        )}
      </div>
    );
  }

  if (parsed.reasoning && parsed.answer) {
    return (
      <div className="w-full min-w-0 space-y-4">
        <Reasoning>
          <ReasoningTrigger>Reasoning</ReasoningTrigger>
          <ReasoningContent contentClassName="type-body-sm">
            {parsed.reasoning}
          </ReasoningContent>
        </Reasoning>
        <div className="w-full min-w-0">
          <p className="mb-2 type-body-sm font-semibold text-deep-ink">Answer</p>
          <div className="prose-chat w-full min-w-0">
            {isStreaming ? (
              <StreamingMessageContent content={parsed.answer} />
            ) : (
              <ChatMarkdown>{parsed.answer}</ChatMarkdown>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (parsed.reasoning && !parsed.answer) {
    return (
      <div className="space-y-3">
        <Reasoning isStreaming={isStreaming}>
          <ReasoningTrigger>Show reasoning</ReasoningTrigger>
          <ReasoningContent>{parsed.reasoning}</ReasoningContent>
        </Reasoning>
        {isStreaming ? (
          <TextShimmerLoader text="Formulating answer" size="md" />
        ) : null}
      </div>
    );
  }

  return null;
}
