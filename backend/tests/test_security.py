"""Security tests for ingest path validation and upload limits."""

from __future__ import annotations

import tempfile
from pathlib import Path

import pytest
from fastapi import HTTPException

from security import (
    MAX_UPLOAD_FILE_BYTES,
    ensure_within_directory,
    validate_collection_name,
    validate_folder_path,
    validate_relative_upload_path,
    validate_root_name,
)


def test_rejects_path_traversal_relative_paths():
    with pytest.raises(HTTPException) as exc:
        validate_relative_upload_path("../../etc/passwd")
    assert exc.value.status_code == 400


def test_rejects_absolute_relative_paths():
    with pytest.raises(HTTPException) as exc:
        validate_relative_upload_path("/etc/passwd")
    assert exc.value.status_code == 400


def test_accepts_safe_relative_paths():
    assert validate_relative_upload_path("docs/report.pdf") == Path("docs/report.pdf")


def test_rejects_invalid_root_names():
    with pytest.raises(HTTPException):
        validate_root_name("../evil")
    with pytest.raises(HTTPException):
        validate_root_name("")


def test_accepts_valid_root_names():
    assert validate_root_name("My Documents") == "My Documents"


def test_rejects_invalid_collection_names():
    with pytest.raises(HTTPException):
        validate_collection_name("bad name!")
    with pytest.raises(HTTPException):
        validate_collection_name("")


def test_accepts_valid_collection_names():
    assert validate_collection_name("research_2024") == "research_2024"


def test_validate_folder_path_requires_directory():
    with tempfile.TemporaryDirectory() as tmp:
        folder = Path(tmp)
        resolved = validate_folder_path(str(folder))
        assert resolved.is_dir()


def test_validate_folder_path_rejects_missing():
    with pytest.raises(HTTPException) as exc:
        validate_folder_path("/nonexistent/nxtrive-test-folder-xyz")
    assert exc.value.status_code == 400


def test_ensure_within_directory_blocks_escape():
    with tempfile.TemporaryDirectory() as tmp:
        base = Path(tmp)
        outside = base.parent / "outside-nxtrive-test"
        outside.mkdir(exist_ok=True)
        with pytest.raises(HTTPException):
            ensure_within_directory(base, outside)


def test_upload_limits_are_sane():
    assert MAX_UPLOAD_FILE_BYTES >= 1 * 1024 * 1024
    assert MAX_UPLOAD_FILE_BYTES <= 100 * 1024 * 1024
