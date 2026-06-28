import { CheckCircleIcon } from "@heroicons/react/24/outline";
import { formatCollectionName } from "../lib/format";
import { useAppStore } from "../store/useAppStore";
import { Button } from "./ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

export function IngestionCompleteModal() {
  const summary = useAppStore((s) => s.ingestionSummary);
  const setSummary = useAppStore((s) => s.setIngestionSummary);

  return (
    <Dialog
      open={summary !== null}
      onOpenChange={(open) => {
        if (!open) setSummary(null);
      }}
    >
      <DialogContent showCloseButton={false} className="border-mint/30 sm:max-w-md">
        {summary && (
          <>
            <DialogHeader className="mb-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-mint/15 text-mint">
                  <CheckCircleIcon className="h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <DialogTitle>Indexing complete</DialogTitle>
                  <DialogDescription className="text-slate">
                    {formatCollectionName(summary.collectionName)}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <ul className="space-y-2 rounded-lg bg-paper-white p-4 type-body-sm text-slate">
              <li>
                <strong className="text-deep-ink">{summary.filesProcessed}</strong> files indexed
              </li>
              <li>
                <strong className="text-deep-ink">{summary.chunksAdded}</strong> chunks added
              </li>
              {summary.filesSkipped > 0 && (
                <li>
                  <strong className="text-deep-ink">{summary.filesSkipped}</strong> files skipped
                </li>
              )}
            </ul>

            <Button variant="primary" fullWidth onClick={() => setSummary(null)}>
              Start chatting
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
