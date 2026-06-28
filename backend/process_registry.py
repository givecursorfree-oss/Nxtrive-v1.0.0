"""Track and terminate subprocesses owned by the Nxtrive backend."""

from __future__ import annotations

import logging
import subprocess
import threading
from typing import List

logger = logging.getLogger(__name__)

_lock = threading.Lock()
_tracked: List[subprocess.Popen[str]] = []


def track_subprocess(proc: subprocess.Popen[str]) -> subprocess.Popen[str]:
    """Register a child process for cleanup on backend shutdown."""
    with _lock:
        _tracked.append(proc)
    return proc


def release_subprocess(proc: subprocess.Popen[str]) -> None:
    """Stop tracking a child process that exited normally."""
    with _lock:
        if proc in _tracked:
            _tracked.remove(proc)


def terminate_tracked_processes() -> None:
    """Terminate every subprocess started by this backend instance."""
    with _lock:
        processes = list(_tracked)
        _tracked.clear()

    for proc in reversed(processes):
        if proc.poll() is not None:
            continue
        try:
            proc.terminate()
        except OSError as exc:
            logger.debug("Could not terminate pid %s: %s", proc.pid, exc)

    for proc in reversed(processes):
        if proc.poll() is not None:
            continue
        try:
            proc.wait(timeout=2)
        except subprocess.TimeoutExpired:
            try:
                proc.kill()
            except OSError as exc:
                logger.debug("Could not kill pid %s: %s", proc.pid, exc)
        except OSError as exc:
            logger.debug("Wait failed for pid %s: %s", proc.pid, exc)
