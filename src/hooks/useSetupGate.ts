import { useCallback, useEffect, useRef, useState } from "react";
import { fetchHealth, fetchOllamaStatus, type OllamaStatus } from "../lib/api";
import {
  backendWarmupMs,
  bootstrapBackend,
  ensureBackendStarted,
  peekBackendError,
  restartBackend,
  sleep,
} from "../lib/backend-lifecycle";
import { resetApiBaseUrl } from "../lib/api-base";
import { BRAND_NAME } from "../lib/brand";
import { isTauriApp } from "../lib/ollama-download";
import { formatUserFacingError } from "../lib/user-errors";
import {
  DEFAULT_REQUIRED_MODELS,
  isSetupFullyReady,
} from "../lib/setup-prerequisites";

export type SetupPhase =
  | "checking"
  | "backend-offline"
  | "install-ollama"
  | "start-ollama"
  | "download-models"
  | "ready";

const POLL_MS = 4000;
const BACKEND_POLL_MS = 2500;
const RESUME_DEBOUNCE_MS = 400;
const RESTART_EVERY_ATTEMPTS = 8;
const SHOW_STATUS_AFTER_ATTEMPTS = 2;

function normalizeOllamaStatus(status: OllamaStatus): OllamaStatus {
  const required =
    status.required_models?.length > 0
      ? status.required_models
      : [...DEFAULT_REQUIRED_MODELS];
  const models = status.models ?? [];
  const missing =
    status.missing_models?.length > 0
      ? status.missing_models
      : required.filter(
          (model) =>
            !models.some((name) => name === model || name.startsWith(`${model}:`)),
        );

  const installed = Boolean(status.installed);
  const running = Boolean(status.running);
  const ready = installed && running && missing.length === 0 && Boolean(status.ready);

  return {
    ...status,
    installed,
    running,
    models,
    required_models: required,
    missing_models: missing,
    ready,
  };
}

function resolvePhase(backendOnline: boolean, status: OllamaStatus | null): SetupPhase {
  if (!backendOnline) return "backend-offline";
  if (!status) return "checking";
  if (!status.installed) return "install-ollama";
  if (!status.running) return "start-ollama";
  if (!status.ready || status.missing_models.length > 0) return "download-models";
  if (!isSetupFullyReady(true, status)) return "download-models";
  return "ready";
}

function formatBackendCrash(message: string): string {
  if (/Failed to load Python DLL|python3\d+\.dll|Invalid access to memory location/i.test(message)) {
    return "The local service failed to start (runtime unpack error). Reinstall Nxtrive, then click Retry startup. If it persists, temporarily allow Nxtrive in antivirus.";
  }
  if (/Failed to spawn|Failed to resolve sidecar/i.test(message)) {
    return "The local service binary could not be started. Reinstall Nxtrive and try again.";
  }
  return formatUserFacingError(message);
}

function formatBackendError(err: unknown, attempt: number): string | null {
  if (attempt < SHOW_STATUS_AFTER_ATTEMPTS) return null;

  const message = err instanceof Error ? err.message : `Cannot reach ${BRAND_NAME} service`;
  if (
    message === "Failed to fetch" ||
    message.includes("fetch") ||
    message.includes("still starting")
  ) {
    return attempt >= 6
      ? "The local service is taking longer than expected. You can retry or keep waiting."
      : "Still starting the local service…";
  }
  return formatBackendCrash(message);
}

