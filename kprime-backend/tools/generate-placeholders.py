"""Generate the placeholder product images.

    python tools/generate-placeholders.py

Reads `static/catalogue.json` (written by `src/scripts/export-catalogue.ts`) and
writes PNGs into `static/placeholder/`, which `add-placeholder-images.ts` then
attaches to the products.

WHY THESE IMAGES LOOK LIKE THIS
-------------------------------
Image 1 of every product prints that product's own filterable attributes. Tick
`Colour -> Black` in the sidebar and every card still on screen must say
`Colour  Black`; if one does not, the filter is broken and you can see it
without opening a single product. The old placeholders said "1/5" and
"portrait 900x1200", which told you nothing about whether filtering worked.

Aspect ratios stay deliberately mixed. A uniform set would hide the one bug the
gallery has to survive — a source image that is not the display ratio must
composite without distortion — and the circle drawn on each image is what makes
stretching visible at a glance.

DEMO DATA. Delete `static/placeholder/` and this script when real photography
lands (task 10).
"""

from __future__ import annotations

import json
import pathlib
import sys

from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
CATALOGUE = ROOT / "static" / "catalogue.json"
OUT = ROOT / "static" / "placeholder"

# Matches MAX_PRODUCT_IMAGES in the storefront's products.ts.
MAX_IMAGES = 5

# (label, width, height). The first is the card thumbnail: the grid renders
# aspect-[3/4], so the detail image is drawn at that ratio and never cropped.
RATIOS = [
    ("3:4", 900, 1200),
    ("4:3", 1200, 900),
    ("1:1", 1000, 1000),
    ("16:9", 1280, 720),
    ("9:16", 720, 1280),
]

# Tinted per top-level category, so a product that has escaped into the wrong
# category is obvious while scanning a grid.
TINTS = {
    "Electronics": (214, 231, 245),
    "Cosmetics": (247, 223, 236),
    "Kitchenware": (223, 242, 226),
    "Home & Bedding": (243, 235, 219),
    "Sports & Outdoors": (222, 240, 240),
    "Toys & Games": (245, 232, 213),
    "Stationery": (232, 230, 243),
    "Health & Wellness": (226, 244, 233),
}


INK = (15, 30, 61)        # brand navy
MUTED = (107, 114, 128)   # muted
RULE = (196, 201, 210)


def font(size: int, bold: bool = False):
    """DejaVu ships with Pillow; fall back to the bitmap default if absent."""
    name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    try:
        return ImageFont.truetype(name, size)
    except OSError:
        try:
            return ImageFont.truetype(
                "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
                size,
            )
        except OSError:
            return ImageFont.load_default()


def wrap(draw, text, fnt, max_width):
    words, lines, line = text.split(), [], ""
    for word in words:
        trial = f"{line} {word}".strip()
        if draw.textlength(trial, font=fnt) <= max_width or not line:
            line = trial
        else:
            lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def draw_image(product, index, total, ratio):
    label, width, height = ratio
    # Comes from the catalogue export, so a new leaf cannot miss its tint.
    parent = product.get("topCategory") or product["category"]
    bg = TINTS.get(parent, (235, 235, 235))

    img = Image.new("RGB", (width, height), bg)
    d = ImageDraw.Draw(img)

    # The distortion check: a true circle, so any non-uniform scaling shows.
    r = min(width, height) * 0.30
    cx, cy = width / 2, height / 2
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(255, 255, 255), width=6)

    pad = int(width * 0.06)
    scale = width / 900.0
    y = pad

    if index == 0:
        # ---- the attribute block: what makes filtering checkable by eye ----
        f_key = font(int(30 * scale), bold=True)
        f_val = font(int(30 * scale))

        for option in product["options"]:
            d.text((pad, y), option["title"], font=f_key, fill=MUTED)
            d.text(
                (pad + int(230 * scale), y),
                ", ".join(option["values"]),
                font=f_val,
                fill=INK,
            )
            y += int(42 * scale)

        if not product["options"]:
            d.text((pad, y), "no filterable options", font=f_val, fill=MUTED)
            y += int(42 * scale)

        y += int(10 * scale)
        d.line([(pad, y), (width - pad, y)], fill=RULE, width=2)
        y += int(24 * scale)

        f_title = font(int(40 * scale), bold=True)
        for line in wrap(d, product["title"], f_title, width - 2 * pad):
            d.text((pad, y), line, font=f_title, fill=INK)
            y += int(48 * scale)

        y += int(6 * scale)
        f_meta = font(int(28 * scale))
        d.text((pad, y), product["category"], font=f_meta, fill=MUTED)
        y += int(40 * scale)
        d.text(
            (pad, y),
            f"Rs {product['price']:,}   {product['averageRating']} stars",
            font=f_meta,
            fill=INK,
        )
    else:
        # Gallery images 2+ only need to be visibly a different frame.
        f_title = font(int(40 * scale), bold=True)
        for line in wrap(d, product["title"], f_title, width - 2 * pad):
            d.text((pad, y), line, font=f_title, fill=INK)
            y += int(48 * scale)

    # Ratio marker, kept from the previous generator for gallery testing.
    f_small = font(int(26 * scale))
    marker = f"[{index + 1}/{total}]  {label}  {width}x{height}"
    d.text(
        (pad, height - pad - int(26 * scale)),
        marker,
        font=f_small,
        fill=MUTED,
    )

    return img


def main() -> int:
    if not CATALOGUE.exists():
        print(f"Missing {CATALOGUE}.", file=sys.stderr)
        print("Run: npx medusa exec ./src/scripts/export-catalogue.ts", file=sys.stderr)
        return 1

    data = json.loads(CATALOGUE.read_text(encoding="utf-8"))
    products = data["products"]

    OUT.mkdir(parents=True, exist_ok=True)

    # Stale files from a previous catalogue would be attached to nothing, but
    # they would also make `filesFor()` in add-placeholder-images.ts pick up a
    # count that no longer matches.
    removed = 0
    for old in OUT.glob("*.png"):
        old.unlink()
        removed += 1

    written = 0
    for n, product in enumerate(products):
        # 1-3 images, cycling, so most products exercise the gallery and some
        # exercise the single-image case.
        total = 1 + (n % 3)
        for i in range(total):
            ratio = RATIOS[0] if i == 0 else RATIOS[(n + i) % len(RATIOS)]
            img = draw_image(product, i, total, ratio)
            img.save(OUT / f"{product['handle']}-{i + 1}.png", optimize=True)
            written += 1

    print(f"Removed {removed} old images, wrote {written} for {len(products)} products.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
