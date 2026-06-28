$ErrorActionPreference = "Stop"

$backendDir = Join-Path $PSScriptRoot "..\backend"
$sidecarRoot = Join-Path $PSScriptRoot "..\src-tauri\sidecar"
$distFolder = Join-Path $sidecarRoot "nxtrive-backend"
$destDir = Join-Path $PSScriptRoot "..\src-tauri\binaries"
$triple = "x86_64-pc-windows-msvc"
$destExe = Join-Path $destDir "nxtrive-backend-$triple.exe"
$sourceExe = Join-Path $distFolder "nxtrive-backend.exe"
$sourceInternal = Join-Path $distFolder "_internal"
$destInternal = Join-Path $destDir "_internal"

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

if (-not (Test-Path $sourceInternal)) {
    throw "Expected backend support folder at $sourceInternal"
}

New-Item -ItemType Directory -Force -Path $destDir | Out-Null

if (Test-Path $destInternal) {
    Remove-Item -Recurse -Force $destInternal
}

Copy-Item -Recurse -Force $sourceInternal $destInternal
Copy-Item -Force $sourceExe $destExe

Write-Host "Copied onedir sidecar -> $destDir"
Write-Host "Backend entrypoint -> $destExe"
Write-Host "Support files -> $destInternal"
