"""Generate Tauri icon assets from the Nxtrive logo mark."""

from __future__ import annotations

import struct
import zlib
from pathlib import Path

try:
    from PIL import Image
except ImportError:  # pragma: no cover
    Image = None  # type: ignore[assignment,misc]


def _png_chunk(chunk_type: bytes, data: bytes) -> bytes:
    crc = zlib.crc32(chunk_type + data) & 0xFFFFFFFF
    return struct.pack(">I", len(data)) + chunk_type + data + struct.pack(">I", crc)


def write_solid_png(path: Path, width: int, height: int, rgb: tuple[int, int, int]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    r, g, b = rgb
    row = bytes([0, r, g, b] * width)
    raw = row * height
    compressed = zlib.compress(raw, 9)

    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n"
    png += _png_chunk(b"IHDR", ihdr)
    png += _png_chunk(b"IDAT", compressed)
    png += _png_chunk(b"IEND", b"")
    path.write_bytes(png)


def write_resized_png(source: Path, dest: Path, size: int) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as img:
        img = img.convert("RGBA")
        img = img.resize((size, size), Image.Resampling.LANCZOS)
        img.save(dest, format="PNG")


def main() -> None:
    root = Path(__file__).resolve().parent.parent
    icons_dir = root / "src-tauri" / "icons"
    mark = root / "public" / "logos" / "nxtrive-mark.png"

    if Image is not None and mark.is_file():
        write_resized_png(mark, icons_dir / "32x32.png", 32)
        write_resized_png(mark, icons_dir / "128x128.png", 128)
        write_resized_png(mark, icons_dir / "128x128@2x.png", 256)
        write_resized_png(mark, icons_dir / "icon.png", 512)
        print(f"Icons generated from {mark}")
    else:
        color = (26, 54, 93)  # Nxtrive navy fallback
        write_solid_png(icons_dir / "32x32.png", 32, 32, color)
        write_solid_png(icons_dir / "128x128.png", 128, 128, color)
        write_solid_png(icons_dir / "128x128@2x.png", 256, 256, color)
        write_solid_png(icons_dir / "icon.png", 512, 512, color)
        print(f"Pillow unavailable or mark missing — wrote solid fallback icons to {icons_dir}")

    # Reuse PNG for ICO/ICNS placeholders; Tauri build can regenerate platform icons later.
    (icons_dir / "icon.ico").write_bytes((icons_dir / "128x128.png").read_bytes())
    (icons_dir / "icon.icns").write_bytes((icons_dir / "128x128.png").read_bytes())


if __name__ == "__main__":
    main()
