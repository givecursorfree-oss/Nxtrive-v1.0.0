"""Privacy helpers — keep user-identifying paths out of API responses and logs."""

from __future__ import annotations

import os
import re
from pathlib import Path

_WINDOWS_USER_PATH = re.compile(r"^[A-Za-z]:\\Users\\[^\\]+")
_UNIX_USER_PATH = re.compile(r"^/(?:Users|home)/[^/]+")


def redact_path(value: str | Path | None) -> str | None:
    """Replace the current user's home directory with a neutral placeholder."""
    if value is None:
        return None

    text = str(value).strip()
    if not text:
        return text

    home = Path.home()
    try:
        resolved = str(Path(text).expanduser().resolve())
    except OSError:
        resolved = text

    home_text = str(home)
    if resolved.startswith(home_text):
        suffix = resolved[len(home_text) :].lstrip("\\/")
        return f"~/{suffix}" if suffix else "~"

    if _WINDOWS_USER_PATH.match(resolved):
        return re.sub(r"^[A-Za-z]:\\Users\\[^\\]+", "~", resolved, count=1)

    if _UNIX_USER_PATH.match(resolved):
        return re.sub(r"^/(?:Users|home)/[^/]+", "~", resolved, count=1)

    return resolved


def sanitize_error_message(message: str | None) -> str | None:
    """Strip user home segments from error strings shown in the UI."""
    if not message:
        return message

    redacted = redact_path(message) or message
    username = os.environ.get("USERNAME") or os.environ.get("USER")
    if username and len(username) > 1:
        redacted = redacted.replace(username, "[user]")
    return redacted
