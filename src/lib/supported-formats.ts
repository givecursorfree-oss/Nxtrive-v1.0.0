import { SUPPORTED_UPLOAD_EXTENSIONS } from "./supported-extensions";

export interface SupportedFormatGroup {
  label: string;
  extensions: string[];
}

export const SUPPORTED_FORMAT_GROUPS: SupportedFormatGroup[] = [
  {
    label: "Documents",
    extensions: [".pdf", ".docx"],
  },
  {
    label: "Text & code",
    extensions: [".txt", ".md", ".csv", ".json", ".html", ".css"],
  },
  {
    label: "Source code",
    extensions: [".py", ".js", ".ts", ".tsx"],
  },
];

export function listSupportedExtensions(): string[] {
  return Array.from(SUPPORTED_UPLOAD_EXTENSIONS).sort();
}

export function formatSupportedFormatsSummary(): string {
  return listSupportedExtensions()
    .map((ext) => ext.slice(1).toUpperCase())
    .join(", ");
}
