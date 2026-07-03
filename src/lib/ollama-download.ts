import { fetchOllamaStatus } from "@/lib/api";
import { isModelInstalled } from "@/lib/ollama-models";
import { isTauriApp } from "@/lib/tauri";
import { formatUserFacingError } from "@/lib/user-errors";

export { isTauriApp };

const POLL_MS = 2500;
const MAX_WAIT_MS = 45 * 60 * 1000;
const TERMINAL_CLOSE_GRACE_MS = 3000;

async function isTerminalSessionFinished(sessionId: string): Promise<boolean> {
  if (!sessionId || !isTauriApp()) return false;
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<boolean>("terminal_download_session_finished", { sessionId });
  } catch {
    return false;
  }
}

async function resolveOllamaBinary(): Promise<string | undefined> {
  return undefined;
}

/** Open the system terminal and run `ollama pull` (Windows / macOS / Linux). */
export async function downloadModelsViaTerminal(
  models: string[],
  onProgress: (message: string) => void,
  onError: (message: string) => void,
  signal?: AbortSignal,
): Promise<boolean> {
  if (!models.length) return true;

  if (!isTauriApp()) {
    onError("Model downloads require the Nxtrive desktop app.");
    return false;
  }

  onProgress("Opening Terminal to download models…");

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const sessionId = await invoke<string>("spawn_ollama_pull_terminal", {
      models,
      binaryPath: await resolveOllamaBinary(),
    });
    if (!sessionId) return true;

    onProgress("Terminal opened — downloading in the background. We'll verify automatically.");
    const ok = await waitForModelsInstalled(onProgress, signal, models, sessionId);
    if (signal?.aborted) return false;
    if (!ok) {
      onError(
        "Terminal closed before models finished. Click Run again in Terminal to reopen and continue.",
      );
      return false;
    }

    return true;
  } catch (err) {
    onError(formatUserFacingError(err));
    return false;
  }
}

/** Terminal-only model download. */
export async function downloadModels(
  models: string[],
  onProgress: (message: string) => void,
  onError: (message: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  if (!models.length) return;

  const status = await fetchOllamaStatus().catch(() => null);

  if (!status?.installed) {
    onError("Install Ollama first, then download the required models.");
    return;
  }

  if (!status.running) {
    onProgress("Starting Ollama…");
    const running = await waitForOllamaRunning(onProgress, signal);
    if (!running) {
      onError("Ollama is not running yet. Open the Ollama app, then try again.");
      return;
    }
  }

  await downloadModelsViaTerminal(models, onProgress, onError, signal);
}

/** @deprecated Use downloadModels */
export const downloadModelsWithFallback = downloadModels;

export async function waitForOllamaRunning(
  onProgress: (message: string) => void,
  signal?: AbortSignal,
  maxWaitMs = 60_000,
): Promise<boolean> {
  const started = Date.now();

  while (Date.now() - started < maxWaitMs) {
    if (signal?.aborted) return false;

    const status = await fetchOllamaStatus();
    if (status.running) {
      onProgress("Ollama is running.");
      return true;
    }

    if (status.installed) {
      onProgress("Ollama installed. Starting it now…");
    } else {
      onProgress("Waiting for Ollama…");
    }

    await sleep(POLL_MS, signal);
  }

  return false;
}

export async function installOllamaForUser(
  installUrl: string | null | undefined,
  onProgress: (message: string) => void,
  signal?: AbortSignal,
): Promise<boolean> {
  const { runOllamaAutomaticInstall } = await import("@/lib/ollama-install");
  await runOllamaAutomaticInstall(installUrl, onProgress);

  const installed = await waitForOllamaInstalled(onProgress, signal);
  if (!installed) return false;
  return waitForOllamaRunning(onProgress, signal);
}

export async function spawnTerminalModelPull(models: string[]): Promise<void> {
  if (!models.length) return;

  if (!isTauriApp()) {
    throw new Error("Terminal download is only available in the desktop app.");
  }

  const { invoke } = await import("@tauri-apps/api/core");
  await invoke<string>("spawn_ollama_pull_terminal", {
    models,
    binaryPath: await resolveOllamaBinary(),
  });
}

export async function spawnTerminalOllamaInstall(): Promise<void> {
  if (!isTauriApp()) {
    throw new Error("Terminal install is only available in the desktop app.");
  }

  const { invoke } = await import("@tauri-apps/api/core");
  await invoke("spawn_ollama_install_terminal");
}

export async function waitForOllamaInstalled(
  onProgress: (message: string) => void,
  signal?: AbortSignal,
): Promise<boolean> {
  const started = Date.now();

  while (Date.now() - started < MAX_WAIT_MS) {
    if (signal?.aborted) return false;

    const status = await fetchOllamaStatus();
    if (status.installed) {
      onProgress("Ollama installed. Verifying…");
      return true;
    }

    onProgress("Waiting for you to finish installing Ollama…");
    await sleep(POLL_MS, signal);
  }

  onProgress("Timed out waiting for Ollama. Try Verify setup or install again.");
  return false;
}

export async function waitForModelsInstalled(
  onProgress: (message: string) => void,
  signal?: AbortSignal,
  models?: string[],
  sessionId?: string,
): Promise<boolean> {
  const started = Date.now();
  const targetModels = models ?? [];

  while (Date.now() - started < MAX_WAIT_MS) {
    if (signal?.aborted) return false;

    const status = await fetchOllamaStatus();
    const stillMissing = targetModels.length
      ? targetModels.filter((model) => !isModelInstalled(model, status.models))
      : status.missing_models;

    if (stillMissing.length === 0) {
      onProgress("All models verified in Terminal. Continuing setup…");
      return status.ready;
    }

    if (
      sessionId &&
      Date.now() - started > TERMINAL_CLOSE_GRACE_MS &&
      (await isTerminalSessionFinished(sessionId))
    ) {
      onProgress("Terminal closed before models finished.");
      return false;
    }

    onProgress(`Downloading… still waiting for: ${stillMissing.join(", ")}`);
    await sleep(POLL_MS, signal);
  }

  onProgress("Timed out waiting for models. Try Download again.");
  return false;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(resolve, ms);
    if (signal) {
      if (signal.aborted) {
        window.clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }
      signal.addEventListener(
        "abort",
        () => {
          window.clearTimeout(timer);
          reject(new DOMException("Aborted", "AbortError"));
        },
        { once: true },
      );
    }
  });
}
