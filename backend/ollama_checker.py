"""Cross-platform Ollama installation and health checks."""

from __future__ import annotations

import platform
import shutil
import subprocess
import threading
import time
from pathlib import Path
from typing import List, TypedDict

import httpx

from config import EMBED_MODEL, LLM_MODEL, OLLAMA_HOST
from process_registry import release_subprocess, track_subprocess

_cache_lock = threading.Lock()
_cached_status: "OllamaStatus | None" = None


class OllamaStatus(TypedDict):
    installed: bool
    running: bool
    models: List[str]
    required_models: List[str]
    missing_models: List[str]
    ready: bool
    install_url: str
    platform: str
    binary_path: str | None
    error: str | None


REQUIRED_MODELS = [LLM_MODEL, EMBED_MODEL]


def _install_url() -> str:
    system = platform.system()
    if system == "Windows":
        return "https://ollama.com/download/windows"
    if system == "Darwin":
        return "https://ollama.com/download/mac"
    return "https://ollama.com/download/linux"


def _candidate_paths() -> List[Path]:
    system = platform.system()
    candidates: List[Path] = []

    if system == "Windows":
        local_app_data = Path.home() / "AppData" / "Local" / "Programs" / "Ollama" / "ollama.exe"
        program_files = Path("C:/Program Files/Ollama/ollama.exe")
        candidates.extend([local_app_data, program_files])
        for letter in "CDEFGHIJKLMNOPQRSTUVWXYZ":
            drive_path = Path(f"{letter}:/Program Files/Ollama/ollama.exe")
            if drive_path.exists():
                candidates.append(drive_path)
    elif system == "Darwin":
        candidates.extend([Path("/usr/local/bin/ollama"), Path("/opt/homebrew/bin/ollama")])
    else:
        candidates.extend([Path("/usr/local/bin/ollama"), Path("/usr/bin/ollama")])

    which_path = shutil.which("ollama")
    if which_path:
        candidates.append(Path(which_path))

    # Deduplicate while preserving order
    seen: set[str] = set()
    unique: List[Path] = []
    for path in candidates:
        key = str(path)
        if key not in seen:
            seen.add(key)
            unique.append(path)
    return unique


def _binary_is_valid(path: Path) -> bool:
    """Confirm the path is a working Ollama executable, not a stale leftover."""
    if not path.is_file():
        return False
    try:
        proc = subprocess.run(
            [str(path), "--version"],
            capture_output=True,
            text=True,
            timeout=8.0,
        )
        return proc.returncode == 0
    except (OSError, subprocess.TimeoutExpired):
        return False


def find_ollama_binary() -> Path | None:
    """Locate the Ollama binary on the current platform."""
    for path in _candidate_paths():
        if _binary_is_valid(path):
            return path
    return None


def _platform_install_hint() -> str:
    system = platform.system()
    if system == "Windows":
        return "Install Ollama from https://ollama.com/download/windows and restart Nxtrive."
    if system == "Darwin":
        return "Install Ollama from https://ollama.com/download/mac or run: brew install ollama"
    return "Install Ollama with: curl -fsSL https://ollama.com/install.sh | sh"


def _fetch_models() -> tuple[bool, List[str], str | None]:
    try:
        response = httpx.get(f"{OLLAMA_HOST}/api/tags", timeout=5.0)
        response.raise_for_status()
        payload = response.json()
        models = [item.get("name", "").split(":")[0] for item in payload.get("models", [])]
        unique_models = sorted({name for name in models if name})
        return True, unique_models, None
    except httpx.HTTPError as exc:
        return False, [], f"Ollama API unreachable at {OLLAMA_HOST}: {exc}"


def _is_model_installed(model: str, installed: List[str]) -> bool:
    return any(name == model or name.startswith(f"{model}:") for name in installed)


def check_ollama() -> OllamaStatus:
    """Check whether Ollama is installed, running, and which models are available."""
    install_url = _install_url()
    system_name = platform.system()
    binary = find_ollama_binary()
    installed = binary is not None

    if not installed:
        return {
            "installed": False,
            "running": False,
            "models": [],
            "required_models": REQUIRED_MODELS,
            "missing_models": list(REQUIRED_MODELS),
            "ready": False,
            "install_url": install_url,
            "platform": system_name,
            "binary_path": None,
            "error": _platform_install_hint(),
        }

    running, models, api_error = _fetch_models()
    error = api_error

    if not running:
        try:
            serve_proc = track_subprocess(
                subprocess.Popen(
                    [str(binary), "serve"],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    start_new_session=True,
                )
            )
            for _ in range(20):
                time.sleep(0.5)
                running, models, api_error = _fetch_models()
                if running:
                    error = api_error
                    break
            else:
                running, models, api_error = _fetch_models()
                if api_error:
                    error = api_error
        except OSError as exc:
            error = f"Failed to start Ollama: {exc}"

    missing = (
        [model for model in REQUIRED_MODELS if not _is_model_installed(model, models)]
        if running
        else list(REQUIRED_MODELS)
    )
    ready = running and not missing

    if running and missing:
        error = (
            f"Missing models: {', '.join(missing)}. "
            f"Download them in Nxtrive or run: ollama pull {' && ollama pull '.join(missing)}"
        )

    return {
        "installed": installed,
        "running": running,
        "models": models,
        "required_models": REQUIRED_MODELS,
        "missing_models": missing,
        "ready": ready,
        "install_url": install_url,
        "platform": system_name,
        "binary_path": str(binary) if binary else None,
        "error": error,
    }


def refresh_ollama_cache() -> OllamaStatus:
    """Refresh the cached Ollama status used by lightweight health checks."""
    global _cached_status
    status = check_ollama()
    with _cache_lock:
        _cached_status = status
    return status


def get_cached_ollama_status() -> OllamaStatus | None:
    with _cache_lock:
        return _cached_status


def get_ollama_status() -> OllamaStatus:
    """Always check live so uninstalls and stopped services are detected immediately."""
    return refresh_ollama_cache()


def iter_pull_models(models: List[str]):
    """Stream progress while pulling one or more Ollama models."""
    binary = find_ollama_binary()
    if binary is None:
        yield {"status": "error", "error": "Ollama is not installed"}
        return

    for model in models:
        yield {"status": "pulling", "model": model, "message": f"Downloading {model}…"}
        try:
            proc = track_subprocess(
                subprocess.Popen(
                    [str(binary), "pull", model],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                )
            )
            if proc.stdout is None:
                release_subprocess(proc)
                yield {"status": "error", "model": model, "error": f"Failed to start pull for {model}"}
                return

            try:
                for line in proc.stdout:
                    stripped = line.strip()
                    if stripped:
                        yield {"status": "progress", "model": model, "message": stripped}
            finally:
                if proc.poll() is None:
                    proc.terminate()
                release_subprocess(proc)

            proc.wait()
            if proc.returncode != 0:
                yield {
                    "status": "error",
                    "model": model,
                    "error": f"Failed to download {model}",
                }
                return

            yield {"status": "pulled", "model": model}
        except OSError as exc:
            yield {"status": "error", "model": model, "error": str(exc)}
            return

    yield {"status": "completed"}
