import { useCallback } from "react";
import { fetchCollections, streamIngest, streamIngestDrop, type IngestProgress } from "../lib/api";
import type { DroppedFile } from "../lib/browser-folder-drop";
import { saveCollectionFolderPath } from "../lib/folders";
import { formatUserFacingError } from "../lib/user-errors";
import { toast } from "../store/useToastStore";
import { useAppStore, type CollectionInfo } from "../store/useAppStore";

let activeIngestController: AbortController | null = null;

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

async function handleIngestCancelled(
  chunksAdded: number,
  resetIngestionState: () => void,
  setCollections: (collections: CollectionInfo[]) => void,
): Promise<void> {
  if (chunksAdded > 0) {
    try {
      const collections = await fetchCollections();
      setCollections(collections);
    } catch {
      // Keep partial results even if refresh fails.
    }
    toast(
      `Indexing cancelled. ${chunksAdded} chunk${chunksAdded === 1 ? "" : "s"} were kept.`,
      "info",
    );
  } else {
    toast("Indexing cancelled", "info");
  }
  resetIngestionState();
}

/** Stops the in-flight indexing stream (if any). */
export function cancelIngest(): void {
  activeIngestController?.abort();
}

function summarizeIndexingFailure(
  chunksAdded: number,
  totalFiles: number,
  fileErrors: number,
  lastError: string | null,
): string {
  if (lastError) return formatUserFacingError(lastError);
  if (totalFiles === 0) return "No supported files were found in that folder.";
  if (chunksAdded === 0 && fileErrors > 0) {
    return "Indexing finished but no chunks were created. Check that Ollama is running and nomic-embed-text is installed.";
  }
  if (chunksAdded === 0) {
    return "Indexing finished but no text could be extracted from those files.";
  }
  return "Indexing failed. Try again after confirming Ollama is running.";
}

export function useIngest() {
  const setIngestionState = useAppStore((state) => state.setIngestionState);
  const resetIngestionState = useAppStore((state) => state.resetIngestionState);
  const setCollections = useAppStore((state) => state.setCollections);
  const setCollection = useAppStore((state) => state.setCollection);
  const setIngestionSummary = useAppStore((state) => state.setIngestionSummary);

  const runIngestStream = useCallback(
    async (
      collectionName: string,
      folderPath: string,
      stream: (
        onProgress: (progress: IngestProgress) => void,
        onError: (message: string) => void,
        signal: AbortSignal,
      ) => Promise<void>,
    ) => {
      resetIngestionState();
      setIngestionState({
        status: "running",
        progressPercent: 0,
        collectionName,
        filesSkipped: 0,
      });

      const controller = new AbortController();
      activeIngestController?.abort();
      activeIngestController = controller;
      let filesSkipped = 0;
      let filesProcessed = 0;
      let fileErrors = 0;
      let chunksAdded = 0;
      let totalFiles = 0;
      let lastError: string | null = null;
      let streamFailed = false;

      const handleProgress = (progress: IngestProgress) => {
        totalFiles = progress.total;
        const percent =
          progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

        if (progress.status === "skipped" || progress.status === "empty") {
          filesSkipped += 1;
        }
        if (progress.status === "processed") {
          filesProcessed += 1;
        }
        if (progress.status === "error") {
          fileErrors += 1;
          lastError = progress.error ?? lastError;
        }
        chunksAdded = progress.chunks_added;

        const isTerminal =
          progress.status === "completed" || progress.status === "error";

        let status: "running" | "completed" | "error" = "running";
        if (progress.status === "error" && progress.current === 0 && progress.total === 0) {
          status = "error";
          streamFailed = true;
        } else if (progress.status === "completed") {
          if (chunksAdded === 0 && progress.total > 0) {
            status = "error";
          } else if (fileErrors > 0 && chunksAdded === 0) {
            status = "error";
          } else {
            status = "completed";
          }
        } else if (isTerminal) {
          status = progress.status === "error" ? "error" : "running";
        }

        setIngestionState({
          currentFile: progress.file,
          current: progress.current,
          total: progress.total,
          chunksAdded: progress.chunks_added,
          filesSkipped,
          fileErrors,
          progressPercent: percent,
          status,
          error:
            status === "error"
              ? summarizeIndexingFailure(chunksAdded, progress.total, fileErrors, lastError)
              : null,
        });
      };

      try {
        await stream(
          handleProgress,
          (message) => {
            if (controller.signal.aborted) return;
            streamFailed = true;
            lastError = message;
            setIngestionState({
              status: "error",
              error: formatUserFacingError(message),
            });
            toast(formatUserFacingError(message), "error");
          },
          controller.signal,
        );

        if (controller.signal.aborted) {
          await handleIngestCancelled(chunksAdded, resetIngestionState, setCollections);
          return;
        }
        if (streamFailed) return;

        const failed = chunksAdded === 0 && totalFiles > 0;
        if (failed) {
          const message = summarizeIndexingFailure(chunksAdded, totalFiles, fileErrors, lastError);
          setIngestionState({ status: "error", error: message, chunksAdded, fileErrors });
          toast(message, "error");
          return;
        }

        const collections = await fetchCollections();
        setCollections(collections);
        const normalized = collections.find((item) => item.name.includes(collectionName.toLowerCase()));
        const activeName = normalized?.name ?? collectionName;
        if (normalized) {
          setCollection(normalized.name);
        }

        saveCollectionFolderPath(activeName, folderPath);

        setIngestionSummary({
          collectionName: activeName,
          filesProcessed,
          filesSkipped,
          chunksAdded,
        });

        const partialWarning =
          fileErrors > 0
            ? `Indexed ${chunksAdded} chunks; ${fileErrors} file${fileErrors === 1 ? "" : "s"} failed`
            : `Indexed ${chunksAdded} chunks from ${filesProcessed} file${filesProcessed === 1 ? "" : "s"}`;

        toast(partialWarning, fileErrors > 0 ? "info" : "success");
      } catch (error) {
        if (isAbortError(error) || controller.signal.aborted) {
          await handleIngestCancelled(chunksAdded, resetIngestionState, setCollections);
          return;
        }
        const message = formatUserFacingError(error);
        setIngestionState({ status: "error", error: message });
        toast(message, "error");
      } finally {
        if (activeIngestController === controller) {
          activeIngestController = null;
        }
      }
    },
    [resetIngestionState, setCollection, setCollections, setIngestionState, setIngestionSummary],
  );

  const ingestFolder = useCallback(
    async (folderPath: string, collectionName: string) => {
      await runIngestStream(collectionName, folderPath, (onProgress, onError, signal) =>
        streamIngest(folderPath, collectionName, onProgress, onError, signal),
      );
    },
    [runIngestStream],
  );

  const ingestDroppedFolder = useCallback(
    async (rootName: string, files: DroppedFile[], collectionName: string) => {
      const folderLabel = `${rootName} (${files.length} files)`;
      await runIngestStream(collectionName, folderLabel, (onProgress, onError, signal) =>
        streamIngestDrop(rootName, collectionName, files, onProgress, onError, signal),
      );
    },
    [runIngestStream],
  );

  return { ingestFolder, ingestDroppedFolder, cancelIngest };
}
