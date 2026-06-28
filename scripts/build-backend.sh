#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/../backend"

python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
pip install pyinstaller

SIDEcar_ROOT="$(cd .. && pwd)/src-tauri/sidecar"
DIST_FOLDER="$SIDEcar_ROOT/nxtrive-backend"
DEST_DIR="$(cd .. && pwd)/src-tauri/binaries"

pyinstaller build_backend.spec --clean --noconfirm --distpath "$SIDEcar_ROOT" --workpath ./build/pyinstaller

if [[ "$(uname -s)" == "Darwin" ]]; then
  TRIPLE="$(rustc -vV | sed -n 's/^host: //p')"
  SOURCE_EXE="$DIST_FOLDER/nxtrive-backend"
  DEST_EXE="$DEST_DIR/nxtrive-backend-$TRIPLE"
else
  TRIPLE="x86_64-unknown-linux-gnu"
  SOURCE_EXE="$DIST_FOLDER/nxtrive-backend"
  DEST_EXE="$DEST_DIR/nxtrive-backend-$TRIPLE"
fi

SOURCE_INTERNAL="$DIST_FOLDER/_internal"
DEST_INTERNAL="$DEST_DIR/_internal"

mkdir -p "$DEST_DIR"
rm -rf "$DEST_INTERNAL"
cp -R "$SOURCE_INTERNAL" "$DEST_INTERNAL"
cp "$SOURCE_EXE" "$DEST_EXE"

echo "✅ Backend built → $DEST_DIR"
echo "   Entrypoint: $DEST_EXE"
