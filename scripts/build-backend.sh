#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/../backend"

if [[ "$(uname -s)" == "Darwin" ]]; then
  DEFAULT_TRIPLE="$(rustc -vV | sed -n 's/^host: //p')"
else
  DEFAULT_TRIPLE="x86_64-unknown-linux-gnu"
fi

TRIPLE="${BACKEND_TARGET_TRIPLE:-$DEFAULT_TRIPLE}"

python3 -m venv .venv
# shellcheck disable=SC1091
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
pip install pyinstaller

SIDEcar_ROOT="$(cd .. && pwd)/src-tauri/sidecar"
DEST_DIR="$(cd .. && pwd)/src-tauri/binaries"

pyinstaller build_backend.spec --clean --noconfirm --distpath "$SIDEcar_ROOT" --workpath ./build/pyinstaller

SOURCE_EXE="$SIDEcar_ROOT/nxtrive-backend"
DEST_EXE="$DEST_DIR/nxtrive-backend-$TRIPLE"

if [[ ! -f "$SOURCE_EXE" ]]; then
  echo "Expected backend executable at $SOURCE_EXE" >&2
  exit 1
fi

mkdir -p "$DEST_DIR"
cp "$SOURCE_EXE" "$DEST_EXE"

echo "Backend built for $TRIPLE"
echo "  Entrypoint: $DEST_EXE"
