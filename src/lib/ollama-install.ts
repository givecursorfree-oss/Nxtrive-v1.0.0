import { getCurrentOS, type PlatformOS } from "./api";
import { openExternalUrl } from "./openExternal";
import { isTauriApp } from "./tauri";

export const OLLAMA_HOME_URL = "https://ollama.com";

export const OLLAMA_DOWNLOAD_URLS = {
  windows: "https://ollama.com/download/windows",
  macos: "https://ollama.com/download/mac",
  linux: "https://ollama.com/download/linux",
} as const;

export const OLLAMA_FALLBACK_URL = "https://ollama.com/download";

export function getOllamaInstallUrlForPlatform(os: PlatformOS): string {
  if (os === "windows") return OLLAMA_DOWNLOAD_URLS.windows;
  if (os === "macos") return OLLAMA_DOWNLOAD_URLS.macos;
  if (os === "linux") return OLLAMA_DOWNLOAD_URLS.linux;
  return OLLAMA_HOME_URL;
}

export const OLLAMA_TERMINAL_INSTALL_COMMANDS = {
  windows: "irm https://ollama.com/install.ps1 | iex",
  macos: "curl -fsSL https://ollama.com/install.sh | sh",
  linux: "curl -fsSL https://ollama.com/install.sh | sh",
} as const;

export function getOllamaTerminalInstallCommand(os: PlatformOS): string | null {
  if (os === "windows") return OLLAMA_TERMINAL_INSTALL_COMMANDS.windows;
  if (os === "macos") return OLLAMA_TERMINAL_INSTALL_COMMANDS.macos;
  if (os === "linux") return OLLAMA_TERMINAL_INSTALL_COMMANDS.linux;
  return null;
}

export function getPlatformLabel(os: PlatformOS): string {
  switch (os) {
    case "windows":
      return "Windows";
    case "macos":
      return "macOS";
    case "linux":
      return "Linux";
    default:
      return "your system";
  }
}

export interface OllamaInstallGuide {
  os: PlatformOS;
  platformLabel: string;
  installUrl: string;
  automaticLabel: string;
  manualCommand: string | null;
  manualLabel: string;
  steps: string[];
}

export async function getOllamaInstallGuide(
  backendInstallUrl?: string | null,
): Promise<OllamaInstallGuide> {
  const os = await getCurrentOS();
  const clientUrl = getOllamaInstallUrlForPlatform(os);
  const installUrl =
    clientUrl !== OLLAMA_FALLBACK_URL ? clientUrl : backendInstallUrl ?? OLLAMA_FALLBACK_URL;
  const platformLabel = getPlatformLabel(os);

  if (os === "windows") {
    return {
      os,
      platformLabel,
      installUrl,
      automaticLabel: "Automatic — install via PowerShell",
      manualCommand: OLLAMA_TERMINAL_INSTALL_COMMANDS.windows,
      manualLabel: "Manual — copy PowerShell install command",
      steps: [
        "We open PowerShell and run the official Ollama installer automatically.",
        "If install fails with exit code 8, restart Windows and try again, or use the winget fallback in Terminal.",
        "Come back here — Nxtrive detects Ollama and continues on its own.",
      ],
    };
  }

  if (os === "macos") {
    return {
      os,
      platformLabel,
      installUrl,
      automaticLabel: "Automatic — install via Terminal",
      manualCommand: OLLAMA_TERMINAL_INSTALL_COMMANDS.macos,
      manualLabel: "Manual — copy install script for Terminal",
      steps: [
        "We open Terminal and run the official Ollama install script automatically.",
        "Follow any prompts in the Terminal window.",
        "Come back here — Nxtrive continues automatically.",
      ],
    };
  }

  if (os === "linux") {
    return {
      os,
      platformLabel,
      installUrl,
      automaticLabel: "Automatic — install via Terminal",
      manualCommand: OLLAMA_TERMINAL_INSTALL_COMMANDS.linux,
      manualLabel: "Manual — copy install script for Terminal",
      steps: [
        "We open Terminal and run the official Ollama install script automatically.",
        "Follow any prompts in the Terminal window.",
        "Come back here — Nxtrive continues automatically.",
      ],
    };
  }

  return {
    os,
    platformLabel,
    installUrl: backendInstallUrl ?? OLLAMA_FALLBACK_URL,
    automaticLabel: "Automatic — open Ollama download page",
    manualCommand: null,
    manualLabel: "Manual — open download page and pick your OS",
    steps: [
      "Open the Ollama download page and choose your operating system.",
      "Complete installation.",
      "Return here and click Verify setup.",
    ],
  };
}

export async function runOllamaAutomaticInstall(
  backendInstallUrl?: string | null,
  onProgress?: (message: string) => void,
): Promise<OllamaInstallGuide> {
  const guide = await getOllamaInstallGuide(backendInstallUrl);

  if (isTauriApp()) {
    onProgress?.("Opening Terminal to install Ollama for your system…");
    const { spawnTerminalOllamaInstall } = await import("./ollama-download");
    await spawnTerminalOllamaInstall();
    onProgress?.("Installing Ollama in Terminal — we'll detect it automatically.");
    return guide;
  }

  onProgress?.("Opening ollama.com in your browser…");
  await openExternalUrl(guide.installUrl);
  onProgress?.("Install Ollama like any normal app — we'll detect it automatically.");
  return guide;
}

export async function openOllamaInstallPage(backendInstallUrl?: string | null): Promise<string> {
  const guide = await runOllamaAutomaticInstall(backendInstallUrl);
  return guide.installUrl;
}

export async function openOllamaInstallAutomatic(
  backendInstallUrl?: string | null,
): Promise<OllamaInstallGuide> {
  return runOllamaAutomaticInstall(backendInstallUrl);
}

export async function openOllamaInstallManual(
  backendInstallUrl?: string | null,
): Promise<OllamaInstallGuide> {
  const guide = await getOllamaInstallGuide(backendInstallUrl);

  if (guide.manualCommand) {
    try {
      await navigator.clipboard.writeText(guide.manualCommand);
    } catch {
      // Clipboard may be blocked; command stays visible in the setup gate.
    }
  }

  await openExternalUrl(guide.installUrl);
  return guide;
}

/** Pure helper for tests — maps OS to the official Ollama download path. */
export function resolveInstallUrl(os: PlatformOS, backendUrl?: string | null): string {
  const clientUrl = getOllamaInstallUrlForPlatform(os);
  return clientUrl !== OLLAMA_FALLBACK_URL ? clientUrl : backendUrl ?? OLLAMA_FALLBACK_URL;
}
