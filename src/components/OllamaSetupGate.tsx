import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  CloudArrowDownIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

import { BrandLogoMark } from "@/components/BrandLogo";

import type { OllamaStatus } from "@/lib/api";
import { BRAND_NAME } from "@/lib/brand";
import { installOllamaForUser } from "@/lib/ollama-download";
import { isTauriApp } from "@/lib/tauri";
import { getOllamaInstallGuide } from "@/lib/ollama-install";
import { getCachedBackendPort } from "@/lib/api-base";
import { buildPrerequisites } from "@/lib/setup-prerequisites";
import {
  buildStepFluxPhases,
  computeSetupProgress,
  formatElapsed,
  getActiveVerificationStepIndex,
  setupProgressDetail,
} from "@/lib/setup-progress";
import type { SetupPhase } from "@/hooks/useSetupGate";
import { useSmoothSetupProgress } from "@/hooks/useSmoothSetupProgress";
import { ProgressiveFluxLoader } from "@/components/ui/progressive-flux-loader";
import { SetupPrerequisites } from "./SetupPrerequisites";
import { Button } from "./ui/Button";

const ENTER_EASE = [0.16, 1, 0.3, 1] as const;
const ENTER_DURATION = 0.9;

interface OllamaSetupGateProps {
  phase: SetupPhase;
  checking: boolean;
  backendOnline: boolean;
  ollamaStatus: OllamaStatus | null;
  backendError: string | null;
  backendAttempt: number;
  startedAt?: number;
  onRecheck: () => void;
  installNotice: string | null;
  pulling: boolean;
  pullingModel: string | null;
  pullLog: string | null;
  pullError: string | null;
  onRunModelDownload: (models: string[]) => Promise<void>;
  onClearPullError: () => void;
  onSetPullError: (message: string | null) => void;
  onSetInstallNotice: (message: string | null) => void;
}

