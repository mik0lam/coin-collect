"""Build browser-safe impaler sprite frames from preview GIFs and source PNGs."""

from __future__ import annotations

import json
import re
import shutil
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "Impaler Boss"
OUT = ROOT / "src" / "assets" / "sprites" / "impaler"
MANIFEST_PATH = OUT / "manifest.json"
PAD = 6
MAX_PIXELS = 2_500_000


def natural_key(path: Path) -> int:
    match = re.search(r"(\d+)", path.stem)
    return int(match.group(1)) if match else 0


def crop_and_limit(image: Image.Image) -> Image.Image:
    frame = image.convert("RGBA")
    bounds = frame.getbbox()

    if bounds:
        x0 = max(0, bounds[0] - PAD)
        y0 = max(0, bounds[1] - PAD)
        x1 = min(frame.width, bounds[2] + 1 + PAD)
        y1 = min(frame.height, bounds[3] + 1 + PAD)
        frame = frame.crop((x0, y0, x1, y1))

    pixels = frame.width * frame.height

    if pixels > MAX_PIXELS:
        scale = (MAX_PIXELS / pixels) ** 0.5
        frame = frame.resize(
            (max(1, int(frame.width * scale)), max(1, int(frame.height * scale))),
            Image.Resampling.NEAREST,
        )

    return frame


def write_frames(frames: list[Image.Image], folder: str) -> int:
    target = OUT / folder

    if target.exists():
        shutil.rmtree(target)

    target.mkdir(parents=True)

    for index, frame in enumerate(frames, start=1):
        crop_and_limit(frame).save(target / f"f{index:03d}.png", optimize=True)

    return len(frames)


def extract_gif(path: Path) -> list[Image.Image]:
    gif = Image.open(path)
    count = getattr(gif, "n_frames", 1)
    frames: list[Image.Image] = []

    for index in range(count):
        gif.seek(index)
        frames.append(gif.convert("RGBA").copy())

    return frames


def load_png_sequence(folder: Path, pattern: str) -> list[Image.Image]:
    files = sorted(folder.glob(pattern), key=natural_key)
    return [Image.open(path) for path in files]


def main() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)

    OUT.mkdir(parents=True)
    manifest: dict[str, int] = {}

    preview = SOURCE / "preview"
    manifest["attack1"] = write_frames(extract_gif(preview / "attack1.gif"), "attack1")
    manifest["attack2"] = write_frames(extract_gif(preview / "attack2.gif"), "attack2")
    manifest["attack3"] = write_frames(extract_gif(preview / "attack3.gif"), "attack3")
    manifest["attack4"] = write_frames(extract_gif(preview / "attack4.gif"), "attack4")
    manifest["attack5"] = write_frames(extract_gif(preview / "attack5.gif"), "attack5")
    manifest["attack6"] = write_frames(load_png_sequence(SOURCE / "attack6", "atk*.png"), "attack6")
    manifest["counter"] = write_frames(extract_gif(preview / "counter.gif"), "counter")
    manifest["death"] = write_frames(extract_gif(preview / "death.gif"), "death")
    manifest["idle"] = write_frames(load_png_sequence(SOURCE / "idle", "idle*.png"), "idle")
    manifest["walk"] = write_frames(load_png_sequence(SOURCE / "walk", "walk*.png"), "walk")

    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2))
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
