"""Map low-level backend errors to user-facing messages."""

from __future__ import annotations


def format_ollama_error(exc: Exception | str) -> str:
    message = str(exc).strip()
    if not message:
        return "Something went wrong. Try again in a moment."

    lower = message.lower()

    if "memory layout" in lower or "failed to allocate" in lower or "out of memory" in lower:
        return (
            "The embedding model could not load — often due to low memory or a missing model. "
            "Restart Ollama, then run: ollama pull nomic-embed-text"
        )

    if "connection refused" in lower or "failed to connect" in lower:
        return "Cannot reach Ollama. Make sure it is running."

    if "model" in lower and ("not found" in lower or "does not exist" in lower):
        return "A required model is missing. Run: ollama pull nomic-embed-text && ollama pull llama3"

    if "status code: 500" in lower:
        return format_ollama_error(message.split("(status code:")[0].strip())

    return message
