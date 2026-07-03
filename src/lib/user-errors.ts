/** Turn raw API / Ollama errors into plain-language copy for UI and toasts. */

const OLLAMA_MEMORY_PATTERNS = [
  /memory layout cannot be allocated/i,
  /failed to allocate/i,
  /out of memory/i,
];

const OLLAMA_CONNECTION_PATTERNS = [/failed to fetch/i, /connection refused/i, /network error/i];

const OLLAMA_MODEL_PATTERNS = [/model.*not found/i, /does not exist/i];

const WINDOWS_USER_PATH = /[A-Za-z]:\\Users\\[^\\]+/g;
const UNIX_USER_PATH = /\/(?:Users|home)\/[^/]+/g;

function redactUserPaths(message: string): string {
  return message
    .replace(WINDOWS_USER_PATH, "~")
    .replace(UNIX_USER_PATH, "~");
}

export function formatUserFacingError(error: unknown): string {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "Something went wrong.";

  const trimmed = redactUserPaths(message.trim());
  if (!trimmed) return "Something went wrong. Try again in a moment.";

  if (OLLAMA_MEMORY_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return "The embedding model could not load. Restart Ollama, then run: ollama pull nomic-embed-text";
  }

  if (OLLAMA_CONNECTION_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return "Cannot reach the local service. It may still be starting — wait a moment and try again.";
  }

  if (OLLAMA_MODEL_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return "A required model is missing. Install nomic-embed-text and llama3 in Ollama.";
  }

  const statusMatch = trimmed.match(/^(.+?)\s*\(status code:\s*\d+\)\s*$/i);
  if (statusMatch?.[1]) {
    return formatUserFacingError(statusMatch[1]);
  }

  if (/request failed with status/i.test(trimmed)) {
    return "The request failed. Check that the backend and Ollama are running.";
  }

  return trimmed;
}

export function isAssistantErrorMessage(content: string): boolean {
  const normalized = content.trim().toLowerCase();
  if (!normalized) return false;

  return (
    OLLAMA_MEMORY_PATTERNS.some((pattern) => pattern.test(normalized)) ||
    OLLAMA_CONNECTION_PATTERNS.some((pattern) => pattern.test(normalized)) ||
    OLLAMA_MODEL_PATTERNS.some((pattern) => pattern.test(normalized)) ||
    normalized.startsWith("collection not found") ||
    normalized.includes("request failed") ||
    normalized.includes("status code:")
  );
}
