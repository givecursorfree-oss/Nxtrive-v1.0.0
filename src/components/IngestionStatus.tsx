import { ExclamationTriangleIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { cancelIngest } from "../hooks/useIngest";
import { useAppStore } from "../store/useAppStore";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";

export function IngestionStatus() {
  const ingestionState = useAppStore((state) => state.ingestionState);

  if (ingestionState.status === "idle") {
    return null;
  }

  const isError = ingestionState.status === "error";
  const isComplete =
    ingestionState.status === "completed" && ingestionState.chunksAdded > 0;
  const isRunning = ingestionState.status === "running";
  const hasPartialErrors =
    isComplete && (ingestionState.fileErrors ?? 0) > 0;

  const statusLabel = isError
    ? "Indexing failed"
    : isComplete
      ? hasPartialErrors
        ? "Indexed with warnings"
        : "Indexing complete"
      : "Indexing documents…";

  const statusTitleClass = isError
    ? "type-body-sm font-semibold text-ember-orange"
    : isComplete
      ? "type-body-sm font-semibold text-forest-teal"
      : "type-body-sm font-semibold text-deep-ink";

  return (
    <Card
      padding="sm"
      className={[
        "min-w-0",
        isError ? "border-ember-orange/40 bg-ember-orange/5" : "",
        isComplete ? "border-mint/40" : "",
        isRunning ? "border-deep-indigo/15" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      role="status"
      aria-live="polite"
      aria-busy={isRunning}
    >
      <div className="mb-3 flex min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {isComplete ? (
            <CheckCircleIcon className="h-5 w-5 shrink-0 text-mint" aria-hidden="true" />
          ) : isError ? (
            <ExclamationTriangleIcon className="h-5 w-5 shrink-0 text-ember-orange" aria-hidden="true" />
          ) : null}
          <span className={statusTitleClass}>{statusLabel}</span>
        </div>
        <span className="shrink-0 type-caption font-medium text-slate">{ingestionState.progressPercent}%</span>
      </div>

      <div
        className="mb-3 h-2 overflow-hidden rounded-full bg-mist"
        role="progressbar"
        aria-valuenow={ingestionState.progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Indexing progress"
      >
        <div
          className={[
            "h-full rounded-full transition-[width] duration-300 ease-out",
            isError ? "bg-ember-orange" : "bg-deep-indigo",
          ].join(" ")}
          style={{ width: `${ingestionState.progressPercent}%` }}
        />
      </div>

      {ingestionState.currentFile && (
        <p
          className="break-all type-caption text-helper line-clamp-2"
          title={ingestionState.currentFile}
        >
          {ingestionState.currentFile}
        </p>
      )}
      <p className="mt-2 type-caption text-helper">
        {ingestionState.current} of {ingestionState.total} files ·{" "}
        {ingestionState.chunksAdded > 0
          ? `${ingestionState.chunksAdded} chunks`
          : "no chunks yet"}
      </p>
      {ingestionState.filesSkipped > 0 && (
        <p className="mt-1 type-caption text-helper">{ingestionState.filesSkipped} files skipped</p>
      )}
      {hasPartialErrors && (
        <p className="mt-1 type-caption text-helper">
          {ingestionState.fileErrors} file{ingestionState.fileErrors === 1 ? "" : "s"} could not be indexed
        </p>
      )}

      {ingestionState.error && (
        <div className="mt-3 space-y-1" role="alert">
          <p className="flex items-start gap-2 type-caption text-ember-orange">
            <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <span>{ingestionState.error}</span>
          </p>
          <p className="text-helper">
            Confirm Ollama is running, then try: ollama pull nomic-embed-text
          </p>
        </div>
      )}

      {isRunning && (
        <Button
          variant="ghost"
          fullWidth
          className="mt-3"
          onClick={() => cancelIngest()}
          aria-label="Cancel indexing"
        >
          Cancel indexing
        </Button>
      )}
    </Card>
  );
}
