import { useCallback } from "react";

import { useFolderDrop } from "@/hooks/useFolderDrop";
import { useIngest } from "@/hooks/useIngest";
import type { FolderDropPayload } from "@/lib/folder-drop-types";
import { requestFolderAccess } from "@/lib/folder-access";
import { deriveCollectionNameFromPath, resolveFileIngestCollection } from "@/lib/folders";
import { NXTRIVE_EXPAND_SIDEBAR, NXTRIVE_FOLDER_DROP } from "@/lib/app-events";
import { formatCollectionName } from "@/lib/format";
import { isTauriApp } from "@/lib/ollama-download";
import { useAppStore } from "@/store/useAppStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { toast } from "@/store/useToastStore";

export function useFolderDropActions() {
  const { ingestFolder, ingestDroppedFolder } = useIngest();
  const currentCollection = useAppStore((s) => s.currentCollection);
  const setSidebarCollapsed = useSettingsStore((s) => s.setSidebarCollapsed);

  const handleDrop = useCallback(
    async (payload: FolderDropPayload) => {
      if (payload.kind === "upload" || !isTauriApp()) {
        const folderName =
          payload.kind === "upload"
            ? payload.folder.rootName
            : payload.path.split(/[/\\]/).filter(Boolean).pop();
        const allowed = await requestFolderAccess(folderName);
        if (!allowed) return;
      }

      window.dispatchEvent(new CustomEvent(NXTRIVE_EXPAND_SIDEBAR));
      setSidebarCollapsed(false);

      if (payload.kind === "path") {
        const collectionName = deriveCollectionNameFromPath(payload.path);
        window.dispatchEvent(
          new CustomEvent(NXTRIVE_FOLDER_DROP, { detail: payload.path }),
        );
        toast(`Indexing ${collectionName.replace(/_/g, " ")}…`, "info");
        await ingestFolder(payload.path, collectionName);
        return;
      }

      const { rootName, files } = payload.folder;
      const collectionName = resolveFileIngestCollection(currentCollection, "", rootName);
      window.dispatchEvent(
        new CustomEvent(NXTRIVE_FOLDER_DROP, {
          detail: `${rootName} (${files.length} files)`,
        }),
      );
      const toastLabel = currentCollection
        ? `Adding ${files.length} file${files.length === 1 ? "" : "s"} to ${formatCollectionName(currentCollection)}…`
        : `Uploading ${files.length} file${files.length === 1 ? "" : "s"}…`;
      toast(toastLabel, "info");
      await ingestDroppedFolder(rootName, files, collectionName);
    },
    [currentCollection, ingestDroppedFolder, ingestFolder, setSidebarCollapsed],
  );

  const { isDragging } = useFolderDrop((payload) => {
    void handleDrop(payload);
  });

  return { isDragging };
}
