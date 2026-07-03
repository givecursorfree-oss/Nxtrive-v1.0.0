import { useCallback, useEffect, useRef, useState } from "react";
import { fetchHealth, fetchOllamaStatus, type OllamaStatus } from "../lib/api";
import {
  backendWarmupMs,
  bootstrapBackend,
  ensureBackendStarted,
  restartBackend,
  sleep,
} from "../lib/backend-lifecycle";
import { resetApiBaseUrl } from "../lib/api-base";
import { BRAND_NAME } from "../lib/brand";
import { isTauriApp } from "../lib/ollama-download";
import { formatUserFacingError } from "../lib/user-errors";

export type SetupPhase =
  | "checking"
  | "backend-offline"
  | "install-ollama"
  | "start-ollama"
  | "download-models"
  | "ready";

const POLL_MS = 5000;
const BACKEND_POLL_MS = 4000;
const RESUME_DEBOUNCE_MS = 400;
const RESTART_EVERY_ATTEMPTS = 12;

function resolvePhase(backendOnline: boolean, status: OllamaStatus | null): SetupPhase {
  if (!backendOnline) return "backend-offline";
  if (!status) return "checking";
  if (!status.installed) return "install-ollama";
  if (!status.running) return "start-ollama";
  if (!status.ready || status.missing_models.length > 0) return "download-models";
  return "ready";
}

function formatBackendError(err: unknown, attempt: number): string | null {
  if (attempt < 8) return null;

  const message = err instanceof Error ? err.message : `Cannot reach ${BRAND_NAME} service`;
  if (
    message === "Failed to fetch" ||
    message.includes("fetch") ||
    message.includes("still starting")
  ) {
    return "Starting the local service…";
  }
  return formatUserFacingError(message);
}

export function useSetupGate() {
  const [phase, setPhase] = useState<SetupPhase>("checking");
  const [backendOnline, setBackendOnline] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null);
  const [checking, setChecking] = useState(true);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [backendAttempt, setBackendAttempt] = useState(0);

  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const attemptRef = useRef(0);
  const bootstrappedRef = useRef(false);
  const checkInFlightRef = useRef(false);

  useEffect(() => {
    if (!isTauriApp() || bootstrappedRef.current) return;
    bootstrappedRef.current = true;
    bootstrapBackend();
  }, []);

  const runCheck = useCallback(async (options?: { silent?: boolean; bootstrap?: boolean }) => {
    if (checkInFlightRef.current) return;
    checkInFlightRef.current = true;

    if (!options?.silent) {
      setChecking(true);
    }

    let online = false;
    try {
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
          await restartBackend();
          await sleep(1500);
        } else if (isTauriApp() && attemptRef.current === 1) {
          await ensureBackendStarted();
        }

        await sleep(backendWarmupMs(attemptRef.current));
      } else {
        attemptRef.current = 1;
        setBackendAttempt(1);
        if (isTauriApp()) {
          await ensureBackendStarted();
          await sleep(backendWarmupMs(1));
        }
      }

      await fetchHealth({ bootstrap: options?.bootstrap ?? attemptRef.current <= 2 });
      online = true;
      attemptRef.current = 0;
      setBackendAttempt(0);
      setBackendOnline(true);
      setBackendError(null);
    } catch (err) {
      online = false;
      setBackendOnline(false);
      setBackendError(formatBackendError(err, attemptRef.current));
      setOllamaStatus(null);
      setPhase("backend-offline");
      setChecking(false);
      checkInFlightRef.current = false;
      return;
    }

    try {
      const status = await fetchOllamaStatus();
      setOllamaStatus(status);
      setPhase(resolvePhase(online, status));
      setBackendError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to check Ollama";
      setBackendError(message === "Failed to fetch" ? null : formatUserFacingError(message));
      setPhase("backend-offline");
    } finally {
      setChecking(false);
      checkInFlightRef.current = false;
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
      void runCheck({ silent: true });
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
        void runCheck({ silent: true });
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
    recheck: runCheck,
  };
}
