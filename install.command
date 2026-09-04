#!/bin/bash
#
# Puts sndwrks-osc where Live can see it — 2026-09-04T00:00:00Z
#
# Copies the device and the four scripts it resolves through Max's search path
# into Live's User Library. Double-click it in Finder, or run it from a shell.
#
#   ./install.command [--dest PATH] [--force] [--dry-run] [--help]
#
# Exit codes:  0 installed  ·  1 error  ·  2 declined

set -euo pipefail

# macOS ships bash 3.2, where `for x in "${arr[@]}"` on an EMPTY array is an
# unbound-variable error under `set -u`. Every loop below iterates an array that
# has already been proven non-empty; check ${#arr[@]} first if you add another.

# Finder launches a .command from the user's home, not from the folder it sits
# in, so everything below is resolved relative to the script itself.
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

DEFAULT_DEST="$HOME/Music/Ableton/User Library/Presets/MIDI Effects/Max MIDI Effect"
NODE_MAJOR_MIN=20

# The device is not frozen, so every one of these must sit beside it on Max's
# search path or the objects load with the wrong outlet count and silently drop
# their cords. See "Gotchas worth keeping" in the README.
PAYLOAD=(
  sndwrks-osc.amxd
  sndwrksMap.js
  sndwrksGrid.js
  sndwrksLogo.js
  sndwrksTcp.js
  package.json
)

dest=""
force=0
dry_run=0

bold=""; dim=""; red=""; yellow=""; green=""; reset=""
if [ -t 1 ]; then
  bold=$'\033[1m'; dim=$'\033[2m'; red=$'\033[31m'
  yellow=$'\033[33m'; green=$'\033[32m'; reset=$'\033[0m'
fi

say  () { printf '%s\n' "$*"; }
step () { printf '\n%s\n' "${bold}$*${reset}"; }
ok   () { printf '  %s✓%s %s\n' "$green" "$reset" "$*"; }
warn () { printf '  %s!%s %s\n' "$yellow" "$reset" "$*"; }
err  () { printf '  %sx%s %s\n' "$red" "$reset" "$*" >&2; }
note () { printf '    %s%s%s\n' "$dim" "$*" "$reset"; }

usage () {
  cat <<EOF
${bold}install.command${reset} — install sndwrks-osc into Ableton Live's User Library

Usage:
  ./install.command [options]

Options:
  --dest PATH   Install here instead of the default User Library location.
  --force, -f   Replace existing files without asking.
  --dry-run     Report what would happen; copy nothing.
  --help, -h    Show this.

Default destination:
  $DEFAULT_DEST

Environment:
  SNDWRKS_INSTALL_DIR   Destination, unless --dest is given.
  SNDWRKS_MAX_APP       Path to Max.app, if it isn't in the usual place.
EOF
}

# ── arguments ────────────────────────────────────────────────────────────────

while [ $# -gt 0 ]; do
  case "$1" in
    --dest)
      [ $# -ge 2 ] || { err "--dest needs a path"; exit 1; }
      dest="$2"; shift 2 ;;
    --dest=*)  dest="${1#--dest=}"; shift ;;
    --force|-f) force=1; shift ;;
    --dry-run)  dry_run=1; shift ;;
    --help|-h)  usage; exit 0 ;;
    *) err "unknown option: $1"; say; usage; exit 1 ;;
  esac
done

say
say "${bold}sndwrks-osc installer${reset}"
say

# ── 1. platform ──────────────────────────────────────────────────────────────

if [ "$(uname -s)" != "Darwin" ]; then
  err "This installer is macOS only — Ableton Live's User Library lives at a"
  err "macOS path and the device is a Max for Live device."
  exit 1
fi

# ── 2. Max, and the Node it carries ──────────────────────────────────────────
#
# [node.script] runs sndwrksTcp.js on the Node runtime bundled inside Max, never
# on system Node. So the version that matters is Max's, and a user with no Node
# installed at all is fine.

step "Checking Max for Live"

max_app=""
if [ -n "${SNDWRKS_MAX_APP:-}" ]; then
  max_app="$SNDWRKS_MAX_APP"
else
  # Newest Live first; the glob sorts lexically, which puts "Live 12" after "Live 11".
  for candidate in /Applications/Ableton\ Live*.app/Contents/App-Resources/Max/Max.app; do
    [ -d "$candidate" ] && max_app="$candidate"
  done
  [ -n "$max_app" ] || { [ -d /Applications/Max.app ] && max_app=/Applications/Max.app; }
fi

n4m_ok=0
if [ -z "$max_app" ]; then
  warn "No Ableton Live or Max found in /Applications."
  note "The files will still install; Live just won't be able to load them yet."
