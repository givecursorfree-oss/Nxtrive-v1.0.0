import { useEffect, useRef, useState } from "react";

import type { OllamaStatus } from "@/lib/api";
import {
  downloadModels,
  installOllamaForUser,
} from "@/lib/ollama-download";
import { isTauriApp } from "@/lib/tauri";
import type { SetupPhase } from "./useSetupGate";

interface UseSetupAutomationOptions {
  enabled: boolean;
  phase: SetupPhase;
  checking: boolean;
  ollamaStatus: OllamaStatus | null;
  onRecheck: () => void;
}

export function useSetupAutomation({
  enabled,
  phase,
  checking,
  ollamaStatus,
  onRecheck,
}: UseSetupAutomationOptions) {
  const [installNotice, setInstallNotice] = useState<string | null>(null);
  const [pulling, setPulling] = useState(false);
  const [pullingModel, setPullingModel] = useState<string | null>(null);
  const [pullLog, setPullLog] = useState<string | null>(null);
  const [pullError, setPullError] = useState<string | null>(null);

  const autoStartedRef = useRef<Set<string>>(new Set());
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!ollamaStatus?.installed) {
      autoStartedRef.current.delete("install");
      autoStartedRef.current.delete("models");
    }
  }, [ollamaStatus?.installed]);

  useEffect(() => {
    if (!enabled || checking) return;

    if (phase === "install-ollama" && !autoStartedRef.current.has("install")) {
      autoStartedRef.current.add("install");

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      void (async () => {
        setPullError(null);
        setInstallNotice("Opening Terminal to install Ollama…");

        try {
          const installed = await installOllamaForUser(
            ollamaStatus?.install_url,
            (message) => setInstallNotice(message),
            controller.signal,
          );

          if (controller.signal.aborted) return;

          if (installed) {
            setInstallNotice("Ollama installed — continuing setup…");
            onRecheck();
          } else {
            setPullError(
              "Ollama did not finish installing in time. Finish the installer, then click Check again.",
            );
          }
        } catch (err) {
          if (controller.signal.aborted) return;
          const message = err instanceof Error ? err.message : "Could not open Ollama install page";
          setPullError(message);
        }
      })();
      return;
    }

    if (phase === "start-ollama") {
      return;
    }

    const missingModels = ollamaStatus?.missing_models ?? [];
    if (
      isTauriApp() &&
      phase === "download-models" &&
      ollamaStatus?.running &&
      missingModels.length > 0 &&
      !autoStartedRef.current.has("models")
    ) {
      autoStartedRef.current.add("models");

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      void (async () => {
        setPulling(true);
        setPullError(null);
        setPullLog(null);
        setPullingModel(missingModels[0] ?? null);

        let downloadFailed = false;

        try {
          await downloadModels(
            missingModels,
            (message) => {
              setPullLog(message);
              const match = message.match(/Downloading ([\w-]+)/i);
              if (match?.[1]) setPullingModel(match[1]);
            },
            (message) => {
              downloadFailed = true;
              setPullError(message);
            },
            controller.signal,
          );

          if (controller.signal.aborted) return;

          if (!downloadFailed) {
            setInstallNotice(null);
            onRecheck();
          } else {
            autoStartedRef.current.delete("models");
          }
        } catch (err) {
          if (controller.signal.aborted) return;
          const message = err instanceof Error ? err.message : "Download failed";
          setPullError(message);
          autoStartedRef.current.delete("models");
        } finally {
          setPulling(false);
          setPullingModel(null);
        }
      })();
    }
  }, [enabled, phase, checking, ollamaStatus, onRecheck]);

  const runModelDownload = async (models: string[]) => {
    if (!models.length) return;

    abortRef.current?.abort();
    autoStartedRef.current.delete("models");

    await new Promise((resolve) => window.setTimeout(resolve, 50));

    const controller = new AbortController();
    abortRef.current = controller;

    setPulling(true);
    setPullError(null);
    setPullLog(null);
    setPullingModel(models[0] ?? null);

    try {
      let downloadFailed = false;

      await downloadModels(
        models,
        (message) => {
          setPullLog(message);
          const match = message.match(/Downloading ([\w-]+)/i);
          if (match?.[1]) setPullingModel(match[1]);
        },
        (message) => {
          downloadFailed = true;
          setPullError(message);
        },
        controller.signal,
      );

      if (controller.signal.aborted) return;

      if (!downloadFailed) {
        onRecheck();
      } else {
        autoStartedRef.current.delete("models");
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      const message = err instanceof Error ? err.message : "Download failed";
      setPullError(message);
      autoStartedRef.current.delete("models");
    } finally {
      setPulling(false);
      setPullingModel(null);
    }
  };

  return {
    installNotice,
    setInstallNotice,
    pulling,
    pullingModel,
    pullLog,
    pullError,
    setPullError,
    runModelDownload,
  };
}
