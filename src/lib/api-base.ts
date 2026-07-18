import type { HealthResponse } from "./api";

export const DEFAULT_BACKEND_PORT = 8742;

const PORT_SCAN_RANGE = 8;
const PROBE_TIMEOUT_MS = 800;
const TAURI_QUICK_MS = 3_000;
const TAURI_BOOTSTRAP_MS = 20_000;
const POLL_INTERVAL_MS = 300;

let cachedBaseUrl: string | null = null;
let cachedPort: number | null = null;
let discoveryInFlight: Promise<string> | null = null;

export function resetApiBaseUrl(): void {
  cachedBaseUrl = null;
  cachedPort = null;
  discoveryInFlight = null;
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
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

async function readTauriBackendPort(): Promise<number | null> {
  if (!isTauriRuntime()) return null;

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const port = await invoke<number | null>("peek_backend_port");
    return typeof port === "number" && port > 0 ? port : null;
  } catch {
    return null;
  }
}

/**
 * Poll peek + /health until the backend is actually accepting requests.
 * Avoids the old one-shot `get_backend_url` wait that could hang the UI
 * and then fail the only health probe during the port-bound race.
 */
async function waitForTauriBackendHealthy(timeoutMs: number): Promise<string | null> {
  if (!isTauriRuntime()) return null;

  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const knownPort = await readTauriBackendPort();
    if (knownPort) {
      cachedPort = knownPort;
      const hit = await probeHealthAt(`http://127.0.0.1:${knownPort}`);
      if (hit) return hit;
    } else {
      // Only scan nearby ports when no port file exists yet — avoids
      // hammering 8× health probes every 300ms while cold-starting.
      const scanned = await probeBackendPort();
      if (scanned) return scanned;
      await sleep(Math.min(POLL_INTERVAL_MS * 2, Math.max(0, deadline - Date.now())));
      continue;
    }

    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    await sleep(Math.min(POLL_INTERVAL_MS, remaining));
  }

  return null;
}

async function probeBackendPort(): Promise<string | null> {
  const tauriPort = await readTauriBackendPort();
  const preferred = tauriPort ?? cachedPort ?? DEFAULT_BACKEND_PORT;
  const ports: number[] = [];

  for (let offset = 0; offset < PORT_SCAN_RANGE; offset++) {
    ports.push(preferred + offset);
    if (offset > 0) ports.push(preferred - offset);
  }

  for (const port of ports) {
    if (port <= 0 || port > 65535) continue;
    const hit = await probeHealthAt(`http://127.0.0.1:${port}`);
    if (hit) return hit;
  }

  return null;
}

async function discoverApiBaseUrl(options?: { bootstrap?: boolean }): Promise<string> {
  if (cachedBaseUrl) {
    const stillHealthy = await probeHealthAt(cachedBaseUrl);
    if (stillHealthy) return stillHealthy;
    resetApiBaseUrl();
  }

  const tauriTimeout = options?.bootstrap ? TAURI_BOOTSTRAP_MS : TAURI_QUICK_MS;

  if (isTauriRuntime()) {
    const fromTauri = await waitForTauriBackendHealthy(tauriTimeout);
    if (fromTauri) return fromTauri;
  }

  const discovered = await probeBackendPort();
  if (discovered) return discovered;

  throw new Error("Local backend is still starting");
}

export async function getApiBaseUrl(options?: { bootstrap?: boolean }): Promise<string> {
  if (cachedBaseUrl) {
    const stillHealthy = await probeHealthAt(cachedBaseUrl);
    if (stillHealthy) return stillHealthy;
    resetApiBaseUrl();
  }

  if (!discoveryInFlight) {
    discoveryInFlight = discoverApiBaseUrl(options).finally(() => {
      discoveryInFlight = null;
    });
  }

  return discoveryInFlight;
}

export async function apiUrl(path: string, options?: { bootstrap?: boolean }): Promise<string> {
  const base = await getApiBaseUrl(options);
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