else
  n4m_node="$max_app/Contents/Resources/C74/packages/Node for Max/source/bin/osx/node/node"
  if [ ! -x "$n4m_node" ]; then
    warn "Found Max at $max_app, but no Node for Max runtime inside it."
    note "sndwrksTcp.js needs [node.script]; the UDP transport will still work."
  else
    node_version="$("$n4m_node" -v 2>/dev/null || true)"
    node_major="${node_version#v}"; node_major="${node_major%%.*}"
    if [ -n "$node_major" ] && [ "$node_major" -ge "$NODE_MAJOR_MIN" ] 2>/dev/null; then
      ok "Node for Max $node_version (needs >= $NODE_MAJOR_MIN)"
      n4m_ok=1
    else
      warn "Node for Max reports ${node_version:-an unreadable version}; this needs >= $NODE_MAJOR_MIN."
      note "The TCP transport may not run. UDP does not use Node at all."
    fi
  fi
fi

if [ "$n4m_ok" -eq 1 ]; then
  ok "Max for Live at $max_app"
fi

# ── 3. destination ───────────────────────────────────────────────────────────

step "Destination"

[ -n "$dest" ] || dest="${SNDWRKS_INSTALL_DIR:-$DEFAULT_DEST}"

say "  $dest"

created_dest=0
if [ ! -d "$dest" ]; then
  if [ "$dry_run" -eq 1 ]; then
    note "would create this directory"
  else
    mkdir -p "$dest" || { err "Could not create $dest"; exit 1; }
    created_dest=1
    warn "Created that directory — it did not exist."
    note "If Live has run before, its User Library may have been moved. Pass"
    note "--dest to install where Live is actually looking."
  fi
fi

# ── 4. payload ───────────────────────────────────────────────────────────────

step "Files to install"

missing=()
for f in "${PAYLOAD[@]}"; do
  [ -f "$SCRIPT_DIR/$f" ] || missing+=("$f")
done

if [ "${#missing[@]}" -gt 0 ]; then
  err "Missing from $SCRIPT_DIR:"
  for f in "${missing[@]}"; do err "  $f"; done
  say
  err "Nothing was copied. Unzip the release archive and run install.command"
  err "from inside the folder it creates, without moving files out of it."
  exit 1
fi

existing=()
for f in "${PAYLOAD[@]}"; do
  if [ -e "$dest/$f" ]; then
    existing+=("$f")
    say "  $f ${dim}(replaces existing)${reset}"
  else
    say "  $f"
  fi
done

# ── 5. confirm ───────────────────────────────────────────────────────────────

if [ "$dry_run" -eq 1 ]; then
  say
  ok "Dry run — nothing was copied."
  exit 0
fi

if [ "${#existing[@]}" -gt 0 ] && [ "$force" -eq 0 ]; then
  say
  if [ ! -t 0 ]; then
    err "${#existing[@]} file(s) already exist at the destination, and there is no"
    err "terminal to ask on. Re-run with --force to replace them."
    exit 2
  fi
  printf '%sReplace %d existing file(s)?%s [y/N] ' "$bold" "${#existing[@]}" "$reset"
  read -r reply
  case "$reply" in
    [yY]|[yY][eE][sS]) ;;
    *) say; say "Cancelled. Nothing was copied."; exit 2 ;;
  esac
fi

# ── 6. copy ──────────────────────────────────────────────────────────────────

step "Installing"

for f in "${PAYLOAD[@]}"; do
  cp "$SCRIPT_DIR/$f" "$dest/$f" || { err "Failed to copy $f"; exit 1; }
done

# Anything unzipped from a download carries com.apple.quarantine. Max reads these
# as plain files rather than opening them, so it mostly survives — but strip it
# anyway rather than leave a Gatekeeper prompt lying in wait.
if command -v xattr >/dev/null 2>&1; then
  for f in "${PAYLOAD[@]}"; do
    xattr -d com.apple.quarantine "$dest/$f" >/dev/null 2>&1 || true
  done
fi

ok "Copied ${#PAYLOAD[@]} files."

# ── 7. what next ─────────────────────────────────────────────────────────────

step "Next"
say "  1. Restart Ableton Live if it is already running."
say "  2. In Live's browser: User Library → Presets → MIDI Effects → Max MIDI Effect"
say "  3. Drag ${bold}sndwrks-osc${reset} onto a MIDI track."
say "  4. Type your sndwrks local server's IP into ${bold}SERVER${reset}."
say
if [ "$created_dest" -eq 1 ]; then
  say "  ${dim}Live's browser only shows the User Library it is configured to use.${reset}"
  say "  ${dim}Check Preferences → Library if the device does not appear.${reset}"
  say
fi

# A double-clicked .command closes its Terminal window the moment it exits.
if [ -t 0 ] && [ -t 1 ]; then
  printf '%sPress return to close.%s ' "$dim" "$reset"
  read -r _ || true
  say
fi
