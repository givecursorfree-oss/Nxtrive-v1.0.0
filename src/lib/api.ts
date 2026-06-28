import type { ChatResponseMode } from "./chat-modes";
import { apiUrl, DEFAULT_BACKEND_PORT, getApiBaseUrl, resetApiBaseUrl } from "./api-base";
import { formatUserFacingError } from "./user-errors";

export { DEFAULT_BACKEND_PORT, getApiBaseUrl, resetApiBaseUrl };
/** @deprecated Use getApiBaseUrl() — port is discovered at runtime. */
export const API_BASE_URL = `http://127.0.0.1:${DEFAULT_BACKEND_PORT}`;

export type PlatformOS = "windows" | "macos" | "linux" | "unknown";

export interface CollectionInfo {
  name: string;
  document_count: number;
}

export interface HealthResponse {
  status: "ok" | "error";
  models: string[];
  platform: string;
  data_dir: string;
  port: number;
}

export interface OllamaStatus {
  installed: boolean;
  running: boolean;
  models: string[];
  required_models: string[];
  missing_models: string[];
  ready: boolean;
  install_url: string;
  platform: string;
  binary_path: string | null;
  error: string | null;
}

export interface OllamaPullProgress {
  status: "pulling" | "progress" | "pulled" | "completed" | "error";
  model?: string;
  message?: string;
  error?: string;
}

export interface IngestProgress {
  status: string;
  file: string;
  current: number;
  total: number;
  chunks_added: number;
  error?: string;
}

export async function getCurrentOS(): Promise<PlatformOS> {
  try {
    const { type } = await import("@tauri-apps/plugin-os");
    const osType = type();
    if (osType === "windows" || osType === "macos" || osType === "linux") {
      return osType;
    }
    return "unknown";
  } catch {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes("win")) return "windows";
    if (userAgent.includes("mac")) return "macos";
    if (userAgent.includes("linux")) return "linux";
    return "unknown";
  }
}

export async function getSendShortcutLabel(): Promise<string> {
  const os = await getCurrentOS();
  return os === "macos" ? "⌘+Enter" : "Ctrl+Enter";
}

async function parseError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { detail?: string };
    return formatUserFacingError(payload.detail ?? `Request failed with status ${response.status}`);
  } catch {
    return formatUserFacingError(`Request failed with status ${response.status}`);
  }
}

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch(await apiUrl("/health"));
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  return response.json() as Promise<HealthResponse>;
}

export async function fetchCollections(): Promise<CollectionInfo[]> {
  const response = await fetch(await apiUrl("/collections"));
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  const payload = (await response.json()) as { collections: CollectionInfo[] };
  return payload.collections;
}

export async function fetchOllamaStatus(): Promise<OllamaStatus> {
  const response = await fetch(await apiUrl("/ollama-status"));
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  return response.json() as Promise<OllamaStatus>;
}

export async function streamOllamaPull(
  models: string[] | undefined,
  onProgress: (progress: OllamaPullProgress) => void,
  onError: (message: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(await apiUrl("/ollama/pull"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ models: models ?? null }),
    signal,
  });

  if (!response.ok || !response.body) {
    throw new Error(await parseError(response));
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const event of events) {
      const line = event.trim();
      if (!line.startsWith("data: ")) continue;
      const payload = JSON.parse(line.slice(6)) as OllamaPullProgress;
      onProgress(payload);
      if (payload.status === "error") {
        onError(payload.error ?? "Model download failed");
      }
    }
  }
}

export async function streamIngest(
  folderPath: string,
  collectionName: string,
  onProgress: (progress: IngestProgress) => void,
  onError: (message: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(await apiUrl("/ingest"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder_path: folderPath, collection_name: collectionName }),
    signal,
  });

  if (!response.ok || !response.body) {
    throw new Error(await parseError(response));
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      if (signal?.aborted) {
        await reader.cancel();
        break;
      }

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";

      for (const event of events) {
        const line = event.trim();
        if (!line.startsWith("data: ")) continue;
        const payload = JSON.parse(line.slice(6)) as IngestProgress;
        onProgress(payload);
        if (payload.status === "error" && payload.total === 0 && payload.current === 0) {
          onError(formatUserFacingError(payload.error ?? "Indexing failed"));
        }
      }
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  }
}

