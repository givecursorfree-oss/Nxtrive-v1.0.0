import type { HealthResponse } from "./api";

export const DEFAULT_BACKEND_PORT = 8742;

const PORT_SCAN_RANGE = 80;
const PROBE_TIMEOUT_MS = 1500;
const TAURI_WAIT_MS = 180_000;

let cachedBaseUrl: string | null = null;
let cachedPort: number | null = null;

export function resetApiBaseUrl(): void {
  cachedBaseUrl = null;
  cachedPort = null;
}

export function getCachedBackendPort(): number | null {
  return cachedPort;
}

function cacheUrl(url: string, port?: number): string {
  cachedBaseUrl = url;
  if (port !== undefined) cachedPort = port;
  else {
    try {
      const parsed = new URL(url);
      cachedPort = parsed.port ? Number(parsed.port) : DEFAULT_BACKEND_PORT;
    } catch {
      cachedPort = DEFAULT_BACKEND_PORT;
    }
  }
  return url;
}

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function probeHealthAt(url: string): Promise<string | null> {
  try {
    const response = await fetch(`${url}/health`, {
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as HealthResponse;
    if (payload.status !== "ok") return null;

    const resolvedPort = payload.port ?? Number(new URL(url).port) ?? DEFAULT_BACKEND_PORT;
    return cacheUrl(`http://127.0.0.1:${resolvedPort}`, resolvedPort);
  } catch {
    return null;
  }
}

async function probeBackendPort(): Promise<string | null> {
  const preferred = cachedPort ?? DEFAULT_BACKEND_PORT;
  const ports = new Set<number>();

  for (let offset = 0; offset < PORT_SCAN_RANGE; offset++) {
    ports.add(preferred + offset);
    if (offset > 0) ports.add(preferred - offset);
  }

  for (const port of ports) {
    if (port <= 0 || port > 65535) continue;
    const hit = await probeHealthAt(`http://127.0.0.1:${port}`);
    if (hit) return hit;
  }

  return null;
}

async function readTauriBackendUrl(timeoutMs = TAURI_WAIT_MS): Promise<string | null> {
  if (!isTauriRuntime()) {
    return null;
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const url = await invoke<string>("get_backend_url", { timeoutMs });
    return probeHealthAt(url);
  } catch {
    return null;
  }
}

export async function getApiBaseUrl(): Promise<string> {
  if (cachedBaseUrl) {
    const stillHealthy = await probeHealthAt(cachedBaseUrl);
    if (stillHealthy) return stillHealthy;
    resetApiBaseUrl();
  }

  if (isTauriRuntime()) {
    const fromTauri = await readTauriBackendUrl();
    if (fromTauri) return fromTauri;
  }

  const discovered = await probeBackendPort();
  if (discovered) return discovered;

  if (isTauriRuntime()) {
    const retryFromTauri = await readTauriBackendUrl();
    if (retryFromTauri) return retryFromTauri;
  }

  const retry = await probeBackendPort();
  if (retry) return retry;

  throw new Error("Local backend is still starting");
}

export async function apiUrl(path: string): Promise<string> {
  const base = await getApiBaseUrl();
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
