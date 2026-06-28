export type ParsedThinkResponse = {
  reasoning: string | null;
  answer: string | null;
  hasAnswerSection: boolean;
};

export function parseThinkResponse(content: string): ParsedThinkResponse {
  const hasAnswerSection = /##\s*Answer\b/i.test(content);
  const reasoningMatch = content.match(/##\s*Reasoning\s*\n([\s\S]*?)(?=##\s*Answer\b|$)/i);
  const answerMatch = content.match(/##\s*Answer\s*\n([\s\S]*)/i);

  return {
    reasoning: reasoningMatch?.[1]?.trim() ?? null,
    answer: answerMatch?.[1]?.trim() ?? null,
    hasAnswerSection,
  };
}

export function parseReasoningSteps(reasoning: string): string[] {
  return reasoning
    .split(/\n+/)
    .map((line) => line.replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean);
}

export function isThinkReasoningPhase(content: string, isStreaming: boolean): boolean {
  if (!isStreaming) return false;
  const parsed = parseThinkResponse(content);
  return !parsed.hasAnswerSection;
}
