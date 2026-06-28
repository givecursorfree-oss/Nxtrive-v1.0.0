"""Custom recursive character text splitter — no LangChain dependency."""

from __future__ import annotations

from typing import List

from config import CHUNK_CHAR_OVERLAP, CHUNK_CHAR_SIZE


class RecursiveCharacterSplitter:
    """Split text using a prioritized list of separators."""

    def __init__(
        self,
        chunk_size: int = CHUNK_CHAR_SIZE,
        chunk_overlap: int = CHUNK_CHAR_OVERLAP,
        separators: List[str] | None = None,
    ) -> None:
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.separators = separators or ["\n\n", "\n", ". ", " ", ""]

    def split_text(self, text: str) -> List[str]:
        """Split text into chunks respecting size and overlap."""
        normalized = text.replace("\r\n", "\n").replace("\r", "\n")
        if not normalized.strip():
            return []

        chunks = self._split_recursive(normalized, self.separators)
        return self._merge_with_overlap(chunks)

    def split_text_with_metadata(self, text: str) -> List[dict[str, int | str]]:
        """Split text and attach chunk index metadata."""
        chunks = self.split_text(text)
        total = len(chunks)
        return [
            {"text": chunk, "chunk_index": index, "total_chunks": total}
            for index, chunk in enumerate(chunks)
        ]

    def _split_recursive(self, text: str, separators: List[str]) -> List[str]:
        if len(text) <= self.chunk_size:
            return [text] if text else []

        separator = separators[-1]
        next_separators = separators

        for index, candidate in enumerate(separators):
            if candidate == "":
                separator = ""
                next_separators = [""]
                break
            if candidate in text:
                separator = candidate
                next_separators = separators[index + 1 :]
                break

        if separator:
            parts = text.split(separator)
            chunks: List[str] = []
            current = ""
            for part in parts:
                piece = part + separator if part != parts[-1] else part
                candidate_text = current + piece
                if len(candidate_text) <= self.chunk_size:
                    current = candidate_text
                else:
                    if current:
                        chunks.append(current)
                    if len(piece) > self.chunk_size:
                        chunks.extend(self._split_recursive(piece, next_separators))
                        current = ""
                    else:
                        current = piece
            if current:
                chunks.append(current)
            return [chunk for chunk in chunks if chunk.strip()]
        return [text[i : i + self.chunk_size] for i in range(0, len(text), self.chunk_size)]

    def _merge_with_overlap(self, chunks: List[str]) -> List[str]:
        if not chunks:
            return []

        merged: List[str] = []
        index = 0
        while index < len(chunks):
            current = chunks[index]
            while len(current) < self.chunk_size and index + 1 < len(chunks):
                index += 1
                current += chunks[index]

            merged.append(current)

            if index >= len(chunks) - 1:
                break

            if self.chunk_overlap <= 0:
                index += 1
                continue

            overlap_text = current[-self.chunk_overlap :]
            index += 1
            if index < len(chunks):
                chunks[index] = overlap_text + chunks[index]

        return merged


def _run_tests() -> None:
    splitter = RecursiveCharacterSplitter(chunk_size=50, chunk_overlap=10)
    sample = "Paragraph one.\n\nParagraph two has more content.\nLine three here."
    chunks = splitter.split_text_with_metadata(sample)
    assert len(chunks) >= 1
    for chunk in chunks:
        assert "text" in chunk
        assert "chunk_index" in chunk
        assert "total_chunks" in chunk
        assert len(str(chunk["text"])) <= 50 or chunk["chunk_index"] == len(chunks) - 1

    empty = splitter.split_text_with_metadata("")
    assert empty == []

    windows_text = "Line one\r\nLine two\r\nLine three"
    windows_chunks = splitter.split_text(windows_text)
    assert any("Line one" in chunk for chunk in windows_chunks)

    print(f"All chunker tests passed ({len(chunks)} chunks).")


if __name__ == "__main__":
    _run_tests()