export function useSetupGate() {
  const [phase, setPhase] = useState<SetupPhase>("checking");
  const [backendOnline, setBackendOnline] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null);
  const [checking, setChecking] = useState(true);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [backendAttempt, setBackendAttempt] = useState(0);
  const [startedAt] = useState(() => Date.now());

  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const attemptRef = useRef(0);
  const bootstrappedRef = useRef(false);
  const checkInFlightRef = useRef(false);
  const checkGenerationRef = useRef(0);

  useEffect(() => {
    if (!isTauriApp() || bootstrappedRef.current) return;
    bootstrappedRef.current = true;
    bootstrapBackend();
  }, []);

  const runCheck = useCallback(async (options?: {
    silent?: boolean;
    bootstrap?: boolean;
    force?: boolean;
  }) => {
    if (checkInFlightRef.current && !options?.force) return;
    const generation = ++checkGenerationRef.current;
    checkInFlightRef.current = true;

    if (!options?.silent) {
      setChecking(true);
    }

    const isCurrent = () => generation === checkGenerationRef.current;

    try {
      let online = false;

      const isRetry = phaseRef.current === "backend-offline" || attemptRef.current > 0;

      if (isRetry) {
        attemptRef.current += 1;
        setBackendAttempt(attemptRef.current);

        if (
          isTauriApp() &&
          attemptRef.current > 1 &&
          attemptRef.current % RESTART_EVERY_ATTEMPTS === 0
        ) {
          resetApiBaseUrl();
          try {
            await restartBackend();
          } catch {
            // Health poll + backend.error file will surface the failure.
          }
          await sleep(1200);
        } else if (isTauriApp() && attemptRef.current === 1) {
          try {
            await ensureBackendStarted();
          } catch {
            // Continue to health poll / crash diagnostics.
          }
        }

        await sleep(backendWarmupMs(attemptRef.current));
      } else {
        attemptRef.current = 1;
        setBackendAttempt(1);
        if (isTauriApp()) {
          try {
            await ensureBackendStarted();
          } catch {
            // Continue to health poll / crash diagnostics.
          }
          await sleep(backendWarmupMs(1));
        }
      }

      if (!isCurrent()) return;

      // Prefer short polls after the first couple of attempts so the UI can
      // refresh status instead of appearing frozen on one long discovery.
      const useBootstrap =
        options?.bootstrap ?? (attemptRef.current <= 2 && phaseRef.current !== "backend-offline");

      try {
        await fetchHealth({ bootstrap: useBootstrap });
        if (!isCurrent()) return;

        online = true;
        attemptRef.current = 0;
        setBackendAttempt(0);
        setBackendOnline(true);
        setBackendError(null);
      } catch (err) {
        if (!isCurrent()) return;
        setBackendOnline(false);
        const crashHint = await peekBackendError();
        if (!isCurrent()) return;
        setBackendError(
          crashHint
            ? formatBackendCrash(crashHint)
            : formatBackendError(err, attemptRef.current),
        );
        setOllamaStatus(null);
        setPhase("backend-offline");
        return;
      }

      try {
        const status = normalizeOllamaStatus(await fetchOllamaStatus());
        if (!isCurrent()) return;
        setOllamaStatus(status);
        setPhase(resolvePhase(online, status));
        setBackendError(null);
      } catch (err) {
        if (!isCurrent()) return;
        const message = err instanceof Error ? err.message : "Failed to check Ollama";
        // Keep the gate up — never treat a failed Ollama check as "ready".
        setOllamaStatus(null);
        setBackendError(message === "Failed to fetch" ? null : formatUserFacingError(message));
        setPhase(online ? "checking" : "backend-offline");
      }
    } finally {
      if (isCurrent()) {
        setChecking(false);
        checkInFlightRef.current = false;
      }
    }
  }, []);

  useEffect(() => {
    void runCheck({ bootstrap: true });
  }, [runCheck]);

  useEffect(() => {
    if (phase === "ready") return;

    const interval =
      phase === "backend-offline" ||
      phase === "start-ollama" ||
      phase === "download-models"
        ? BACKEND_POLL_MS
        : POLL_MS;

    const timer = window.setInterval(() => {
      void runCheck({ silent: true, bootstrap: false });
    }, interval);

    return () => window.clearInterval(timer);
  }, [phase, runCheck]);

  useEffect(() => {
    let debounceTimer: number | undefined;

    const scheduleResumeCheck = () => {
      if (document.visibilityState !== "visible") return;
      if (phaseRef.current === "ready") return;

      window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        void runCheck({ silent: true, bootstrap: false });
      }, RESUME_DEBOUNCE_MS);
    };

    document.addEventListener("visibilitychange", scheduleResumeCheck);
    window.addEventListener("focus", scheduleResumeCheck);

    return () => {
      window.clearTimeout(debounceTimer);
      document.removeEventListener("visibilitychange", scheduleResumeCheck);
      window.removeEventListener("focus", scheduleResumeCheck);
    };
  }, [runCheck]);

  return {
    phase,
    checking,
    backendOnline,
    ollamaStatus,
    backendError,
    backendAttempt,
    startedAt,
    recheck: () => {
      resetApiBaseUrl();
      void runCheck({ force: true, bootstrap: true });
    },
  };
}
