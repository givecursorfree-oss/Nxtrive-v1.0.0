export type ChatResponseMode = "default" | "search" | "think" | "sources";

export type PromptMode = "search" | "think" | "sources" | null;

export function toApiMode(mode: PromptMode): ChatResponseMode {
  if (!mode) return "default";
  if (mode === "sources") return "sources";
  return mode;
}

export function getModeLabel(mode?: ChatResponseMode): string | null {
  switch (mode) {
    case "search":
      return "Search";
    case "think":
      return "Think";
    case "sources":
      return "Citations";
    default:
      return null;
  }
}
