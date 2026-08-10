#!/usr/bin/env python3
"""Import Restaurant/* photos into catalog webps + catalog.json.

Usage:
  python3 backend/scripts/import-restaurant-images.py
"""
from __future__ import annotations

import json
import re
import shutil
from collections import Counter
from pathlib import Path

from PIL import Image

Image.MAX_IMAGE_PIXELS = None

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "Restaurant"
BACKEND_IMG = ROOT / "backend/data/images/restaurant"
FRONTEND_IMG = ROOT / "frontend/public/images/restaurant"
CATALOG_PATH = ROOT / "backend/data/catalog.json"
MANIFEST_PATH = ROOT / "backend/data/restaurant-import-manifest.json"

SECTION_DIRS = ("hero", "about", "menu", "gallery")


def slugify(text: str) -> str:
    """Normalize a label into a catalog tag slug."""
    text = text.lower().replace("&", " and ")
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


def extract_tags(rel: Path) -> list[str]:
    """Derive cuisine tags from a Restaurant/ relative path."""
    parts = list(rel.parts[:-1]) + [re.sub(r"\s*\d+\s*$", "", rel.stem)]
    tags = ["food", "restaurant"]
    aliases = {
        "mughalai": "mughlai",
        "greece": "greek",
        "speciality-cuisine": "specialty",
        "multi-cuisine-food": "multi-cuisine",
        "american-casual": "american",
        "modern-indian": "indian",
        "indian-fusion": "indian",
        "north-indian": "indian",
        "south-indian": "indian",
        "regional": "indian",
        "modern-european": "european",
    }
    seen: set[str] = set()
    out: list[str] = []
    for part in parts:
        s = slugify(part)
        if not s or s in {"untitled-folder", "restaurant"}:
            continue
        candidates = [s]
        if "indian" in s and s != "indian":
            candidates.append("indian")
        if s.startswith("multi-cuisine"):
            candidates.append("multi-cuisine")
        if "health-focused" in s:
            candidates.append("healthy")
        for raw in candidates:
            t = aliases.get(raw, raw)
            t = re.sub(r"-\d+$", "", t)
            if t and t not in seen:
                seen.add(t)
                out.append(t)
    return out


def orientation_of(w: int, h: int) -> str:
    """Classify image orientation from pixel dimensions."""
    ratio = w / h
    if 0.9 <= ratio <= 1.1:
        return "square"
    if ratio < 0.9:
        return "portrait"
    return "landscape"


def next_index(section: str) -> int:
    """Return the next unused numeric suffix for a section folder."""
    nums = []
    for p in (BACKEND_IMG / section).glob(f"{section}-*.webp"):
        m = re.search(rf"{section}-(\d+)\.webp$", p.name)
        if m:
            nums.append(int(m.group(1)))
    return (max(nums) if nums else 0) + 1


def fit_and_save(im: Image.Image, out: Path, section: str) -> None:
    """Resize/crop and write a webp optimized for the section type."""
    im = im.convert("RGB")
    w, h = im.size
    if section == "menu":
        side = min(w, h)
        left = (w - side) // 2
        top = (h - side) // 2
        im = im.crop((left, top, left + side, top + side))
        max_side = 1200
    elif section == "hero":
        max_side = 1920
    else:
        max_side = 1600

    w, h = im.size
    scale = min(1.0, max_side / max(w, h))
    if scale < 1.0:
        im = im.resize(
            (max(1, int(w * scale)), max(1, int(h * scale))),
            Image.Resampling.LANCZOS,
        )
    out.parent.mkdir(parents=True, exist_ok=True)
    im.save(out, "WEBP", quality=82, method=6)


def assign_section(orientation: str, counts: dict[str, int]) -> str:
    """Balance new imports across section pools by orientation."""
    if orientation == "square":
        return "menu"
    if orientation == "portrait":
        if counts["about"] < counts["gallery"] + 4:
            return "about"
        return "gallery"
    if counts["hero"] <= counts["gallery"]:
        return "hero"
    return "gallery"


