# -*- mode: python ; coding: utf-8 -*-
"""
Onefile sidecar for Tauri.

IMPORTANT: never enable `strip` on Windows — it corrupts bundled DLLs and causes:
  Failed to load Python DLL '...\\_MEI...\\python312.dll'
  LoadLibrary: Invalid access to memory location.
"""

import os
from pathlib import Path

from PyInstaller.utils.hooks import collect_all

block_cipher = None
backend_dir = Path(SPECPATH)
project_root = backend_dir.parent
sidecar_dir = project_root / "src-tauri" / "sidecar"

datas = []
binaries = []
hiddenimports = [
    "chromadb",
    "chromadb.api",
    "chromadb.config",
    "ollama",
    "pypdf",
    "docx",
    "chardet",
    "platformdirs",
    "fastapi",
    "uvicorn",
    "uvicorn.logging",
    "uvicorn.loops",
    "uvicorn.loops.auto",
    "uvicorn.protocols",
    "uvicorn.protocols.http",
    "uvicorn.protocols.http.auto",
    "uvicorn.protocols.websockets",
    "uvicorn.protocols.websockets.auto",
    "uvicorn.lifespan",
    "uvicorn.lifespan.on",
    "httpx",
    "pydantic",
    "starlette",
    "sqlite3",
]

for package in ("chromadb", "ollama", "pypdf", "docx", "chardet", "platformdirs"):
    pkg_datas, pkg_binaries, pkg_hidden = collect_all(package)
    datas += pkg_datas
    binaries += pkg_binaries
    hiddenimports += pkg_hidden

a = Analysis(
    [str(backend_dir / "main.py")],
    pathex=[str(backend_dir)],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

# Prefer a stable unpack dir over %TEMP% (AV scanners often break _MEI extracts).
# Must use env-var placeholders expanded at runtime — never bake the build-machine path.
if os.name == "nt":
    _runtime_tmpdir = r"%LOCALAPPDATA%\Nxtrive\pyi-runtime"
else:
    _runtime_tmpdir = "$HOME/.cache/Nxtrive/pyi-runtime"

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name="nxtrive-backend",
    debug=False,
    bootloader_ignore_signals=False,
    # strip=True on Windows breaks python3xx.dll LoadLibrary — keep False everywhere.
    strip=False,
    upx=False,
    upx_exclude=[],
    runtime_tmpdir=_runtime_tmpdir,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

distpath = str(sidecar_dir)