export async function streamIngestDrop(
  rootName: string,
  collectionName: string,
  files: { relativePath: string; file: File }[],
  onProgress: (progress: IngestProgress) => void,
  onError: (message: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const formData = new FormData();
  formData.append("collection_name", collectionName);
  formData.append("root_name", rootName);

  for (const { relativePath, file } of files) {
    formData.append("paths", relativePath);
    formData.append("files", file, relativePath);
  }

  const response = await fetch(await apiUrl("/ingest-drop"), {
    method: "POST",
    body: formData,
    signal,
  });

  if (!response.ok || !response.body) {
    throw new Error(await parseError(response));
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      if (signal?.aborted) {
        await reader.cancel();
        break;
      }

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";

      for (const event of events) {
        const line = event.trim();
        if (!line.startsWith("data: ")) continue;
        const payload = JSON.parse(line.slice(6)) as IngestProgress;
        onProgress(payload);
        if (payload.status === "error" && payload.total === 0 && payload.current === 0) {
          onError(formatUserFacingError(payload.error ?? "Indexing failed"));
        }
      }
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  }
}

export async function deleteCollection(name: string): Promise<void> {
  const response = await fetch(await apiUrl(`/collection/${encodeURIComponent(name)}`), {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}

export interface CollectionSourceInfo {
  path: string;
  file_name: string;
  file_type: string;
  chunk_count: number;
}

export interface SourcePreview {
  kind: "text" | "pdf" | "unavailable";
  file_name: string;
  content?: string;
  content_base64?: string;
  preview_note?: string;
  message?: string;
}

export async function fetchCollectionSources(collectionName: string): Promise<CollectionSourceInfo[]> {
  const response = await fetch(
    await apiUrl(`/collection/${encodeURIComponent(collectionName)}/sources`),
  );
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  const payload = (await response.json()) as { sources: CollectionSourceInfo[] };
  return payload.sources;
}

export async function deleteCollectionSource(
  collectionName: string,
  sourcePath: string,
): Promise<number> {
  const response = await fetch(
    await apiUrl(`/collection/${encodeURIComponent(collectionName)}/sources`),
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source_path: sourcePath }),
    },
  );
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  const payload = (await response.json()) as { chunks_removed: number };
  return payload.chunks_removed;
}

export async function fetchSourcePreview(
  collectionName: string,
  sourcePath: string,
): Promise<SourcePreview> {
  const params = new URLSearchParams({ source_path: sourcePath });
  const response = await fetch(
    await apiUrl(`/collection/${encodeURIComponent(collectionName)}/preview?${params}`),
  );
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  return response.json() as Promise<SourcePreview>;
}

export type ChatStreamEvent =
  | { type: "token"; token: string }
  | { type: "sources"; sources: string[] }
  | { type: "done" }
  | { type: "error"; error: string };

export async function streamChat(
  question: string,
  collectionName: string,
  topK: number,
  responseMode: ChatResponseMode,
  onEvent: (event: ChatStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(await apiUrl("/chat"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question,
      collection_name: collectionName,
      top_k: topK,
      response_mode: responseMode,
    }),
    signal,
  });

  if (!response.ok || !response.body) {
    throw new Error(await parseError(response));
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const event of events) {
      const line = event.trim();
      if (!line.startsWith("data: ")) continue;
      const payload = JSON.parse(line.slice(6)) as Record<string, unknown>;

      if (payload.type === "sources") {
        onEvent({ type: "sources", sources: payload.sources as string[] });
        continue;
      }
      if (payload.type === "done") {
        onEvent({ type: "done" });
        continue;
      }
      if (payload.type === "error") {
        onEvent({ type: "error", error: formatUserFacingError(String(payload.error ?? "Chat failed")) });
        continue;
      }
      if (typeof payload.token === "string") {
        onEvent({ type: "token", token: payload.token });
      }
    }
  }
}