export function OllamaSetupGate({
  phase,
  checking,
  backendOnline,
  ollamaStatus,
  backendError,
  backendAttempt,
  startedAt,
  onRecheck,
  installNotice,
  pulling,
  pullingModel,
  pullLog,
  pullError,
  onRunModelDownload,
  onClearPullError,
  onSetPullError,
  onSetInstallNotice,
}: OllamaSetupGateProps) {
  const reduceMotion = useReducedMotion();
  const backendInstallUrl = ollamaStatus?.install_url;
  const requiredModels = ollamaStatus?.required_models ?? [];
  const missingModels = ollamaStatus?.missing_models ?? [];
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (phase === "ready") return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [phase]);

  const elapsedSeconds = Math.max(
    0,
    Math.floor((now - (startedAt ?? now)) / 1000),
  );

  useEffect(() => {
    if (phase !== "install-ollama") return;
    void getOllamaInstallGuide(backendInstallUrl);
  }, [phase, backendInstallUrl]);

  const handleRetryOllamaInstall = async () => {
    onClearPullError();
    onSetInstallNotice("Opening Terminal to install Ollama…");

    try {
      const installed = await installOllamaForUser(
        backendInstallUrl,
        (message) => onSetInstallNotice(message),
      );

      if (installed) {
        onSetInstallNotice("Ollama installed — continuing setup…");
        onRecheck();
      } else {
        onSetPullError(
          "Ollama did not finish installing in time. Finish the installer, then click Check again.",
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not open Ollama install page";
      onSetPullError(message);
    }
  };

  const title =
    phase === "backend-offline"
      ? `Starting ${BRAND_NAME}`
      : phase === "install-ollama"
        ? `${BRAND_NAME} needs Ollama`
        : phase === "start-ollama"
          ? "Starting Ollama"
          : phase === "download-models"
            ? "Downloading AI models"
            : ollamaStatus?.ready
              ? "All set"
              : "Checking prerequisites";

  const backendPort = getCachedBackendPort();

  const prerequisiteItems = buildPrerequisites(backendOnline, ollamaStatus, {
    backendWorking:
      checking && (phase === "backend-offline" || phase === "checking"),
    modelsWorking: pulling,
    workingModel: pullingModel,
  });

  const setupProgressTarget = computeSetupProgress({
    items: prerequisiteItems,
    checking,
    pulling,
    backendAttempt,
    backendOnline,
  });

  const activeStepIndex = getActiveVerificationStepIndex(prerequisiteItems, checking);
  const fluxPhases = useMemo(
    () => buildStepFluxPhases(prerequisiteItems),
    [prerequisiteItems],
  );
  const progressIsActive =
    checking ||
    pulling ||
    prerequisiteItems.some((item) => item.status === "working");
  const setupProgress = useSmoothSetupProgress(setupProgressTarget, progressIsActive);
  const readyCount = prerequisiteItems.filter((item) => item.status === "ready").length;

  const progressCaption = setupProgressDetail(
    phase,
    setupProgress,
    prerequisiteItems,
    activeStepIndex,
    checking,
    elapsedSeconds,
  );

  const setupNearlyDone =
    !checking &&
    phase !== "ready" &&
    requiredModels.length > 0 &&
    missingModels.length === 0 &&
    ollamaStatus?.ready;

  const showFluxLoader = !setupNearlyDone && phase !== "ready";
  const showStartupRetry =
    phase === "backend-offline" && (elapsedSeconds >= 8 || Boolean(backendError));

  const description =
    phase === "backend-offline"
      ? elapsedSeconds < 8
        ? "Preparing your private workspace. First launch can take a moment while the local service starts."
        : `Still starting the local service${backendPort ? ` on port ${backendPort}` : ""}. This is normal on a cold start.`
      : phase === "install-ollama"
        ? isTauriApp()
          ? "We're opening Terminal and running the official Ollama installer for your system automatically."
          : "Open the Ollama download page and install it for your system — we'll detect it automatically."
        : phase === "start-ollama"
          ? "Ollama is installed. We're starting it for you…"
          : phase === "download-models"
            ? pulling
              ? "Terminal is downloading models. Closed it early? Click Run again below."
              : pullError
                ? "Download did not finish. Run again to reopen Terminal."
                : "We'll open Terminal automatically to download the required AI models."
            : ollamaStatus?.ready
              ? "Everything is ready."
              : "Checking what still needs to be installed…";

  return (
    <motion.div
      className="fixed inset-0 z-[320] flex items-center justify-center overflow-y-auto bg-black/55 p-4 backdrop-blur-sm"
      role="presentation"
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: ENTER_DURATION, ease: ENTER_EASE, delay: reduceMotion ? 0 : 0.15 }}
    >
      <motion.div
        className="my-auto w-full max-w-xl rounded-card border border-mist bg-card-white p-8 shadow-xl ring-1 ring-black/5 dark:border-fog/35 dark:bg-[#16161c] dark:ring-white/10"
        role="dialog"
        aria-modal="true"
        aria-labelledby="setup-gate-title"
        aria-describedby="setup-gate-desc"
        initial={
          reduceMotion ? false : { opacity: 0, y: 28, scale: 0.96, filter: "blur(10px)" }
        }
        animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: ENTER_DURATION, ease: ENTER_EASE, delay: reduceMotion ? 0 : 0.28 }}
      >
        <div className="mb-6 flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-card bg-paper-white p-1.5 shadow-subtle-3">
            <BrandLogoMark className="h-9 w-9" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <h1 id="setup-gate-title" className="type-subheading font-semibold text-deep-ink">
                {title}
              </h1>
              {(phase === "backend-offline" || phase === "checking") && (
                <span
                  className="shrink-0 rounded-full bg-paper-white px-2.5 py-1 type-caption font-medium tabular-nums text-slate ring-1 ring-mist"
                  aria-label={`Elapsed ${formatElapsed(elapsedSeconds)}`}
                >
                  {formatElapsed(elapsedSeconds)}
                </span>
              )}
            </div>
            <p id="setup-gate-desc" className="mt-1 type-body-sm text-slate">
              {description}
            </p>
          </div>
        </div>

        {showFluxLoader && (
          <div
            className="mb-6 rounded-card border border-mist/80 bg-paper-white/50 px-4 py-4 dark:bg-[#1a1b22]/60"
            aria-live="polite"
            style={
              {
                "--flux-from": "#111a4a",
                "--flux-to": "#7ea7e9",
              } as CSSProperties
            }
          >
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <p className="type-body-sm font-semibold text-deep-ink">Setup progress</p>
              <p className="type-body-sm font-semibold tabular-nums text-deep-indigo">
                {setupProgress}%
              </p>
            </div>
            <ProgressiveFluxLoader
              value={setupProgress}
              phases={fluxPhases}
              showLabel
              size="compact"
              className="max-w-none gap-3"
              textClassName="normal-case text-slate type-body-sm font-medium"
            />
            <p className="mt-3 text-center type-body-sm text-slate">{progressCaption}</p>
            <p className="mt-1 text-center type-caption text-helper">
              {readyCount} of {prerequisiteItems.length} steps verified
            </p>
          </div>
        )}

        {prerequisiteItems.length > 0 && (
          <SetupPrerequisites
            items={prerequisiteItems}
            progressPercent={setupProgress}
            checking={checking || pulling}
            disableActions={pulling || checking}
            hideBulkDownload
            onInstallOllama={() => void handleRetryOllamaInstall()}
            onStartOllama={onRecheck}
            onDownloadModel={(model) => void onRunModelDownload([model])}
            onDownloadAllModels={() => void onRunModelDownload(missingModels)}
          />
        )}

        {phase === "install-ollama" && (
          <div className="mb-6 rounded-button border border-mist bg-paper-white p-4 type-body-sm text-slate">
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                {isTauriApp()
                  ? "Terminal opens with the official install command for your OS (PowerShell on Windows, curl on Mac/Linux)."
                  : "Download and install Ollama from the official site."}
              </li>
              <li>Follow any prompts in the Terminal or installer window.</li>
              <li>Come back here — {BRAND_NAME} will continue automatically.</li>
            </ol>
          </div>
        )}

        {installNotice && (
          <div
            role="status"
            className="mb-6 flex items-start gap-2 rounded-button border border-deep-indigo/20 bg-pale-cyan-muted px-3 py-2 type-caption text-deep-ink"
          >
            <ArrowTopRightOnSquareIcon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <span>{installNotice}</span>
          </div>
        )}

        {(backendError || pullError) && !(phase === "backend-offline" && checking && !backendError) && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-2 rounded-button border border-ember-orange/40 bg-ember-orange/5 px-3 py-2 type-caption text-ember-orange"
          >
            <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <span>{pullError ?? backendError}</span>
          </div>
        )}

        {setupNearlyDone && (
          <div
            role="status"
            className="mb-6 flex items-start gap-2 rounded-button border border-mint/40 bg-mint/5 px-3 py-2 type-caption text-deep-ink"
          >
            <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-mint" aria-hidden />
            <span>All set. Opening {BRAND_NAME}…</span>
          </div>
        )}

        {pullLog && pulling && (
          <div
            className="mb-4 rounded-button border border-deep-indigo/20 bg-pale-cyan-muted px-3 py-2"
            role="status"
            aria-live="polite"
          >
            <p className="type-caption text-deep-ink">{pullLog}</p>
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          {showStartupRetry && (
            <Button
              variant="primary"
              loading={checking}
              onClick={onRecheck}
              icon={<ArrowPathIcon className="h-4 w-4 shrink-0" aria-hidden />}
            >
              Retry startup
            </Button>
          )}

          {phase === "install-ollama" && pullError && (
            <Button
              variant="primary"
              onClick={() => void handleRetryOllamaInstall()}
              icon={<CloudArrowDownIcon className="h-4 w-4 shrink-0" aria-hidden />}
            >
              Install in Terminal again
            </Button>
          )}

          {phase === "download-models" && missingModels.length > 0 && isTauriApp() && (
            <Button
              variant="primary"
              loading={pulling}
              onClick={() => void onRunModelDownload(missingModels)}
              icon={<CloudArrowDownIcon className="h-4 w-4 shrink-0" aria-hidden />}
            >
              {pulling ? "Run again in Terminal" : "Download in Terminal"}
            </Button>
          )}

          {(phase === "checking" ||
            phase === "start-ollama" ||
            (phase === "backend-offline" && checking && !showStartupRetry)) && (
            <p className="type-caption text-helper" role="status" aria-live="polite">
              {checking
                ? "Working automatically — you can leave this window open."
                : "Setup paused. Use Retry if this takes longer than a minute."}
            </p>
          )}

          {(phase === "install-ollama" || phase === "start-ollama" || phase === "download-models") &&
            !pullError && (
              <Button variant="ghost" loading={checking} onClick={onRecheck}>
                Check again
              </Button>
            )}
        </div>
      </motion.div>
    </motion.div>
  );
}
