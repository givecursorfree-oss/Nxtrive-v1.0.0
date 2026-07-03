$ErrorActionPreference = "Stop"

$backendDir = Join-Path $PSScriptRoot "..\backend"
$sidecarRoot = Join-Path $PSScriptRoot "..\src-tauri\sidecar"
$destDir = Join-Path $PSScriptRoot "..\src-tauri\binaries"
$triple = "x86_64-pc-windows-msvc"
$destExe = Join-Path $destDir "nxtrive-backend-$triple.exe"
$sourceExe = Join-Path $sidecarRoot "nxtrive-backend.exe"

Set-Location $backendDir

python -m venv .venv
& .\.venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r requirements.txt
pip install pyinstaller
pyinstaller build_backend.spec --clean --noconfirm --distpath $sidecarRoot --workpath .\build\pyinstaller

if (-not (Test-Path $sourceExe)) {
    throw "Expected backend executable at $sourceExe"
}

New-Item -ItemType Directory -Force -Path $destDir | Out-Null
Copy-Item -Force $sourceExe $destExe

Write-Host "Copied onefile sidecar -> $destExe"
