import type { DroppedFolder } from "./browser-folder-drop";
import { isTauriApp } from "./ollama-download";
import { isSupportedUploadFile } from "./supported-extensions";

export type FolderPickResult =
  | { kind: "path"; path: string }
  | { kind: "upload"; folder: DroppedFolder };

async function pickFolderTauri(): Promise<FolderPickResult | null> {
  const { open } = await import("@tauri-apps/plugin-dialog");
  const selected = await open({
    directory: true,
    multiple: false,
    title: "Select Document Folder",
  });
  if (!selected || typeof selected !== "string") return null;
  return { kind: "path", path: selected };
}

function pickFolderWithInput(): Promise<DroppedFolder | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.setAttribute("webkitdirectory", "");
    input.style.display = "none";

    const finish = (folder: DroppedFolder | null) => {
      input.remove();
      resolve(folder);
    };

    input.addEventListener("change", () => {
      const fileList = Array.from(input.files ?? []);
      if (!fileList.length) {
        finish(null);
        return;
      }

      const supported = fileList.filter((file) => isSupportedUploadFile(file.name));
      if (!supported.length) {
        finish(null);
        return;
      }

      const rootName =
        supported[0].webkitRelativePath.split("/")[0] ||
        supported[0].webkitRelativePath.split("\\")[0] ||
        "documents";

      finish({
        rootName,
        files: supported.map((file) => ({
          relativePath: file.webkitRelativePath || file.name,
          file,
        })),
      });
    });

    document.body.appendChild(input);
    input.click();
  });
}

async function pickFolderBrowser(): Promise<FolderPickResult | null> {
  const folder = await pickFolderWithInput();
  if (!folder) return null;
  return { kind: "upload", folder };
}

export async function pickFolder(): Promise<FolderPickResult | null> {
  if (isTauriApp()) {
    return pickFolderTauri();
  }
  return pickFolderBrowser();
}
