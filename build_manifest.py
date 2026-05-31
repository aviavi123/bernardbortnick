#!/usr/bin/env python3
"""Scan images/<category>/ folders and write manifest.json, which the site reads
to build each gallery. Run this whenever you add or remove painting files:

    python3 build_manifest.py

Titles are guessed from filenames; they can be fixed later by double-clicking on
the page (Edit mode). Also prints a review report: counts, likely duplicates,
and filenames that produced odd titles.
"""

import os, re, json, hashlib
from collections import defaultdict

ROOT = os.path.dirname(__file__)
IMG = os.path.join(ROOT, "images")

# Category slugs in display order — must match CATEGORIES in js/main.js
CATEGORIES = [
    "portraits",
    "landscapes",
    "age-of-outrage",
    "figurative",
    "watercolors",
    "drawings-people-and-places",
    "drawings-political",
]

IMAGE_EXT = re.compile(r"\.(jpe?g|png|gif|webp|svg)$", re.I)

# Pin specific files to the FRONT of a category (exact filename, in this order).
# Everything else stays in alphabetical order behind them. The first pinned image
# becomes the opening image when that gallery loads.
PINNED = {
    "figurative": ["Risa Berline.jpg"],
}


def apply_pins(slug, files):
    pins = [f for f in PINNED.get(slug, []) if f in files]
    return pins + [f for f in files if f not in pins]


def clean_title(filename):
    base = filename
    # strip image extension(s) — handles "Free Enterprise.JPG.jpg"
    base = IMAGE_EXT.sub("", base)
    base = IMAGE_EXT.sub("", base)
    base = re.sub(r"_sm$", "", base, flags=re.I)
    # camera-style names -> Untitled
    if re.match(r"^_?MG_?\d+$", base, flags=re.I) or re.match(r"^DSC[_-]?\d+$", base, flags=re.I):
        return "Untitled"
    # drop dimension/medium notes: "24 X 30 Acryl on wd 5-10", "18X24, A-M 2015."
    base = re.sub(r"\d+\s*[xX]\s*\d+.*$", "", base)
    base = base.replace("_", " ")
    base = re.sub(r"\s+", " ", base).strip(" .,-")
    return base or "Untitled"


def list_images(folder):
    if not os.path.isdir(folder):
        return []
    files = []
    for name in os.listdir(folder):
        if name.startswith(".") or name.startswith("placeholder-"):
            continue
        if IMAGE_EXT.search(name):
            files.append(name)
    return sorted(files, key=str.lower)


manifest = {}
report = []
for slug in CATEGORIES:
    folder = os.path.join(IMG, slug)
    files = apply_pins(slug, list_images(folder))
    works = []
    sizes = defaultdict(list)
    titles = defaultdict(list)
    for name in files:
        rel = f"images/{slug}/{name}"
        title = clean_title(name)
        works.append({"src": rel, "title": title, "details": ""})
        sizes[os.path.getsize(os.path.join(folder, name))].append(name)
        titles[title].append(name)
    manifest[slug] = works

    if files:
        report.append(f"\n[{slug}] {len(files)} image(s)")
        dupes = {s: ns for s, ns in sizes.items() if len(ns) > 1}
        if dupes:
            report.append("  ⚠ Possible duplicate files (identical size):")
            for ns in dupes.values():
                report.append("     - " + "  ==  ".join(ns))
        tdupes = {t: ns for t, ns in titles.items() if len(ns) > 1}
        if tdupes:
            report.append("  • Repeated titles (will appear more than once):")
            for t, ns in tdupes.items():
                report.append(f"     - “{t}”: {', '.join(ns)}")
        odd = [n for n in files if clean_title(n) == "Untitled"]
        if odd:
            report.append("  • Got no usable title (shows as “Untitled”): " + ", ".join(odd))

with open(os.path.join(ROOT, "manifest.json"), "w") as f:
    json.dump(manifest, f, indent=2, ensure_ascii=False)

total = sum(len(v) for v in manifest.values())
print(f"Wrote manifest.json — {total} image(s) across {len(CATEGORIES)} categories.")
print("\n".join(report) if report else "(no populated categories yet)")
