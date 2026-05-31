#!/bin/bash
# Double-click this file to rescan the image folders and preview the site.
# It rebuilds manifest.json, then opens (or refreshes) the local preview.

cd "$(dirname "$0")" || exit 1

echo "============================================"
echo "  Bernard Bortnick site — refresh"
echo "============================================"
echo
echo "Scanning image folders..."
python3 build_manifest.py
echo

if curl -s -o /dev/null http://localhost:8765/ ; then
  echo "Preview is already running. Opening it now —"
  echo "in the browser, press Cmd+R to see your latest images."
  open "http://localhost:8765/"
  echo
  echo "You can close this window."
else
  echo "Starting the local preview at http://localhost:8765"
  echo
  echo ">>> KEEP THIS WINDOW OPEN while you're looking at the site."
  echo ">>> Close it (or press Ctrl+C) when you're done."
  echo
  open "http://localhost:8765/"
  python3 -m http.server 8765
fi
