"""Input validation and upload limits for ingest endpoints."""

from __future__ import annotations

import re
from pathlib import Path

from fastapi import HTTPException

# --- Upload / ingest limits ---
MAX_UPLOAD_FILE_BYTES = 50 * 1024 * 1024  # 50 MB per file
MAX_UPLOAD_FILES_PER_DROP = 200
MAX_UPLOAD_TOTAL_BYTES = 500 * 1024 * 1024  # 500 MB per drop batch
MAX_INGEST_FILES_PER_FOLDER = 5_000
MAX_ROOT_NAME_LENGTH = 120
MAX_COLLECTION_NAME_LENGTH = 128
MAX_FOLDER_PATH_LENGTH = 4096

_COLLECTION_NAME_RE = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9_\-:.]{0,127}$")
_ROOT_NAME_RE = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9_\-. ]{0,119}$")
_ABSOLUTE_PATH_RE = re.compile(r"^([A-Za-z]:|/)")


def validate_collection_name(name: str) -> str:
    cleaned = name.strip()
    if not cleaned or len(cleaned) > MAX_COLLECTION_NAME_LENGTH:
        raise HTTPException(status_code=400, detail="Invalid collection name")
    if not _COLLECTION_NAME_RE.fullmatch(cleaned):
        raise HTTPException(status_code=400, detail="Collection name contains invalid characters")
    return cleaned


def validate_root_name(root_name: str) -> str:
    cleaned = root_name.strip()
    if not cleaned or len(cleaned) > MAX_ROOT_NAME_LENGTH:
        raise HTTPException(status_code=400, detail="Invalid upload root name")
    if not _ROOT_NAME_RE.fullmatch(cleaned):
        raise HTTPException(status_code=400, detail="Upload root name contains invalid characters")
    if "/" in cleaned or "\\" in cleaned or ".." in cleaned:
        raise HTTPException(status_code=400, detail="Upload root name must not contain path separators")
    return cleaned


def validate_relative_upload_path(relative_path: str) -> Path:
    if not relative_path or len(relative_path) > 512:
        raise HTTPException(status_code=400, detail="Invalid file path")

    normalized = relative_path.replace("\\", "/").strip()
    if _ABSOLUTE_PATH_RE.match(normalized):
        raise HTTPException(status_code=400, detail=f"Invalid path: {relative_path}")

    safe_path = Path(normalized)
    if safe_path.is_absolute() or ".." in safe_path.parts:
        raise HTTPException(status_code=400, detail=f"Invalid path: {relative_path}")

    if any(part in {"", ".", ".."} for part in safe_path.parts):
        raise HTTPException(status_code=400, detail=f"Invalid path: {relative_path}")

    return safe_path


def validate_folder_path(folder_path: str) -> Path:
    if not folder_path or len(folder_path) > MAX_FOLDER_PATH_LENGTH:
        raise HTTPException(status_code=400, detail="Invalid folder path")
    if "\x00" in folder_path:
        raise HTTPException(status_code=400, detail="Invalid folder path")

    root = Path(folder_path).expanduser()
    try:
        resolved = root.resolve(strict=False)
    except OSError as exc:
        raise HTTPException(status_code=400, detail="Invalid folder path") from exc

    if not resolved.exists() or not resolved.is_dir():
        raise HTTPException(status_code=400, detail=f"Folder not found: {folder_path}")

    return resolved


def ensure_within_directory(base: Path, target: Path) -> Path:
    """Ensure target is inside base using lexical checks (works before file exists)."""
    base_resolved = base.resolve()
    try:
        target.resolve().relative_to(base_resolved)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Path escapes upload directory") from exc
    except OSError as exc:
        # Target may not exist yet — fall back to lexical join check.
        try:
            target.relative_to(base_resolved)
        except ValueError as inner_exc:
            raise HTTPException(status_code=400, detail="Path escapes upload directory") from inner_exc
    return target
