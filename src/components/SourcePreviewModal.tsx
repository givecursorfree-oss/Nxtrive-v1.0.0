import { useEffect, useMemo, useState } from "react";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { fetchSourcePreview, type SourcePreview } from "../lib/api";
import { Button } from "./ui/Button";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";

interface SourcePreviewModalProps {
  open: boolean;
  collectionName: string;
  sourcePath: string | null;
  onClose: () => void;
}

interface SourcePreviewBodyProps {
  collectionName: string;
  sourcePath: string;
  onClose: () => void;
}

function SourcePreviewBody({ collectionName, sourcePath, onClose }: SourcePreviewBodyProps) {
  const [preview, setPreview] = useState<SourcePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pdfUrl = useMemo(() => {
    if (preview?.kind !== "pdf" || !preview.content_base64) return null;
    const binary = atob(preview.content_base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: "application/pdf" });
    return URL.createObjectURL(blob);
  }, [preview]);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  useEffect(() => {
    let cancelled = false;

    void fetchSourcePreview(collectionName, sourcePath)
      .then((data) => {
        if (!cancelled) setPreview(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Preview failed");
          setPreview(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [collectionName, sourcePath]);

  const fileName = preview?.file_name ?? sourcePath.split(/[/\\]/).pop() ?? "Source";

  return (
    <>
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-mist px-5 py-4">
        <div className="min-w-0 pr-10">
          <DialogTitle className="truncate type-subheading font-medium text-deep-ink">
            {fileName}
          </DialogTitle>
          {preview?.preview_note && (
            <p className="mt-0.5 type-caption text-helper">{preview.preview_note}</p>
          )}
        </div>
        <div className="absolute right-14 top-4 flex shrink-0 items-center gap-2">
          {pdfUrl && (
            <a
              href={pdfUrl}
              download={fileName}
              className="app-control-icon inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-carbon hover:bg-paper-white"
              aria-label={`Download ${fileName}`}
            >
              <ArrowDownTrayIcon className="h-5 w-5" aria-hidden="true" />
            </a>
          )}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto bg-paper-white">
        {loading && (
          <div className="flex h-64 items-center justify-center type-body-sm text-slate">
            Loading preview…
          </div>
        )}

        {!loading && error && (
          <div className="p-6">
            <p className="type-body-sm text-ember-orange" role="alert">
              {error}
            </p>
          </div>
        )}

        {!loading && !error && preview?.kind === "pdf" && pdfUrl && (
          <iframe
            title={fileName}
            src={pdfUrl}
            sandbox=""
            className="h-[min(70vh,40rem)] w-full border-0 bg-white"
          />
        )}

        {!loading && !error && preview?.kind === "text" && (
          <pre className="whitespace-pre-wrap break-words p-6 type-mono-xs leading-relaxed text-carbon">
            {preview.content || "No text content."}
          </pre>
        )}

        {!loading && !error && preview?.kind === "unavailable" && (
          <div className="p-6">
            <p className="type-body-sm text-slate">
              {preview.message ?? "Preview is not available for this file."}
            </p>
          </div>
        )}
      </div>

      <footer className="shrink-0 border-t border-mist px-5 py-3">
        <Button variant="ghost" type="button" onClick={onClose}>
          Close
        </Button>
      </footer>
    </>
  );
}

export function SourcePreviewModal({
  open,
  collectionName,
  sourcePath,
  onClose,
}: SourcePreviewModalProps) {
  const previewKey =
    open && sourcePath ? `${collectionName}::${sourcePath}` : null;

  return (
    <Dialog
      open={open && sourcePath !== null}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent
        className="flex max-h-[min(90vh,52rem)] w-full max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl"
        showCloseButton
      >
        {previewKey && sourcePath && (
          <SourcePreviewBody
            key={previewKey}
            collectionName={collectionName}
            sourcePath={sourcePath}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
