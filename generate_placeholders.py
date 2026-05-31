#!/usr/bin/env python3
"""Generate muted placeholder SVGs (2 per category) so each gallery looks
populated before Bernard's real painting files are dropped in.
Safe to delete this script and the placeholder files once real images exist."""

import os

ROOT = os.path.dirname(__file__)

# slug -> (display label used on placeholders, two-color gradient)
CATEGORIES = {
    "portraits":                   ("Portrait", ("#d6c8b8", "#8a6f5c")),
    "landscapes":                  ("Landscape", ("#c9c2b4", "#8a9a8f")),
    "age-of-outrage":              ("Age of Outrage", ("#d2b3a8", "#a05c50")),
    "figurative":                  ("Figure", ("#cbbfaf", "#7d7059")),
    "watercolors":                 ("Watercolor", ("#cdd6cf", "#8fa6b0")),
    "drawings-people-and-places":  ("Drawing", ("#e3ddd2", "#9a958b")),
    "drawings-political":          ("Political Drawing", ("#e6e1d8", "#6f6a61")),
}

# vary aspect ratios a little so the strip looks natural
SHAPES = [(1400, 1050), (1050, 1350)]

TEMPLATE = """<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="{c1}"/>
      <stop offset="100%" stop-color="{c2}"/>
    </linearGradient>
  </defs>
  <rect width="{w}" height="{h}" fill="url(#g)"/>
  <rect x="3%" y="3%" width="94%" height="94%" fill="none" stroke="#ffffff" stroke-opacity="0.25" stroke-width="{sw}"/>
  <text x="50%" y="50%" font-family="Georgia, serif" font-size="{fs}" fill="#ffffff" fill-opacity="0.7"
        text-anchor="middle" dominant-baseline="middle" font-style="italic">{label} {n}</text>
</svg>
"""

count = 0
for slug, (label, (c1, c2)) in CATEGORIES.items():
    folder = os.path.join(ROOT, "images", slug)
    os.makedirs(folder, exist_ok=True)
    for i, (w, h) in enumerate(SHAPES, start=1):
        svg = TEMPLATE.format(w=w, h=h, c1=c1, c2=c2, label=label, n=i,
                              fs=int(min(w, h) * 0.05), sw=int(min(w, h) * 0.004))
        with open(os.path.join(folder, f"placeholder-{i:02d}.svg"), "w") as f:
            f.write(svg)
        count += 1

print(f"Wrote {count} placeholder images across {len(CATEGORIES)} category folders.")
