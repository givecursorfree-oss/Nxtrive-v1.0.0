import type { DroppedFile } from "./browser-folder-drop";
import { isTauriApp } from "./ollama-download";
import {
  getUploadAcceptAttribute,
  isSupportedUploadFile,
  SUPPORTED_UPLOAD_EXTENSIONS,
} from "./supported-extensions";

export type PickFilesResult =
  | { status: "ok"; rootName: string; files: DroppedFile[] }
  | { status: "unsupported" }
  | { status: "cancelled" };

function deriveRootNameFromFileNames(names: string[]): string {
  if (names.length === 1) {
    const base = names[0];
    const dot = base.lastIndexOf(".");
    return dot > 0 ? base.slice(0, dot) : base;
  }
  return "documents";
}

function buildPickResult(files: DroppedFile[]): PickFilesResult {
  if (!files.length) return { status: "unsupported" };
  return {
    status: "ok",
    rootName: deriveRootNameFromFileNames(files.map((entry) => entry.file.name)),
    files,
  };
}

function dialogExtensions(): string[] {
  return Array.from(SUPPORTED_UPLOAD_EXTENSIONS).map((ext) => ext.slice(1));
}

async function pickFilesTauri(): Promise<PickFilesResult> {
  const { open } = await import("@tauri-apps/plugin-dialog");
  const selected = await open({
    multiple: true,
    title: "Select documents",
    filters: [{ name: "Supported documents", extensions: dialogExtensions() }],
  });

  if (!selected) return { status: "cancelled" };

  const paths = (Array.isArray(selected) ? selected : [selected]).filter(
    (path): path is string => typeof path === "string",
  );
  if (!paths.length) return { status: "cancelled" };

  const { readFile } = await import("@tauri-apps/plugin-fs");
  const files: DroppedFile[] = [];

  for (const path of paths) {
    const name = path.split(/[/\\]/).pop() ?? "file";
    if (!isSupportedUploadFile(name)) continue;

    const bytes = await readFile(path);
    const blob = new Blob([bytes]);
    files.push({
      relativePath: name,
      file: new File([blob], name),
    });
  }

  return buildPickResult(files);
}

function pickFilesWithInput(): Promise<PickFilesResult> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = getUploadAcceptAttribute();
    input.style.display = "none";

    const finish = (result: PickFilesResult) => {
      input.remove();
      resolve(result);
    };

    input.addEventListener("change", () => {
      const fileList = Array.from(input.files ?? []);
      if (!fileList.length) {
        finish({ status: "cancelled" });
        return;
      }

      const supported = fileList.filter((file) => isSupportedUploadFile(file.name));
      const files: DroppedFile[] = supported.map((file) => ({
        relativePath: file.name,
        file,
      }));

      finish(buildPickResult(files));
    });

    document.body.appendChild(input);
    input.click();
  });
}

export async function pickFiles(): Promise<PickFilesResult> {
  if (isTauriApp()) {
    return pickFilesTauri();
  }
  return pickFilesWithInput();
}
