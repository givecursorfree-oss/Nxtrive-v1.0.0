function basename(path: string): string {
  return path.split(/[/\\]/).pop()?.trim() ?? path.trim();
}

function normalizeSourceLabel(value: string): string {
  return value
    .trim()
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/**
 * Removes trailing "Sources" sections that the model often appends in markdown
 * when structured source paths are already rendered via Sources.Group.
 */
export function stripEmbeddedSourcesSection(
  content: string,
  knownSources: string[] = [],
): string {
  if (!content?.trim()) return content;

  let text = content.replace(/\r\n/g, "\n");
  const knownNames = new Set(
    knownSources.map((path) => normalizeSourceLabel(basename(path))),
  );

  const headingPatterns = [
    /\n#{1,3}\s*Sources\s*:?\s*\n[\s\S]*$/i,
    /\n\*\*Sources\*\*\s*:?\s*\n[\s\S]*$/i,
    /\nSources\s*:\s*\n[\s\S]*$/i,
  ];

  for (const pattern of headingPatterns) {
    text = text.replace(pattern, "");
  }

  if (knownNames.size > 0) {
    const lines = text.split("\n");
    const filtered = lines.filter((line) => {
      const bullet = line.match(/^\s*[-*]\s+(.+?)\s*$/);
      if (!bullet) return true;
      const label = normalizeSourceLabel(bullet[1]!);
      return !knownNames.has(label);
    });
    text = filtered.join("\n");
  }

  return text.replace(/\n{3,}/g, "\n\n").trimEnd();
}
