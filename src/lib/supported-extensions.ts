/** Keep in sync with backend/config.py SUPPORTED_EXTENSIONS */
export const SUPPORTED_UPLOAD_EXTENSIONS = new Set([
  ".txt",
  ".py",
  ".js",
  ".ts",
  ".tsx",
  ".md",
  ".csv",
  ".json",
  ".html",
  ".css",
  ".pdf",
  ".docx",
]);

export function isSupportedUploadFile(name: string): boolean {
  const dot = name.lastIndexOf(".");
  if (dot < 0) return false;
  return SUPPORTED_UPLOAD_EXTENSIONS.has(name.slice(dot).toLowerCase());
}

export function getUploadAcceptAttribute(): string {
  return Array.from(SUPPORTED_UPLOAD_EXTENSIONS).join(",");
}
