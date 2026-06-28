import { useCallback, useEffect, useRef, useState } from "react";

import { readDroppedFolder } from "../lib/browser-folder-drop";

import type { FolderDropPayload } from "../lib/folder-drop-types";

import { resolveFolderFromPaths } from "../lib/folders";

import { isTauriApp } from "../lib/ollama-download";

import { toast } from "../store/useToastStore";



export function useFolderDrop(onDrop: (payload: FolderDropPayload) => void) {

  const [isDragging, setIsDragging] = useState(false);

  const onDropRef = useRef(onDrop);

  onDropRef.current = onDrop;



  const handlePathDrop = useCallback((folderPath: string) => {

    onDropRef.current({ kind: "path", path: folderPath });

  }, []);



  useEffect(() => {

    let unlisten: (() => void) | undefined;

    let cleanupBrowser: (() => void) | undefined;



    const setup = async () => {

      if (isTauriApp()) {

        try {

          const { getCurrentWindow } = await import("@tauri-apps/api/window");

          const win = getCurrentWindow();

          unlisten = await win.onDragDropEvent((event) => {

            if (event.payload.type === "over") {

              setIsDragging(true);

              return;

            }

            if (event.payload.type === "drop") {

              setIsDragging(false);

              const folder = resolveFolderFromPaths(event.payload.paths);

              if (folder) {

                handlePathDrop(folder);

              } else {

                toast("Drop a folder with documents, not a single unsupported file.", "error");

              }

              return;

            }

            setIsDragging(false);

          });

        } catch {

          toast("Folder drag-and-drop is unavailable in this window.", "error");

        }

        return;

      }



      const hasFiles = (event: DragEvent) =>

        Boolean(event.dataTransfer?.types.includes("Files"));



      const onDragOver = (event: DragEvent) => {

        if (!hasFiles(event)) return;

        event.preventDefault();

        if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";

        setIsDragging(true);

      };



      const onDragLeave = (event: DragEvent) => {

        if (!hasFiles(event)) return;

        const related = event.relatedTarget as Node | null;

        if (related && document.documentElement.contains(related)) return;

        setIsDragging(false);

      };



      const onDrop = async (event: DragEvent) => {

        if (!hasFiles(event)) return;

        event.preventDefault();

        event.stopPropagation();

        setIsDragging(false);



        const dataTransfer = event.dataTransfer;

        if (!dataTransfer) return;



        try {

          const folder = await readDroppedFolder(dataTransfer);

          if (!folder) {

            toast("No supported documents found in that drop.", "error");

            return;

          }

          onDropRef.current({ kind: "upload", folder });

        } catch {

          toast("Could not read dropped files. Try Choose folder instead.", "error");

        }

      };



      const onDragEnd = () => setIsDragging(false);



      document.addEventListener("dragover", onDragOver, true);

      document.addEventListener("dragleave", onDragLeave, true);

      document.addEventListener("drop", onDrop, true);

      document.addEventListener("dragend", onDragEnd, true);



      cleanupBrowser = () => {

        document.removeEventListener("dragover", onDragOver, true);

        document.removeEventListener("dragleave", onDragLeave, true);

        document.removeEventListener("drop", onDrop, true);

        document.removeEventListener("dragend", onDragEnd, true);

      };

    };



    void setup();



    return () => {

      unlisten?.();

      cleanupBrowser?.();

    };

  }, [handlePathDrop]);



  return { isDragging };

}


