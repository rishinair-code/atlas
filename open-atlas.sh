#!/bin/bash
# Atlas — one-click launcher.
# Opens the Freebuff app pointed at the Atlas project folder, so its
# Projects home page shows an "atlas" tile you can click in the future.
# Keep a copy of this on your Desktop and double-click to start working.

ATLAS_DIR="/Users/rishinair/Projects/atlas"

# Keep the Freebuff project marker in place (hidden but load-bearing —
# without it the folder stops appearing as a Freebuff project).
mkdir -p "$ATLAS_DIR/.freebuff"
[ -f "$ATLAS_DIR/.freebuff/project-id" ] || printf 'atlas-local' > "$ATLAS_DIR/.freebuff/project-id"

# Optional: make sure the dev server is running (launchd job from the
# Freebuff run doc). Harmless if already running.
if ! curl -s -o /dev/null --max-time 2 http://localhost:3000/; then
  launchctl submit -l freebuff-atlas-preview -- /bin/sh -c \
    "cd $ATLAS_DIR && PATH=/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin exec npm run dev > $ATLAS_DIR/.freebuff/preview-server.log 2>&1"
fi

# Hand the folder to Freebuff. If the app is closed, this launches it on
# the Atlas folder; if it's already open, macOS brings it to front.
open -a Freebuff "$ATLAS_DIR"
