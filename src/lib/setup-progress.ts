import type { ProgressiveFluxPhase } from "@/components/ui/progressive-flux-loader";
import type { SetupPhase } from "@/hooks/useSetupGate";
import type { PrerequisiteItem } from "@/lib/setup-prerequisites";
import { prerequisitesMet } from "@/lib/setup-prerequisites";

/** Flux labels aligned to verification steps (one threshold per step). */
export function buildStepFluxPhases(items: PrerequisiteItem[]): ProgressiveFluxPhase[] {
  if (items.length === 0) {
    return [
      { at: 0, label: "starting setup" },
      { at: 100, label: "complete" },
    ];
  }

  const phases: ProgressiveFluxPhase[] = [{ at: 0, label: "starting setup" }];

  items.forEach((item, index) => {
    const at = Math.round(((index + 1) / items.length) * 100);
    phases.push({
      at: Math.max(1, at - Math.round(100 / items.length / 2)),
      label:
        item.status === "ready"
          ? `${item.label} verified`
          : `checking ${item.label.toLowerCase()}`,
    });
  });

  phases.push({ at: 100, label: "all set" });
  return phases;
}

/** Index of the step currently being verified (or next up). */
export function getActiveVerificationStepIndex(
  items: PrerequisiteItem[],
  checking: boolean,
): number {
  const working = items.findIndex((item) => item.status === "working");
  if (working >= 0) return working;

  const pending = items.findIndex(
    (item) => item.status === "waiting" || item.status === "missing",
  );
  if (pending >= 0) return pending;

  if (checking) {
    const notReady = items.findIndex((item) => item.status !== "ready");
    if (notReady >= 0) return notReady;
  }

  return Math.max(0, items.length - 1);
}

export function verificationStepLabel(
  item: PrerequisiteItem,
  stepIndex: number,
  activeIndex: number,
  checking: boolean,
): string {
  if (item.status === "ready") return "Verified";
  if (item.status === "working") return "Verifying now…";
  if (item.status === "missing") return "Action needed";
  if (stepIndex === activeIndex && checking) return "Verifying now…";
  if (stepIndex < activeIndex) return "Verified";
  return "Up next";
}

/**
 * Progress is strictly tied to verified steps: 2 of 4 verified = 50%.
 * Active downloads/checks add half a step of partial credit.
 */
export function computeSetupProgress(input: {
  items: PrerequisiteItem[];
  checking: boolean;
  pulling: boolean;
  backendAttempt: number;
  backendOnline: boolean;
}): number {
  const { items, checking, pulling, backendAttempt, backendOnline } = input;

  if (prerequisitesMet(items)) {
    return 100;
  }

  const total = items.length || 1;
  const readyCount = items.filter((item) => item.status === "ready").length;
  const workingCount = items.filter((item) => item.status === "working").length;

  let progress = (readyCount / total) * 100;

  if (workingCount > 0 || pulling) {
    progress += (0.5 / total) * 100;
  } else if (checking) {
    const activeIndex = getActiveVerificationStepIndex(items, checking);
    const active = items[activeIndex];
    if (active && (active.status === "waiting" || active.status === "working")) {
      progress += (0.35 / total) * 100;
    }
  }

  if (!backendOnline && readyCount === 0) {
    const warmup = Math.min(12, Math.max(1, backendAttempt) * 0.9);
    progress = Math.max(progress, warmup);
  }

  return Math.round(Math.min(99, Math.max(0, progress)));
}

export function setupProgressDetail(
  phase: SetupPhase,
  progress: number,
  items: PrerequisiteItem[],
  activeIndex: number,
  checking: boolean,
): string {
  if (progress >= 100) return "Everything is ready — opening your workspace.";

  const readyCount = items.filter((item) => item.status === "ready").length;
  const active = items[activeIndex];

  if (active?.status === "working" || pullingCaption(checking, active)) {
    return `Step ${activeIndex + 1} of ${items.length}: checking ${active.label.toLowerCase()}…`;
  }

  if (phase === "backend-offline") {
    return `Step 1 of ${items.length}: starting local app service…`;
  }
  if (phase === "install-ollama") {
    return "Install Ollama to run AI models on your machine.";
  }
  if (phase === "start-ollama") {
    return "Start Ollama, then we'll verify automatically.";
  }
  if (phase === "download-models") {
    const missing = items.filter((item) => item.status === "missing").length;
    if (missing > 0) {
      return `${readyCount} of ${items.length} verified · ${missing} model${missing === 1 ? "" : "s"} left`;
    }
  }

  return `${readyCount} of ${items.length} verified · ${progress}% complete`;
}

function pullingCaption(
  checking: boolean,
  active: PrerequisiteItem | undefined,
): boolean {
  return Boolean(checking && active && active.status === "waiting");
}
