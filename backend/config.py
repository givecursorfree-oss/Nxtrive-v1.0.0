"""Application configuration with cross-platform path handling."""

from __future__ import annotations

import logging
import os
import sys
from pathlib import Path

from platformdirs import user_data_dir

import socket

APP_NAME = "Nxtrive"
LEGACY_APP_NAME = "PrivateMind"

# Token-based chunk settings (approximate 1 token ≈ 4 characters)
CHUNK_SIZE = 512
CHUNK_OVERLAP = 64
CHARS_PER_TOKEN = 4
CHUNK_CHAR_SIZE = CHUNK_SIZE * CHARS_PER_TOKEN
CHUNK_CHAR_OVERLAP = CHUNK_OVERLAP * CHARS_PER_TOKEN

TOP_K = 5
EMBED_MODEL = "nomic-embed-text"
LLM_MODEL = "llama3"
COLLECTION_PREFIX = "nxtrive_"
LEGACY_COLLECTION_PREFIX = "privatemind_"

OLLAMA_HOST = "http://127.0.0.1:11434"
BACKEND_HOST = "127.0.0.1"
DEFAULT_BACKEND_PORT = 8742

# Local-only origins for the Tauri webview and Vite dev server.
CORS_ORIGIN_REGEX = (
    r"^https?://(localhost|127\.0\.0\.1|tauri\.localhost)(:\d+)?$|^tauri://localhost$"
)
CORS_ALLOW_METHODS = ["GET", "POST", "DELETE", "OPTIONS"]
BACKEND_PORT_FILE = "backend.port"
BACKEND_PORT_ENV = "NXTRIVE_BACKEND_PORT"
LEGACY_BACKEND_PORT_ENV = "PRIVATEMIND_BACKEND_PORT"

SUPPORTED_TEXT_EXTENSIONS = {".txt", ".py", ".js", ".ts", ".tsx", ".md", ".csv", ".json", ".html", ".css"}
SUPPORTED_DOC_EXTENSIONS = {".pdf", ".docx"}
SUPPORTED_EXTENSIONS = SUPPORTED_TEXT_EXTENSIONS | SUPPORTED_DOC_EXTENSIONS

DATA_DIR_ENV = "NXTRIVE_DATA_DIR"
LEGACY_DATA_DIR_ENV = "PRIVATEMIND_DATA_DIR"


def find_available_port(host: str = BACKEND_HOST, start: int = DEFAULT_BACKEND_PORT, attempts: int = 50) -> int:
    """Pick the first available TCP port at or after `start`."""
    env_port = os.environ.get(BACKEND_PORT_ENV) or os.environ.get(LEGACY_BACKEND_PORT_ENV)
    if env_port and env_port.isdigit():
        start = int(env_port)

    for port in range(start, start + attempts):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            try:
                sock.bind((host, port))
                return port
            except OSError:
                continue

    raise RuntimeError(f"No available backend port found in range {start}-{start + attempts - 1}")


def write_backend_port(port: int) -> Path:
    """Persist the bound backend port for the desktop shell to discover."""
    port_file = get_data_dir() / BACKEND_PORT_FILE
    port_file.write_text(str(port), encoding="utf-8")
    return port_file


def read_backend_port() -> int | None:
    port_file = get_data_dir() / BACKEND_PORT_FILE
    if not port_file.exists():
        return None
    try:
        return int(port_file.read_text(encoding="utf-8").strip())
    except ValueError:
        return None


def resolve_backend_port() -> int:
    port = find_available_port()
    write_backend_port(port)
    return port


def get_data_dir() -> Path:
    """Resolve the platform-correct user data directory."""
    env_override = os.environ.get(DATA_DIR_ENV) or os.environ.get(LEGACY_DATA_DIR_ENV)
    if env_override:
        data_dir = Path(env_override)
    else:
        data_dir = Path(user_data_dir(APP_NAME))
        if not data_dir.exists():
            legacy_dir = Path(user_data_dir(LEGACY_APP_NAME))
            if legacy_dir.exists():
                data_dir = legacy_dir

    data_dir.mkdir(parents=True, exist_ok=True)
    return data_dir


CHROMA_PATH = get_data_dir() / "chroma_db"
SOURCE_LIBRARY_DIR = get_data_dir() / "source_library"
LOG_PATH = get_data_dir() / "logs" / "nxtrive.log"


def ensure_directories() -> None:
    """Create required directories on startup."""
    CHROMA_PATH.mkdir(parents=True, exist_ok=True)
    SOURCE_LIBRARY_DIR.mkdir(parents=True, exist_ok=True)
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)


def is_windows() -> bool:
    return sys.platform == "win32"


def setup_logging() -> None:
    """Configure application logging."""
    ensure_directories()
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        handlers=[
            logging.FileHandler(LOG_PATH, encoding="utf-8"),
            logging.StreamHandler(),
        ],
    )
