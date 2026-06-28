/**
 * Normalizes LLM markdown so GFM tables and common formatting render reliably.
 */
export function normalizeChatMarkdown(input: string): string {
  if (!input?.trim()) return input;

  let text = input.replace(/\r\n/g, "\n");

  // Models often emit "||" at row starts.
  text = text.replace(/\|\|/g, "|");

  text = text
    .split("\n")
    .map((line) => expandCollapsedTableLine(line))
    .join("\n");

  // Tables inlined after a sentence on the same line.
  text = text.replace(/([.:!?])\s+(\|)/g, "$1\n\n$2");

  // Ensure a blank line before tables so block parsers recognize them.
  text = text.replace(
    /([^\n])\n(\|[^\n]+\|[^\n]*\n\|[\s:|-]+\|)/g,
    "$1\n\n$2",
  );

  return text;
}

/**
 * Prepares in-progress streamed markdown so GFM can render partial tables
 * (bold headers, bordered cells) while tokens are still arriving.
 */
export function prepareStreamingMarkdown(input: string): string {
  if (!input?.trim()) return input;

  let text = normalizeChatMarkdown(input);
  const lines = text.split("\n");
  const block = findTrailingTableBlock(lines);
  if (!block) return text;

  const { start, end } = block;
  const tableLines = lines
    .slice(start, end + 1)
    .map((line) => line.trim())
    .filter(Boolean);

  if (tableLines.length === 0) return text;

  const headerCols = countTableColumns(tableLines[0]!);
  if (headerCols < 2) return text;

  const result = [...lines];
  const hasSeparator = tableLines.slice(1).some((line) => isTableSeparatorRow(line));

  if (!hasSeparator) {
    result.splice(start + 1, 0, buildTableSeparator(headerCols));
  }

  let lastIdx = result.length - 1;
  while (lastIdx >= 0 && !result[lastIdx]?.trim()) lastIdx -= 1;
  if (lastIdx < start) return result.join("\n");

  let lastLine = result[lastIdx]!.trim();
  if (!lastLine.startsWith("|")) return result.join("\n");

  if (!lastLine.endsWith("|")) {
    lastLine = `${lastLine} |`;
  }

  const lastCols = countTableColumns(lastLine);
  if (lastCols < headerCols) {
    lastLine = padTableRow(lastLine, headerCols);
  }

  result[lastIdx] = lastLine;
  return result.join("\n");
}

function findTrailingTableBlock(lines: string[]): { start: number; end: number } | null {
  let end = lines.length - 1;
  while (end >= 0 && !lines[end]?.trim()) end -= 1;
  if (end < 0) return null;

  if (!lines[end]?.trim().startsWith("|")) return null;

  let start = end;
  while (start > 0) {
    const prevLine = lines[start - 1]?.trim();
    if (!prevLine) break;
    if (!prevLine.startsWith("|")) break;
    start -= 1;
  }

  return { start, end };
}

function countTableColumns(line: string): number {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|")) return 0;
  return Math.max(0, trimmed.split("|").length - 2);
}

function isTableSeparatorRow(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return false;

  const cells = trimmed
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim());

  return cells.length >= 1 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function buildTableSeparator(colCount: number): string {
  return `|${Array(colCount).fill(" --- ").join("|")}|`;
}

function padTableRow(line: string, colCount: number): string {
  let row = line.trim();
  if (!row.endsWith("|")) row = `${row} |`;

  let cols = countTableColumns(row);
  while (cols < colCount) {
    row = row.replace(/\|\s*$/, " | |");
    cols += 1;
  }

  return row;
}

function expandCollapsedTableLine(line: string): string {
  if (!line.includes("|") || !line.includes("-")) return line;

  const pipeCount = (line.match(/\|/g) ?? []).length;
  if (pipeCount < 6) return line;

  const hasSeparator = /\|[\s:|-]{3,}/.test(line);
  if (!hasSeparator) return line;

  // Rows jammed on one line: "| A | B | | --- |" -> split at "| |" boundaries.
  return line.replace(/\|\s+\|/g, "|\n|");
}
