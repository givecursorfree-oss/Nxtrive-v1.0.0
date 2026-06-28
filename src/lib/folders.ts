const FOLDER_PATHS_KEY = "nxtrive_collection_folders";
const LEGACY_FOLDER_PATHS_KEY = "privatemind_collection_folders";

function migrateLegacyFolderPaths(): void {
  try {
    if (!localStorage.getItem(FOLDER_PATHS_KEY) && localStorage.getItem(LEGACY_FOLDER_PATHS_KEY)) {
      localStorage.setItem(FOLDER_PATHS_KEY, localStorage.getItem(LEGACY_FOLDER_PATHS_KEY)!);
      localStorage.removeItem(LEGACY_FOLDER_PATHS_KEY);
    }
  } catch {
    // ignore quota / private mode errors
  }
}

migrateLegacyFolderPaths();

export function deriveCollectionNameFromPath(path: string): string {
  const folderName = path.trim().split(/[\\/]/).pop() ?? "documents";
  return folderName.toLowerCase().replace(/\s+/g, "_");
}

/** Prefer active collection, then advanced name, then derive from upload root. */
export function resolveFileIngestCollection(
  currentCollection: string | null,
  advancedCollectionName: string,
  rootName: string,
): string {
  if (currentCollection) return currentCollection;
  const manual = advancedCollectionName.trim();
  if (manual) return manual;
  return deriveCollectionNameFromPath(rootName);
}

/** Resolve a dropped path to a folder suitable for ingestion. */
export function resolveFolderFromPaths(paths: string[]): string | null {
  if (paths.length === 0) return null;

  const first = paths[0].trim();
  if (!first) return null;

  const basename = first.split(/[/\\]/).pop() ?? "";
  const looksLikeFile = /\.[a-zA-Z0-9]{1,8}$/.test(basename) && !basename.startsWith(".");

  if (looksLikeFile) {
    const sep = first.includes("\\") ? "\\" : "/";
    const parts = first.split(/[/\\]/);
    parts.pop();
    return parts.length > 0 ? parts.join(sep) : null;
  }

  return first;
}

export function loadCollectionFolderPaths(): Record<string, string> {
  try {
    const raw = localStorage.getItem(FOLDER_PATHS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

export function saveCollectionFolderPath(collectionName: string, folderPath: string): void {
  const all = loadCollectionFolderPaths();
  all[collectionName] = folderPath;
  localStorage.setItem(FOLDER_PATHS_KEY, JSON.stringify(all));
}

export function getCollectionFolderPath(collectionName: string): string | null {
  return loadCollectionFolderPaths()[collectionName] ?? null;
}

export function removeCollectionFolderPath(collectionName: string): void {
  const all = loadCollectionFolderPaths();
  delete all[collectionName];
  localStorage.setItem(FOLDER_PATHS_KEY, JSON.stringify(all));
}
