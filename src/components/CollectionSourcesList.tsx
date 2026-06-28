import { useState } from "react";
import {
  DocumentTextIcon,
  EyeIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import type { CollectionSourceInfo } from "../lib/api";
import { formatChunkCount, getFileTypeLabel } from "../lib/format";
import { Button } from "./ui/Button";
import { cn } from "../lib/utils";

interface CollectionSourcesListProps {
  sources: CollectionSourceInfo[];
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  onPreview: (sourcePath: string) => void;
  onDelete: (sourcePath: string) => Promise<void>;
  onRefresh?: () => void;
  className?: string;
}

export function CollectionSourcesList({
  sources,
  loading = false,
  error = null,
  emptyMessage = "No indexed files in this collection.",
  onPreview,
  onDelete,
  onRefresh,
  className,
}: CollectionSourcesListProps) {
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (path: string) => {
    if (pendingDelete !== path) {
      setPendingDelete(path);
      return;
    }

    setDeleting(path);
    try {
      await onDelete(path);
      setPendingDelete(null);
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className={cn("space-y-2", className)} aria-busy="true" aria-live="polite">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-16 animate-pulse rounded-lg border border-mist bg-paper-white"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("rounded-lg border border-mist bg-paper-white p-4", className)}>
        <p className="type-body-sm text-ember-orange">{error}</p>
        {onRefresh && (
          <Button variant="ghost" className="mt-3" onClick={onRefresh}>
            Try again
          </Button>
        )}
      </div>
    );
  }

  if (sources.length === 0) {
    return (
      <p className={cn("type-body-sm text-slate", className)}>{emptyMessage}</p>
    );
  }

  return (
    <ul className={cn("space-y-2", className)} aria-label="Indexed sources">
      {sources.map((source) => {
        const confirmDelete = pendingDelete === source.path;
        const isDeleting = deleting === source.path;
        const fileType = getFileTypeLabel(source.path);

        return (
          <li
            key={source.path}
            className="group rounded-lg border border-mist bg-card-white transition-colors hover:border-fog"
          >
            <div className="flex items-start gap-3 p-3">
              <div
                className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg surface-accent-soft text-forest-teal"
                aria-hidden="true"
              >
                <DocumentTextIcon className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => onPreview(source.path)}
                  className="w-full text-left"
                >
                  <p className="truncate type-body-sm font-medium text-deep-ink group-hover:text-deep-indigo">
                    {source.file_name}
                  </p>
                  <p className="mt-0.5 type-caption text-helper">
                    {fileType} · {formatChunkCount(source.chunk_count)}
                  </p>
                  <p className="mt-1 truncate type-mono-xs text-helper" title={source.path}>
                    {source.path}
                  </p>
                </button>
              </div>

              <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                <button
                  type="button"
                  onClick={() => onPreview(source.path)}
                  className="app-control-icon inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-carbon hover:bg-paper-white"
                  aria-label={`Preview ${source.file_name}`}
                >
                  <EyeIcon className="h-5 w-5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(source.path)}
                  disabled={isDeleting}
                  className={cn(
                    "inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg transition-colors",
                    confirmDelete
                      ? "bg-ember-orange/10 text-ember-orange hover:bg-ember-orange/15"
                      : "text-carbon hover:bg-paper-white",
                  )}
                  aria-label={
                    confirmDelete ? `Confirm remove ${source.file_name}` : `Remove ${source.file_name}`
                  }
                >
                  <TrashIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>

            {confirmDelete && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-mist bg-paper-white px-3 py-2">
                <p className="type-caption text-helper">Remove from index? Chat answers will no longer use this file.</p>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    className="h-9 min-h-9 px-3"
                    onClick={() => setPendingDelete(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    className="h-9 min-h-9 px-3"
                    loading={isDeleting}
                    onClick={() => void handleDelete(source.path)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
