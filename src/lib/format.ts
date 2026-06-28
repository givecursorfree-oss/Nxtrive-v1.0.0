/** Display-friendly collection name from internal id. */
export function formatCollectionName(name: string): string {
  const stripped = name.replace(/^(nxtrive_|privatemind_)/i, "");
  return stripped
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatChunkCount(count: number): string {
  if (count === 0) return "No chunks — re-index";
  return `${count} ${count === 1 ? "chunk" : "chunks"}`;
}

export function getFileExtension(path: string): string {
  const base = path.split(/[/\\]/).pop() ?? path;
  const dot = base.lastIndexOf(".");
  return dot >= 0 ? base.slice(dot + 1).toLowerCase() : "";
}

export function getFileTypeLabel(path: string): string {
  const ext = getFileExtension(path);
  const labels: Record<string, string> = {
    pdf: "PDF",
    docx: "Word",
    md: "Markdown",
    txt: "Text",
    py: "Python",
    js: "JavaScript",
    ts: "TypeScript",
    tsx: "React",
    json: "JSON",
    csv: "CSV",
    html: "HTML",
    css: "CSS",
  };
  return labels[ext] ?? (ext.toUpperCase() || "File");
}
