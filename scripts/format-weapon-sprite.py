"""Crop, de-white, and scale weapon PNGs to the game's 160px-tall sprite format."""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

WEAPONS_DIR = Path(__file__).resolve().parents[1] / "newsprites" / "weapons"
TARGET_HEIGHT = 160
LEFT_MARGIN = 1
BOTTOM_MARGIN = 1
MAX_CONTENT = TARGET_HEIGHT - BOTTOM_MARGIN - 1
WHITE_TOLERANCE = 12


def remove_white_background(image: Image.Image) -> Image.Image:
    result = image.convert("RGBA").copy()
    pixels = result.load()
    width, height = result.size
    threshold = 255 - WHITE_TOLERANCE
    stack: list[tuple[int, int]] = []

    for x in range(width):
        stack.append((x, 0))
        stack.append((x, height - 1))

    for y in range(height):
        stack.append((0, y))
        stack.append((width - 1, y))

    visited: set[tuple[int, int]] = set()

    while stack:
        x, y = stack.pop()

        if (x, y) in visited or x < 0 or y < 0 or x >= width or y >= height:
            continue

        red, green, blue, alpha = pixels[x, y]

        if alpha == 0 or red < threshold or green < threshold or blue < threshold:
            continue

        visited.add((x, y))
        pixels[x, y] = (red, green, blue, 0)
        stack.extend([(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)])

    return result


def format_weapon_sprite(path: Path) -> tuple[int, int]:
    image = remove_white_background(Image.open(path))
    bounds = image.getbbox()

    if not bounds:
        raise ValueError(f"No visible pixels in {path}")

    cropped = image.crop(bounds)
    crop_w, crop_h = cropped.size
    scale = min(MAX_CONTENT / crop_w, MAX_CONTENT / crop_h)
    scaled_w = max(1, round(crop_w * scale))
    scaled_h = max(1, round(crop_h * scale))
    scaled = cropped.resize((scaled_w, scaled_h), Image.Resampling.NEAREST)

    canvas_w = scaled_w + LEFT_MARGIN
    canvas_h = TARGET_HEIGHT
    canvas = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    paste_x = LEFT_MARGIN
    paste_y = canvas_h - BOTTOM_MARGIN - scaled_h
    canvas.paste(scaled, (paste_x, paste_y), scaled)
    canvas.save(path, optimize=True)

    return canvas.size


def needs_background_strip(path: Path) -> bool:
    image = Image.open(path).convert("RGBA")
    whiteish = 0
    opaque = 0

    for red, green, blue, alpha in image.getdata():
        if alpha == 0:
            continue

        opaque += 1

        if red > 230 and green > 230 and blue > 230:
            whiteish += 1

    return opaque > 0 and whiteish / opaque > 0.35


def main() -> None:
    force = "--force" in sys.argv
    args = [arg for arg in sys.argv[1:] if arg != "--force"]
    targets = [Path(arg) for arg in args] if args else sorted(WEAPONS_DIR.glob("*.png"))

    for path in targets:
        if not path.exists():
            print(f"skip missing {path}")
            continue

        width, height = Image.open(path).size
        should_format = force or width > 220 or height > 220 or needs_background_strip(path)

        if not should_format:
            print(f"skip {path.name} ({width}x{height})")
            continue

        out_size = format_weapon_sprite(path)
        print(f"formatted {path.name} -> {out_size[0]}x{out_size[1]}")


if __name__ == "__main__":
    main()
