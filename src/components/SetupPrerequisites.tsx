import { motion, useReducedMotion } from "motion/react";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  CloudArrowDownIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

import type { PrerequisiteItem } from "@/lib/setup-prerequisites";
import {
  getActiveVerificationStepIndex,
  verificationStepLabel,
} from "@/lib/setup-progress";
import { missingPrerequisiteCount, prerequisitesMet } from "@/lib/setup-prerequisites";
import { Button } from "./ui/Button";
import { cn } from "@/lib/utils";

const STEP_CIRCLE = "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full";

interface SetupPrerequisitesProps {
  items: PrerequisiteItem[];
  progressPercent?: number;
  checking?: boolean;
  onInstallOllama?: () => void;
  onStartOllama?: () => void;
  onDownloadModel?: (modelId: string) => void;
  onDownloadAllModels?: () => void;
  disableActions?: boolean;
  /** Hide bulk download CTA when the parent dialog already shows it. */
  hideBulkDownload?: boolean;
}

function StepIndicator({
  stepNumber,
  status,
  isActive,
}: {
  stepNumber: number;
  status: PrerequisiteItem["status"];
  isActive: boolean;
}) {
  const reduced = useReducedMotion();
  const spinning = status === "working" || (isActive && status !== "ready" && status !== "missing");

  if (status === "ready") {
    return (
      <span className={cn(STEP_CIRCLE, "bg-mint/20 ring-2 ring-mint/50")}>
        <CheckCircleIcon className="h-6 w-6 text-mint" strokeWidth={2} aria-hidden />
      </span>
    );
  }

  if (status === "missing") {
    return (
      <span className={cn(STEP_CIRCLE, "bg-ember-orange/12 ring-2 ring-ember-orange/40")}>
        <ExclamationTriangleIcon className="h-5 w-5 text-ember-orange" strokeWidth={2} aria-hidden />
      </span>
    );
  }

  if (spinning) {
    return (
      <span className={cn(STEP_CIRCLE, "bg-[#7ea7e9]/20 ring-2 ring-[#7ea7e9]/55")}>
        {!reduced && (
          <motion.span
            className="absolute inset-0 rounded-full bg-[#7ea7e9]/30"
            aria-hidden
            animate={{ scale: [1, 1.18, 1], opacity: [0.55, 0.15, 0.55] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        <ArrowPathIcon
          className="relative h-5 w-5 animate-spin text-[#111a4a] dark:text-[#7ea7e9]"
          strokeWidth={2}
          aria-hidden
        />
      </span>
    );
  }

  return (
    <span className={cn(STEP_CIRCLE, "border-2 border-mist bg-paper-white")}>
      <span className="type-body-sm font-semibold text-slate">{stepNumber}</span>
    </span>
  );
}

export function SetupPrerequisites({
  items,
  progressPercent,
  checking = false,
  onInstallOllama,
  onStartOllama,
  onDownloadModel,
  onDownloadAllModels,
  disableActions = false,
  hideBulkDownload = false,
}: SetupPrerequisitesProps) {
  const allReady = prerequisitesMet(items);
  const missingCount = missingPrerequisiteCount(items);
  const readyCount = items.filter((item) => item.status === "ready").length;
  const activeIndex = getActiveVerificationStepIndex(items, checking);
  const missingModels = items.filter(
    (item) => item.id.startsWith("model-") && item.status === "missing",
  );

  if (allReady) {
    return (
      <motion.div
        className="mb-2 overflow-hidden rounded-card border border-mint/35 bg-gradient-to-br from-mint/10 via-card-white to-pale-cyan-muted/40 px-5 py-4"
        role="status"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-mint/15">
            <SparklesIcon className="h-6 w-6 text-mint" strokeWidth={2} aria-hidden />
          </span>
          <div>
            <p className="type-body font-semibold text-deep-ink">All checks passed</p>
            <p className="mt-1 type-body-sm text-slate">Opening your private AI workspace…</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="mb-2 space-y-4">
      <div className="flex items-center justify-between gap-4 border-b border-mist/80 pb-3">
        <div>
          <p className="type-body-sm font-semibold text-deep-ink">Verification steps</p>
          <p className="mt-1 type-caption text-helper">
            Step {activeIndex + 1} of {items.length}
            {typeof progressPercent === "number" ? ` · ${readyCount} verified` : ""}
          </p>
        </div>
        {missingCount > 0 && (
          <span className="shrink-0 rounded-full border border-ember-orange/25 bg-ember-orange/8 px-3 py-1 type-caption font-medium text-ember-orange">
            {missingCount} need action
          </span>
        )}
      </div>

      <ol className="space-y-0" aria-label="Setup verification steps">
        {items.map((item, index) => {
          const isActive = index === activeIndex;
          const isLast = index === items.length - 1;
          const statusLabel = verificationStepLabel(item, index, activeIndex, checking);
          const lineFilled = item.status === "ready";

          return (
            <motion.li
              key={item.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.04, duration: 0.35 }}
              className="relative flex gap-4"
              aria-current={isActive ? "step" : undefined}
            >
              <div className="flex w-11 flex-col items-center">
                <StepIndicator
                  stepNumber={index + 1}
                  status={item.status}
                  isActive={isActive && (checking || item.status === "working")}
                />
                {!isLast && (
                  <span
                    className={cn(
                      "my-1.5 w-1 flex-1 min-h-[1.5rem] rounded-full transition-colors",
                      lineFilled ? "bg-mint/70" : "bg-mist",
                    )}
                    aria-hidden
                  />
                )}
              </div>

              <div
                className={cn(
                  "mb-4 min-w-0 flex-1 rounded-card border px-4 py-3.5 transition-colors",
                  item.status === "ready"
                    ? "border-mint/35 bg-mint/[0.07]"
                    : item.status === "missing"
                      ? "border-ember-orange/30 bg-ember-orange/[0.05]"
                      : isActive
                        ? "border-[#7ea7e9]/45 bg-[#e8f6f9]/55 dark:bg-[#111a4a]/28"
                        : "border-mist bg-paper-white/60",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <p className="type-body-sm font-semibold text-deep-ink">{item.label}</p>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 type-caption font-medium",
                          item.status === "ready"
                            ? "bg-mint/15 text-mint"
                            : item.status === "missing"
                              ? "bg-ember-orange/15 text-ember-orange"
                              : isActive && (checking || item.status === "working")
                                ? "bg-[#7ea7e9]/22 text-[#111a4a] dark:text-[#7ea7e9]"
                                : "bg-mist/70 text-slate",
                        )}
                      >
                        {statusLabel}
                      </span>
                    </div>
                    <p className="mt-1 type-body-sm leading-snug text-slate">{item.detail}</p>
                  </div>

                  {item.status === "missing" && item.actionLabel && !disableActions && (
                    <Button
                      variant="ghost"
                      className="h-11 min-h-11 shrink-0 px-4"
                      onClick={() => {
                        if (item.id === "ollama") onInstallOllama?.();
                        else if (item.id.startsWith("model-")) {
                          onDownloadModel?.(item.id.replace("model-", ""));
                        }
                      }}
                      icon={
                        item.id === "ollama" ? undefined : (
                          <CloudArrowDownIcon className="h-5 w-5 shrink-0" aria-hidden />
                        )
                      }
                    >
                      {item.actionLabel}
                    </Button>
                  )}
                  {item.id === "ollama" &&
                    item.status === "waiting" &&
                    onStartOllama &&
                    !disableActions && (
                      <Button variant="ghost" className="h-11 min-h-11 shrink-0 px-4" onClick={onStartOllama}>
                        Retry
                      </Button>
                    )}
                </div>
              </div>
            </motion.li>
          );
        })}
      </ol>

      {!hideBulkDownload && missingModels.length > 1 && onDownloadAllModels && !disableActions && (
        <Button
          variant="primary"
          fullWidth
          className="!bg-[#111a4a] hover:!bg-[#023247]"
          onClick={onDownloadAllModels}
          icon={<CloudArrowDownIcon className="h-5 w-5 shrink-0" aria-hidden />}
        >
          Download all {missingModels.length} models
        </Button>
      )}
    </div>
  );
}
