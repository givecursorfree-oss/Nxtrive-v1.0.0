#!/usr/bin/env bash
# Patch Tauri's cached linuxdeploy AppImage: remove bundled strip so the host
# binutils strip is used (fixes .relr.dyn / "failed to run linuxdeploy" on CI).
set -euo pipefail

CACHE_DIR="${HOME}/.cache/tauri"
DEPLOY="${CACHE_DIR}/linuxdeploy-x86_64.AppImage"
URL="https://github.com/linuxdeploy/linuxdeploy/releases/download/continuous/linuxdeploy-x86_64.AppImage"

mkdir -p "$CACHE_DIR"

if [ ! -f "$DEPLOY" ]; then
  wget -q -O "$DEPLOY" "$URL"
  chmod +x "$DEPLOY"
fi

WORKDIR=$(mktemp -d)
trap 'rm -rf "$WORKDIR"' EXIT
cd "$WORKDIR"

export APPIMAGE_EXTRACT_AND_RUN=1
cp "$DEPLOY" ./linuxdeploy.AppImage
chmod +x ./linuxdeploy.AppImage
./linuxdeploy.AppImage --appimage-extract

if [ ! -f squashfs-root/usr/bin/strip ]; then
  echo "linuxdeploy: bundled strip already absent"
  exit 0
fi

rm squashfs-root/usr/bin/strip
APPIMAGETOOL="squashfs-root/plugins/linuxdeploy-plugin-appimage/appimagetool-prefix/usr/bin/appimagetool"
chmod +x "$APPIMAGETOOL"
"$APPIMAGETOOL" -gn squashfs-root

PATCHED=$(ls -1 *.AppImage | head -1)
mv "$PATCHED" "$DEPLOY"
chmod +x "$DEPLOY"
echo "Patched linuxdeploy at $DEPLOY"
