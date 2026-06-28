import { isSupportedUploadFile } from "./supported-extensions";

export interface DroppedFile {
  relativePath: string;
  file: File;
}

export interface DroppedFolder {
  rootName: string;
  files: DroppedFile[];
}

function readAllEntries(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  return new Promise((resolve, reject) => {
    const entries: FileSystemEntry[] = [];

    const readBatch = () => {
      reader.readEntries(
        (batch) => {
          if (!batch.length) {
            resolve(entries);
            return;
          }
          entries.push(...batch);
          readBatch();
        },
        reject,
      );
    };

    readBatch();
  });
}

async function entryToFiles(entry: FileSystemEntry, prefix: string): Promise<DroppedFile[]> {
  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) => {
      (entry as FileSystemFileEntry).file(resolve, reject);
    });
    if (!isSupportedUploadFile(file.name)) return [];
    return [{ relativePath: prefix || file.name, file }];
  }

  if (!entry.isDirectory) return [];

  const reader = (entry as FileSystemDirectoryEntry).createReader();
  const children = await readAllEntries(reader);
  const nested: DroppedFile[] = [];

  for (const child of children) {
    const childPath = prefix ? `${prefix}/${child.name}` : child.name;
    nested.push(...(await entryToFiles(child, childPath)));
  }

  return nested;
}

export async function readDroppedFolder(dataTransfer: DataTransfer): Promise<DroppedFolder | null> {
  const items = Array.from(dataTransfer.items ?? []);
  const collected: DroppedFile[] = [];
  let rootName = "dropped_documents";

  if (items.length > 0) {
    for (const item of items) {
      const entry = item.webkitGetAsEntry?.();
      if (!entry) continue;

      if (entry.isDirectory) {
        rootName = entry.name;
        collected.push(...(await entryToFiles(entry, "")));
      } else if (entry.isFile) {
        const files = await entryToFiles(entry, entry.name);
        collected.push(...files);
        if (files[0]) {
          rootName = deriveCollectionRootName(files[0].file.name);
        }
      }
    }
  }

  if (collected.length === 0) {
    const plainFiles = Array.from(dataTransfer.files ?? []).filter((file) =>
      isSupportedUploadFile(file.name),
    );
    if (!plainFiles.length) return null;

    for (const file of plainFiles) {
      const relativePath = file.webkitRelativePath || file.name;
      collected.push({ relativePath, file });
    }
    rootName = deriveCollectionRootName(plainFiles[0].name);
  }

  if (!collected.length) return null;

  return { rootName, files: collected };
}

function deriveCollectionRootName(fileName: string): string {
  const parts = fileName.split(/[/\\]/);
  if (parts.length > 1) {
    return parts[0] || "dropped_documents";
  }
  return fileName.replace(/\.[^.]+$/, "") || "dropped_documents";
}