def sync_frontend_mirror() -> int:
    """Copy every backend restaurant webp into frontend/public."""
    copied = 0
    for p in BACKEND_IMG.rglob("*.webp"):
        out = FRONTEND_IMG / p.relative_to(BACKEND_IMG)
        out.parent.mkdir(parents=True, exist_ok=True)
        if not out.exists() or out.stat().st_size != p.stat().st_size:
            shutil.copy2(p, out)
            copied += 1
    return copied


def main() -> None:
    """Import Restaurant sources, append catalog entries, mirror to frontend."""
    for section in SECTION_DIRS:
        (BACKEND_IMG / section).mkdir(parents=True, exist_ok=True)
        (FRONTEND_IMG / section).mkdir(parents=True, exist_ok=True)

    sources = sorted(
        [
            p
            for p in SRC.rglob("*")
            if p.is_file() and p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}
        ],
        key=lambda p: str(p).lower(),
    )
    catalog = json.loads(CATALOG_PATH.read_text())
    existing_ids = {e["id"] for e in catalog["images"]}
    already: set[str] = set()
    prior_manifest: list[dict] = []
    if MANIFEST_PATH.exists():
        prior = json.loads(MANIFEST_PATH.read_text())
        prior_manifest = list(prior.get("imported") or [])
        already = {str(item.get("source")) for item in prior_manifest}

    new_counts = {"hero": 0, "about": 0, "menu": 0, "gallery": 0}
    next_idx = {s: next_index(s) for s in SECTION_DIRS}
    new_entries = []
    manifest = list(prior_manifest)

    print(f"Found {len(sources)} source images ({len(already)} already imported)")
    print("Next indices:", next_idx)

    for src in sources:
        rel = src.relative_to(SRC)
        if str(rel) in already:
            continue
        try:
            with Image.open(src) as im:
                im.load()
                orient = orientation_of(*im.size)
                section = assign_section(orient, new_counts)
                idx = next_idx[section]
                next_idx[section] = idx + 1
                new_counts[section] += 1
                filename = f"{section}-{idx:02d}.webp"
                dest = BACKEND_IMG / section / filename
                fit_and_save(im, dest, section)
                (FRONTEND_IMG / section / filename).write_bytes(dest.read_bytes())

                with Image.open(dest) as out_im:
                    final_orient = orientation_of(*out_im.size)
                if section == "menu":
                    final_orient = "square"

                tags_base = extract_tags(rel)
                if section not in tags_base:
                    tags_base.append(section)
                public_path = f"/images/restaurant/{section}/{filename}"

                for family in ("premium", "elegant"):
                    entry_id = f"{family}-{section}-{idx:02d}"
                    if entry_id in existing_ids:
                        continue
                    tags = [*tags_base]
                    if family not in tags:
                        tags.append(family)
                    new_entries.append(
                        {
                            "id": entry_id,
                            "path": public_path,
                            "tags": tags,
                            "orientation": final_orient,
                            "section_type": section,
                            "family": family,
                        }
                    )

                manifest.append(
                    {
                        "source": str(rel),
                        "path": public_path,
                        "section": section,
                        "orientation": final_orient,
                        "tags": tags_base,
                    }
                )
                print(f"OK {rel} -> {public_path} ({final_orient})")
        except Exception as exc:  # noqa: BLE001 — keep importing remaining files
            print(f"FAIL {rel}: {exc}")

    catalog["images"].extend(new_entries)
    CATALOG_PATH.write_text(json.dumps(catalog, indent=2) + "\n")
    MANIFEST_PATH.write_text(
        json.dumps({"imported": manifest, "new_counts": new_counts}, indent=2) + "\n"
    )
    mirrored = sync_frontend_mirror()
    print("---")
    print("New counts:", new_counts)
    print("Catalog entries:", len(catalog["images"]))
    print("Section unique paths:", Counter(e["section_type"] for e in catalog["images"]))
    print("Frontend mirrored files:", mirrored)


if __name__ == "__main__":
    main()
