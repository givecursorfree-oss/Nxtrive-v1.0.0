import { isTauriApp } from "@/lib/ollama-download";

import { resetApiBaseUrl } from "@/lib/api-base";



let bootstrapStarted = false;



/** Fire-and-forget backend spawn as early as possible when the desktop app opens. */
export function bootstrapBackend(): void {
  if (!isTauriApp() || bootstrapStarted) return;
  bootstrapStarted = true;
  void ensureBackendStarted().catch((error) => {
    console.warn("bootstrapBackend failed", error);
  });
}



export async function ensureBackendStarted(): Promise<void> {
  if (!isTauriApp()) return;

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("ensure_backend_started");
  } catch (error) {
    // Keep the original spawn error available for setup UI diagnostics.
    console.warn("ensure_backend_started failed", error);
    throw error instanceof Error ? error : new Error(String(error));
  }
}

export async function peekBackendError(): Promise<string | null> {
  if (!isTauriApp()) return null;

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const message = await invoke<string | null>("peek_backend_error");
    return message?.trim() ? message.trim() : null;
  } catch {
    return null;
  }
}

export async function restartBackend(): Promise<void> {
  if (!isTauriApp()) return;

  resetApiBaseUrl();

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("restart_backend");
  } catch (error) {
    console.warn("restart_backend failed", error);
    throw error instanceof Error ? error : new Error(String(error));
  }
}



export function sleep(ms: number): Promise<void> {

  return new Promise((resolve) => window.setTimeout(resolve, ms));

}



export function backendWarmupMs(attempt: number): number {
  if (attempt <= 1) return 600;
  if (attempt <= 4) return 500;
  return Math.min(700 + attempt * 150, 3000);
}



export async function shutdownApp(): Promise<void> {

  if (!isTauriApp()) return;



  resetApiBaseUrl();



  try {

    const { invoke } = await import("@tauri-apps/api/core");

    await invoke("shutdown_app");

  } catch {

    // App may already be closing.

  }

}


