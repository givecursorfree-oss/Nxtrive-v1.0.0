import { isTauriApp } from "@/lib/ollama-download";

import { resetApiBaseUrl } from "@/lib/api-base";



let bootstrapStarted = false;



/** Fire-and-forget backend spawn as early as possible when the desktop app opens. */

export function bootstrapBackend(): void {

  if (!isTauriApp() || bootstrapStarted) return;

  bootstrapStarted = true;

  void ensureBackendStarted();

}



export async function ensureBackendStarted(): Promise<void> {

  if (!isTauriApp()) return;



  try {

    const { invoke } = await import("@tauri-apps/api/core");

    await invoke("ensure_backend_started");

  } catch {

    // Spawn may already be in progress.

  }

}



export async function restartBackend(): Promise<void> {

  if (!isTauriApp()) return;



  resetApiBaseUrl();



  try {

    const { invoke } = await import("@tauri-apps/api/core");

    await invoke("restart_backend");

  } catch {

    // Backend may already be starting; health polling will confirm.

  }

}



export function sleep(ms: number): Promise<void> {

  return new Promise((resolve) => window.setTimeout(resolve, ms));

}



export function backendWarmupMs(attempt: number): number {

  if (attempt <= 1) return 0;

  if (attempt <= 4) return 400;

  return Math.min(1200 + attempt * 300, 8000);

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


