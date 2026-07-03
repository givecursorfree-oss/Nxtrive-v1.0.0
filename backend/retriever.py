"""Query embedding, ChromaDB retrieval, and LLM streaming."""

from __future__ import annotations

import logging
from typing import Generator, List, Literal

import ollama

from config import CHROMA_PATH, COLLECTION_PREFIX, EMBED_MODEL, LLM_MODEL, TOP_K, create_chroma_client
from errors import format_ollama_error
from ingestor import DocumentIngestor

logger = logging.getLogger(__name__)

ResponseMode = Literal["default", "search", "think", "sources"]

FORMAT_RULES = """
Format your answer in clean, professional Markdown:
- Use **bold** for key terms, provider names, figures, and takeaways
- Use bullet or numbered lists when presenting multiple points
- Use short ## section headings when the answer has distinct parts
- For tabular data, use GitHub-flavored Markdown tables with one row per line:
  | Column A | Column B |
  | --- | --- |
  | Value 1 | Value 2 |
- Put a blank line before and after every table
- Keep paragraphs short and scannable
- Be direct and professional
"""

PROMPT_TEMPLATES: dict[ResponseMode, str] = {
    "default": """You are a helpful document assistant. Answer using ONLY the context below.
Summarize or extract whatever relevant information exists, even if brief.
Only say "I couldn't find that in the documents." when the context is empty or unrelated.

{format_rules}

CONTEXT:
{context}

QUESTION: {question}

ANSWER:""",
    "search": """You are a thorough research assistant. Search across ALL provided context chunks and synthesize a complete answer.
Cross-reference details from multiple sections when possible.
If information is partial, state what was found and what is missing.

{format_rules}

CONTEXT:
{context}

QUESTION: {question}

ANSWER:""",
    "think": """You are a careful analyst. Answer using ONLY the context below.
Work through the question step by step before concluding.

Structure your response exactly like this:
## Reasoning
Brief numbered steps showing how you reached the answer from the context.

## Answer
A clear, concise conclusion with **bold** highlights for the most important points.

{format_rules}

CONTEXT:
{context}

QUESTION: {question}

ANSWER:""",
    "sources": """You are a citation-focused assistant. Answer using ONLY the context below.
Cite evidence inline after claims using (Source: filename) when possible.
End with a ## Sources section listing every file you referenced.

{format_rules}

CONTEXT:
{context}

QUESTION: {question}

ANSWER:""",
}


class DocumentRetriever:
    """Retrieve relevant chunks and stream answers from the local LLM."""

    def __init__(self) -> None:
        self.client = create_chroma_client()
        self.ingestor = DocumentIngestor()

    def stream_answer(
        self,
        question: str,
        collection_name: str,
        top_k: int | None = None,
        response_mode: ResponseMode = "default",
    ) -> Generator[str, None, None]:
        """Stream answer tokens for a question against a collection."""
        k = top_k if top_k is not None else TOP_K
        full_name = self.ingestor._normalize_collection_name(collection_name)
        try:
            collection = self.client.get_collection(full_name)
        except Exception as exc:
            raise ValueError(f"Collection not found: {collection_name}") from exc

        if collection.count() == 0:
            yield "I couldn't find that in the documents."
            return

        if response_mode == "search":
            k = min(max(k, 8), collection.count())
        elif response_mode == "think":
            k = min(max(k, 6), collection.count())

        query_embedding = self._embed_question(question)
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=min(k, collection.count()),
            include=["documents", "metadatas", "distances"],
        )

        documents = results.get("documents", [[]])[0]
        if not documents:
            yield "I couldn't find that in the documents."
            return

        metadatas = results.get("metadatas", [[]])[0]
        context_parts: list[str] = []
        for doc, meta in zip(documents, metadatas):
            source = ""
            if meta and meta.get("source_file"):
                source = str(meta["source_file"]).split("/")[-1].split("\\")[-1]
            if source:
                context_parts.append(f"[{source}]\n{doc}")
            else:
                context_parts.append(doc)

        context = "\n---\n".join(context_parts)
        template = PROMPT_TEMPLATES.get(response_mode, PROMPT_TEMPLATES["default"])
        prompt = template.format(
            context=context,
            question=question,
            format_rules=FORMAT_RULES,
        )

        stream = ollama.chat(
            model=LLM_MODEL,
            messages=[{"role": "user", "content": prompt}],
            stream=True,
        )

        for chunk in stream:
            message = chunk.get("message", {})
            token = message.get("content", "")
            if token:
                yield token

    def get_sources_for_question(
        self,
        question: str,
        collection_name: str,
        top_k: int | None = None,
        response_mode: ResponseMode = "default",
    ) -> List[str]:
        """Return unique source files used for retrieval."""
        k = top_k if top_k is not None else TOP_K
        if response_mode == "search":
            k = max(k, 8)
        elif response_mode == "think":
            k = max(k, 6)

        full_name = self.ingestor._normalize_collection_name(collection_name)
        collection = self.client.get_collection(full_name)
        query_embedding = self._embed_question(question)
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=min(k, collection.count()),
            include=["metadatas"],
        )
        metadatas = results.get("metadatas", [[]])[0]
        sources = {
            str(metadata.get("source_file"))
            for metadata in metadatas
            if metadata and metadata.get("source_file")
        }
        return sorted(sources)

    def _embed_question(self, question: str) -> List[float]:
        try:
            response = ollama.embeddings(model=EMBED_MODEL, prompt=question)
        except Exception as exc:
            raise RuntimeError(format_ollama_error(exc)) from exc
        embedding = response.get("embedding")
        if not embedding:
            raise RuntimeError(f"Ollama returned no embedding for model {EMBED_MODEL}")
        return list(embedding)
