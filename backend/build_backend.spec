# -*- mode: python ; coding: utf-8 -*-

import platform
import sys
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

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="nxtrive-backend",
    debug=False,
    bootloader_ignore_signals=False,
    strip=platform.system() in {"Windows", "Linux"},
    upx=False,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=platform.system() in {"Windows", "Linux"},
    upx=False,
    upx_exclude=[],
    name="nxtrive-backend",
)

distpath = str(sidecar_dir)
