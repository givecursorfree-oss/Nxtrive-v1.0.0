import type { DroppedFolder } from "./browser-folder-drop";

export type FolderDropPayload =
  | { kind: "path"; path: string }
  | { kind: "upload"; folder: DroppedFolder };
